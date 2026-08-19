import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Result } from "../shared/result";
import {
  PUBLIC_ARCHIVE_FILE_NAME,
  PUBLIC_CHECKSUMS_FILE_NAME,
  PUBLIC_INDEX_FILE_NAME,
  PUBLIC_REPORT_FILE_NAME,
  parseSourceDataManifest,
  type ReleaseSourceData,
} from "./release";
import {
  type PublicReleaseAssetSizes,
  type ReleaseAssetDigest,
  type VerifiedPublicRelease,
  validatePublicRelease,
} from "./releaseValidation";

export interface VerifyPublicReleaseDirectoryRequest {
  readonly releaseDirectory: string;
  readonly expectedRevision: string;
  readonly expectedConverterCommit: string;
  readonly sourceData: ReleaseSourceData;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const readProcessText = async (stream: unknown): Promise<string> => {
  if (!(stream instanceof ReadableStream)) return "";
  return new Response(stream).text();
};

const readJsonFile = async (
  path: string,
  label: string,
): Promise<Result<unknown, string>> => {
  try {
    return { ok: true, value: JSON.parse(await readFile(path, "utf8")) };
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to parse ${label}: ${errorMessage(error)}`,
    };
  }
};

const readTextFile = async (
  path: string,
  label: string,
): Promise<Result<string, string>> => {
  try {
    return { ok: true, value: await readFile(path, "utf8") };
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to read ${label}: ${errorMessage(error)}`,
    };
  }
};

const readAssetSize = async (
  path: string,
  filename: string,
): Promise<Result<number, string>> => {
  try {
    const metadata = await stat(path);
    if (!metadata.isFile()) {
      return {
        ok: false,
        error: `Required release asset is not a file: ${filename}.`,
      };
    }
    return { ok: true, value: metadata.size };
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to read required release asset ${filename}: ${errorMessage(error)}`,
    };
  }
};

const readArchiveIndex = async (
  archivePath: string,
): Promise<Result<unknown, string>> => {
  try {
    const integrityCheck = Bun.spawn(["unzip", "-t", archivePath], {
      stderr: "pipe",
      stdout: "pipe",
    });
    const [, integrityStderr, integrityExitCode] = await Promise.all([
      readProcessText(integrityCheck.stdout),
      readProcessText(integrityCheck.stderr),
      integrityCheck.exited,
    ]);
    if (integrityExitCode !== 0) {
      return {
        ok: false,
        error: `Archive integrity check failed for ${PUBLIC_ARCHIVE_FILE_NAME}: ${integrityStderr.trim()}`,
      };
    }

    const child = Bun.spawn(["unzip", "-p", archivePath, "index.json"], {
      stderr: "pipe",
      stdout: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      readProcessText(child.stdout),
      readProcessText(child.stderr),
      child.exited,
    ]);
    if (exitCode !== 0) {
      return {
        ok: false,
        error: `Unable to read archive index from ${PUBLIC_ARCHIVE_FILE_NAME}: ${stderr.trim()}`,
      };
    }
    try {
      return { ok: true, value: JSON.parse(stdout) };
    } catch (error: unknown) {
      return {
        ok: false,
        error: `Archive index is not valid JSON: ${errorMessage(error)}`,
      };
    }
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to inspect ${PUBLIC_ARCHIVE_FILE_NAME}: ${errorMessage(error)}`,
    };
  }
};

const sha256File = async (
  path: string,
  filename: string,
): Promise<Result<string, string>> => {
  try {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) {
      hash.update(chunk);
    }
    return { ok: true, value: hash.digest("hex") };
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to hash ${filename}: ${errorMessage(error)}`,
    };
  }
};

const readSourceData = async (
  manifestPath: string,
): Promise<Result<ReleaseSourceData, string>> => {
  try {
    return parseSourceDataManifest(
      JSON.parse(await readFile(manifestPath, "utf8")),
    );
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to read source-data manifest: ${errorMessage(error)}`,
    };
  }
};

export const verifyPublicReleaseDirectory = async (
  request: VerifyPublicReleaseDirectoryRequest,
): Promise<Result<VerifiedPublicRelease, readonly string[]>> => {
  const archivePath = join(request.releaseDirectory, PUBLIC_ARCHIVE_FILE_NAME);
  const indexPath = join(request.releaseDirectory, PUBLIC_INDEX_FILE_NAME);
  const checksumsPath = join(
    request.releaseDirectory,
    PUBLIC_CHECKSUMS_FILE_NAME,
  );
  const reportPath = join(request.releaseDirectory, PUBLIC_REPORT_FILE_NAME);

  const archiveSize = await readAssetSize(
    archivePath,
    PUBLIC_ARCHIVE_FILE_NAME,
  );
  if (!archiveSize.ok) return { ok: false, error: [archiveSize.error] };
  const indexSize = await readAssetSize(indexPath, PUBLIC_INDEX_FILE_NAME);
  if (!indexSize.ok) return { ok: false, error: [indexSize.error] };
  const checksumsSize = await readAssetSize(
    checksumsPath,
    PUBLIC_CHECKSUMS_FILE_NAME,
  );
  if (!checksumsSize.ok) return { ok: false, error: [checksumsSize.error] };
  const reportSize = await readAssetSize(reportPath, PUBLIC_REPORT_FILE_NAME);
  if (!reportSize.ok) return { ok: false, error: [reportSize.error] };

  const [archiveIndex, standaloneIndex, report, checksums] = await Promise.all([
    readArchiveIndex(archivePath),
    readJsonFile(indexPath, PUBLIC_INDEX_FILE_NAME),
    readJsonFile(reportPath, PUBLIC_REPORT_FILE_NAME),
    readTextFile(checksumsPath, PUBLIC_CHECKSUMS_FILE_NAME),
  ]);
  if (!archiveIndex.ok) return { ok: false, error: [archiveIndex.error] };
  if (!standaloneIndex.ok) {
    return { ok: false, error: [standaloneIndex.error] };
  }
  if (!report.ok) return { ok: false, error: [report.error] };
  if (!checksums.ok) return { ok: false, error: [checksums.error] };

  const [archiveDigest, indexDigest, reportDigest] = await Promise.all([
    sha256File(archivePath, PUBLIC_ARCHIVE_FILE_NAME),
    sha256File(indexPath, PUBLIC_INDEX_FILE_NAME),
    sha256File(reportPath, PUBLIC_REPORT_FILE_NAME),
  ]);
  if (!archiveDigest.ok) return { ok: false, error: [archiveDigest.error] };
  if (!indexDigest.ok) return { ok: false, error: [indexDigest.error] };
  if (!reportDigest.ok) return { ok: false, error: [reportDigest.error] };

  const computedChecksums: readonly ReleaseAssetDigest[] = [
    { filename: PUBLIC_ARCHIVE_FILE_NAME, digest: archiveDigest.value },
    { filename: PUBLIC_INDEX_FILE_NAME, digest: indexDigest.value },
    { filename: PUBLIC_REPORT_FILE_NAME, digest: reportDigest.value },
  ];
  const assetSizes: PublicReleaseAssetSizes = {
    archive: archiveSize.value,
    index: indexSize.value,
    checksums: checksumsSize.value,
    report: reportSize.value,
  };

  return validatePublicRelease({
    expectedRevision: request.expectedRevision,
    expectedConverterCommit: request.expectedConverterCommit,
    sourceData: request.sourceData,
    archiveIndex: archiveIndex.value,
    standaloneIndex: standaloneIndex.value,
    report: report.value,
    checksums: checksums.value,
    assetSizes,
    computedChecksums,
  });
};

export const readReleaseSourceData = readSourceData;
