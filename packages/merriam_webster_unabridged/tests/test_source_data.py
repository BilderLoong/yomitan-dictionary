#!/usr/bin/env python3

"""Tests for scripts/download_source_data.py.

Run with: uv run tests/test_source_data.py
"""

from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import download_source_data as source_data


def sha256_hex(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def database_artifact(content: bytes) -> source_data.DatabaseArtifact:
    return {
        "filename": "MWU.db",
        "uri": "hf://buckets/Birudo/yomitan-dict-source-data/source/MWU.db",
        "sha256": sha256_hex(content),
    }


def fixed_downloader(payload: bytes) -> source_data.Downloader:
    """Return a downloader that writes a fixed payload."""

    def download(bucket_id: str, files: list[tuple[str, Path]]) -> None:
        _, destination = files[0]
        destination.write_bytes(payload)

    return download


def unexpected_downloader(
    bucket_id: str, files: list[tuple[str, Path]]
) -> None:
    """Fail when a test reaches a code path that must not download."""

    raise AssertionError("must not download")


def failing_downloader(bucket_id: str, files: list[tuple[str, Path]]) -> None:
    """Simulate a Hugging Face transport failure."""

    raise RuntimeError("network unavailable")


class ParseArgumentsTest(unittest.TestCase):
    def test_defaults(self) -> None:
        namespace = source_data.parse_arguments([])
        self.assertFalse(namespace.replace)

    def test_accepts_replace(self) -> None:
        namespace = source_data.parse_arguments(["--replace"])
        self.assertTrue(namespace.replace)


class LoadDatabaseArtifactTest(unittest.TestCase):
    def test_loads_valid_artifact(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.json"
            payload = {
                "manifestVersion": 1,
                "artifacts": {"database": database_artifact(b"data")},
            }
            path.write_text(json.dumps(payload), encoding="utf-8")
            artifact = source_data.load_database_artifact(path)
            self.assertEqual(artifact["filename"], "MWU.db")

    def test_rejects_invalid_checksum(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.json"
            artifact = {**database_artifact(b"data"), "sha256": "not-a-checksum"}
            path.write_text(
                json.dumps({"manifestVersion": 1, "artifacts": {"database": artifact}}),
                encoding="utf-8",
            )
            with self.assertRaises(source_data.SourceDataError):
                source_data.load_database_artifact(path)

    def test_rejects_non_bucket_uri(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.json"
            artifact = {**database_artifact(b"data"), "uri": "https://example.com/x"}
            path.write_text(
                json.dumps({"manifestVersion": 1, "artifacts": {"database": artifact}}),
                encoding="utf-8",
            )
            with self.assertRaises(source_data.SourceDataError):
                source_data.load_database_artifact(path)

    def test_rejects_unsupported_manifest_version(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.json"
            path.write_text(
                json.dumps(
                    {
                        "manifestVersion": 2,
                        "artifacts": {"database": database_artifact(b"data")},
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaises(source_data.SourceDataError):
                source_data.load_database_artifact(path)


class ParseBucketUriTest(unittest.TestCase):
    def test_splits_bucket_id_and_path(self) -> None:
        self.assertEqual(
            source_data.parse_bucket_uri(
                "hf://buckets/Birudo/yomitan-dict-source-data/source/MWU.db"
            ),
            ("Birudo/yomitan-dict-source-data", "source/MWU.db"),
        )


class IsWorktreeTest(unittest.TestCase):
    def test_distinct_git_dirs_mean_worktree(self) -> None:
        self.assertTrue(
            source_data.is_worktree(
                Path("/repo/.git/worktrees/feature"), Path("/repo/.git")
            )
        )
        self.assertFalse(source_data.is_worktree(Path("/repo/.git"), Path("/repo/.git")))


class EnsureMainDatabaseTest(unittest.TestCase):
    def setUp(self) -> None:
        self._temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self._temporary.cleanup)
        self.assets_dir = Path(self._temporary.name) / "assets"

    def test_downloads_when_missing(self) -> None:
        payload = b"database"
        artifact = database_artifact(payload)
        message = source_data.ensure_main_database(
            artifact,
            self.assets_dir,
            replace=False,
            downloader=fixed_downloader(payload),
        )
        self.assertEqual(message, f"Downloaded {self.assets_dir / 'MWU.db'}")
        self.assertEqual((self.assets_dir / "MWU.db").read_bytes(), payload)

    def test_noop_when_checksum_matches(self) -> None:
        payload = b"database"
        artifact = database_artifact(payload)
        database_path = self.assets_dir / "MWU.db"
        database_path.parent.mkdir(parents=True)
        database_path.write_bytes(payload)
        message = source_data.ensure_main_database(
            artifact,
            self.assets_dir,
            replace=False,
            downloader=unexpected_downloader,
        )
        self.assertEqual(message, f"Already up to date: {database_path}")

    def test_mismatch_without_replace_preserves_file(self) -> None:
        artifact = database_artifact(b"new-data")
        database_path = self.assets_dir / "MWU.db"
        database_path.parent.mkdir(parents=True)
        database_path.write_bytes(b"old-data")
        with self.assertRaises(source_data.SourceDataError):
            source_data.ensure_main_database(
                artifact,
                self.assets_dir,
                replace=False,
                downloader=unexpected_downloader,
            )
        self.assertEqual(database_path.read_bytes(), b"old-data")

    def test_mismatch_with_replace_replaces_file(self) -> None:
        payload = b"new-data"
        artifact = database_artifact(payload)
        database_path = self.assets_dir / "MWU.db"
        database_path.parent.mkdir(parents=True)
        database_path.write_bytes(b"old-data")
        message = source_data.ensure_main_database(
            artifact,
            self.assets_dir,
            replace=True,
            downloader=fixed_downloader(payload),
        )
        self.assertEqual(message, f"Replaced {database_path}")
        self.assertEqual(database_path.read_bytes(), payload)

    def test_wrong_download_payload_is_rejected(self) -> None:
        artifact = database_artifact(b"expected")
        database_path = self.assets_dir / "MWU.db"
        with self.assertRaises(source_data.SourceDataError):
            source_data.ensure_main_database(
                artifact,
                self.assets_dir,
                replace=False,
                downloader=fixed_downloader(b"unexpected"),
            )
        self.assertFalse(database_path.exists())

    def test_download_failure_is_reported_without_creating_the_database(self) -> None:
        artifact = database_artifact(b"expected")
        database_path = self.assets_dir / "MWU.db"
        with self.assertRaisesRegex(source_data.SourceDataError, "Download failed"):
            source_data.ensure_main_database(
                artifact,
                self.assets_dir,
                replace=False,
                downloader=failing_downloader,
            )
        self.assertFalse(database_path.exists())


class LinkWorktreeDatabaseTest(unittest.TestCase):
    def setUp(self) -> None:
        self._temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self._temporary.cleanup)
        self.directory = Path(self._temporary.name)
        self.main_database = self.directory / "main" / "assets" / "MWU.db"
        self.worktree_database = self.directory / "worktree" / "assets" / "MWU.db"

    def test_links_to_verified_main_database(self) -> None:
        payload = b"database"
        artifact = database_artifact(payload)
        self.main_database.parent.mkdir(parents=True)
        self.main_database.write_bytes(payload)
        message = source_data.link_worktree_database(
            artifact, self.main_database, self.worktree_database
        )
        self.assertEqual(
            message,
            f"Linked {self.worktree_database} -> {self.main_database}",
        )
        self.assertTrue(self.worktree_database.is_symlink())
        self.assertEqual(self.worktree_database.read_bytes(), payload)

    def test_noop_when_already_linked(self) -> None:
        payload = b"database"
        artifact = database_artifact(payload)
        self.main_database.parent.mkdir(parents=True)
        self.main_database.write_bytes(payload)
        self.worktree_database.parent.mkdir(parents=True)
        self.worktree_database.symlink_to(self.main_database)
        message = source_data.link_worktree_database(
            artifact, self.main_database, self.worktree_database
        )
        self.assertEqual(message, f"Already linked: {self.worktree_database}")

    def test_preserves_existing_unmanaged_file(self) -> None:
        artifact = database_artifact(b"database")
        self.main_database.parent.mkdir(parents=True)
        self.main_database.write_bytes(b"database")
        self.worktree_database.parent.mkdir(parents=True)
        self.worktree_database.write_bytes(b"local-data")
        with self.assertRaises(source_data.SourceDataError):
            source_data.link_worktree_database(
                artifact, self.main_database, self.worktree_database
            )
        self.assertEqual(self.worktree_database.read_bytes(), b"local-data")

    def test_fails_when_main_database_missing(self) -> None:
        artifact = database_artifact(b"database")
        with self.assertRaises(source_data.SourceDataError):
            source_data.link_worktree_database(
                artifact, self.main_database, self.worktree_database
            )

    def test_fails_when_main_database_mismatches(self) -> None:
        artifact = database_artifact(b"expected")
        self.main_database.parent.mkdir(parents=True)
        self.main_database.write_bytes(b"unexpected")
        with self.assertRaises(source_data.SourceDataError):
            source_data.link_worktree_database(
                artifact, self.main_database, self.worktree_database
            )


if __name__ == "__main__":
    unittest.main()
