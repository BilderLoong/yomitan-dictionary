#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["huggingface_hub==1.27.0"]
# ///

"""Download MWU.db from the public Hugging Face bucket and verify it.

The main checkout owns the real database file.
A git worktree never downloads. It links to the main checkout database.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from typing import TypedDict

SCRIPT_DIR = Path(__file__).resolve().parent
PACKAGE_ROOT = SCRIPT_DIR.parent
DEFAULT_MANIFEST_PATH = PACKAGE_ROOT / "assets" / "source-data-manifest.json"
BUCKET_URI_PREFIX = "hf://buckets/"
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
CHUNK_SIZE = 1 << 20

Downloader = Callable[[str, list[tuple[str, os.PathLike[str]]]], None]


class DatabaseArtifact(TypedDict):
    filename: str
    uri: str
    sha256: str


class SourceDataError(Exception):
    """A user-facing error that stops the command."""


def parse_arguments(arguments: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download MWU.db from the Hugging Face bucket and verify its SHA-256."
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace an existing database that has the wrong checksum.",
    )
    return parser.parse_args(arguments)


def load_database_artifact(path: Path = DEFAULT_MANIFEST_PATH) -> DatabaseArtifact:
    try:
        raw: object = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise SourceDataError(f"Cannot read the manifest: {path}\\n{error}") from error

    if not isinstance(raw, dict):
        raise SourceDataError(f"The manifest is not a JSON object: {path}")
    if raw.get("manifestVersion") != 1:
        raise SourceDataError(f"The manifest version is unsupported: {path}")
    artifacts = raw.get("artifacts")
    if not isinstance(artifacts, dict):
        raise SourceDataError(f"The manifest has no artifacts object: {path}")
    database = artifacts.get("database")
    if not isinstance(database, dict):
        raise SourceDataError(f"The manifest has no database artifact: {path}")

    filename = database.get("filename")
    uri = database.get("uri")
    checksum = database.get("sha256")
    if not isinstance(filename, str) or filename == "":
        raise SourceDataError(f"The manifest database has no filename: {path}")
    if not isinstance(uri, str) or not uri.startswith(BUCKET_URI_PREFIX):
        raise SourceDataError(f"The manifest database URI is not a bucket URI: {uri}")
    if not isinstance(checksum, str) or SHA256_PATTERN.fullmatch(checksum) is None:
        raise SourceDataError(f"The manifest database checksum is invalid: {checksum}")
    return DatabaseArtifact(filename=filename, uri=uri, sha256=checksum)


def sha256_hex(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(CHUNK_SIZE), b""):
            digest.update(block)
    return digest.hexdigest()


def parse_bucket_uri(uri: str) -> tuple[str, str]:
    relative = uri[len(BUCKET_URI_PREFIX) :]
    parts = relative.split("/")
    if len(parts) < 3:
        raise SourceDataError(f"The bucket URI has no file path: {uri}")
    return "/".join(parts[:2]), "/".join(parts[2:])


def download_database(
    artifact: DatabaseArtifact,
    destination: Path,
    downloader: Downloader | None = None,
) -> None:
    """Download to a temporary file, verify it, then replace the target."""
    if downloader is None:
        from huggingface_hub import download_bucket_files

        downloader = download_bucket_files
    bucket_id, remote_path = parse_bucket_uri(artifact["uri"])
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f"{destination.name}.tmp")
    try:
        try:
            downloader(bucket_id, [(remote_path, temporary)])
        except Exception as error:
            raise SourceDataError(f"Download failed: {error}") from error
        actual = sha256_hex(temporary)
        if actual != artifact["sha256"]:
            raise SourceDataError(
                "Downloaded data has the wrong checksum.\\n"
                f"Expected: {artifact['sha256']}\\n"
                f"Got: {actual}\\n"
                "Update the manifest if the source data changed."
            )
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def run_git(option: str, cwd: Path) -> Path:
    result = subprocess.run(
        ["git", "rev-parse", option],
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SourceDataError(
            f"git rev-parse {option} failed: {result.stderr.strip()}"
        )
    return Path(result.stdout.strip()).resolve()


def is_worktree(git_dir: Path, common_dir: Path) -> bool:
    return git_dir != common_dir


def detect_checkout(cwd: Path = PACKAGE_ROOT) -> tuple[bool, Path]:
    git_dir = run_git("--git-dir", cwd)
    common_dir = run_git("--git-common-dir", cwd)
    return is_worktree(git_dir, common_dir), common_dir.parent


def ensure_main_database(
    artifact: DatabaseArtifact,
    assets_dir: Path,
    *,
    replace: bool,
    downloader: Downloader | None = None,
) -> str:
    database_path = assets_dir / artifact["filename"]
    if not database_path.exists():
        download_database(artifact, database_path, downloader)
        return f"Downloaded {database_path}"
    if sha256_hex(database_path) == artifact["sha256"]:
        return f"Already up to date: {database_path}"
    if not replace:
        raise SourceDataError(
            f"Checksum mismatch: {database_path}\\n"
            "Run with --replace to download the matching database."
        )
    download_database(artifact, database_path, downloader)
    return f"Replaced {database_path}"


def link_worktree_database(
    artifact: DatabaseArtifact,
    main_database_path: Path,
    worktree_database_path: Path,
) -> str:
    if not main_database_path.exists():
        raise SourceDataError(
            f"The main checkout has no database: {main_database_path}\\n"
            "Run the download command in the main checkout first."
        )
    if sha256_hex(main_database_path) != artifact["sha256"]:
        raise SourceDataError(
            f"The main checkout database does not match this manifest: {main_database_path}\\n"
            "Refresh the main checkout database, then retry."
        )
    if (
        worktree_database_path.is_symlink()
        and worktree_database_path.resolve() == main_database_path.resolve()
    ):
        return f"Already linked: {worktree_database_path}"
    if worktree_database_path.exists() or worktree_database_path.is_symlink():
        raise SourceDataError(
            f"Worktree database already exists: {worktree_database_path}\\n"
            "It is preserved. Remove or inspect it manually, then retry."
        )
    worktree_database_path.parent.mkdir(parents=True, exist_ok=True)
    worktree_database_path.symlink_to(main_database_path)
    return f"Linked {worktree_database_path} -> {main_database_path}"


def main(arguments: list[str] | None = None) -> int:
    args = parse_arguments(arguments)
    try:
        artifact = load_database_artifact()
        is_worktree_checkout, main_root = detect_checkout()
        if is_worktree_checkout:
            if args.replace:
                raise SourceDataError("--replace only works in the main checkout.")
            main_assets = main_root / "packages" / "merriam_webster_unabridged" / "assets"
            message = link_worktree_database(
                artifact,
                main_assets / artifact["filename"],
                PACKAGE_ROOT / "assets" / artifact["filename"],
            )
        else:
            message = ensure_main_database(
                artifact,
                PACKAGE_ROOT / "assets",
                replace=args.replace,
            )
        print(message)
        return 0
    except SourceDataError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
