import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PUBLIC_ARCHIVE_FILE_NAME,
  PUBLIC_CHECKSUMS_FILE_NAME,
  PUBLIC_INDEX_FILE_NAME,
  PUBLIC_REPORT_FILE_NAME,
  type ReleaseSourceData,
  runPublicReleaseBuild,
} from "../../src/pipeline/release";
import {
  GITHUB_MAX_RELEASE_ASSET_BYTES,
  type PublicReleaseValidationInput,
  validatePublicRelease,
} from "../../src/pipeline/releaseValidation";
import { verifyPublicReleaseDirectory } from "../../src/pipeline/releaseVerification";
import type { Result } from "../../src/shared/result";
import {
  createTestBuildRequest,
  representativeRows,
} from "../helpers/createTestDatabase";

const packageDirectory = fileURLToPath(new URL("../..", import.meta.url));
const converterCommit = "a".repeat(40);

interface TemporaryRelease {
  readonly directory: string;
  readonly outputDirectory: string;
  readonly manifestPath: string;
  readonly sourceData: ReleaseSourceData;
  readonly archivePath: string;
  readonly indexPath: string;
  readonly checksumsPath: string;
  readonly reportPath: string;
}

interface ProcessOutput {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const readProcessText = async (stream: unknown): Promise<string> => {
  if (!(stream instanceof ReadableStream)) {
    return "";
  }
  return new Response(stream).text();
};

const readJsonFile = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(path, "utf8"));

const readArchiveJson = async (
  archivePath: string,
  fileName: string,
): Promise<unknown> => {
  const child = Bun.spawn(["unzip", "-p", archivePath, fileName], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    readProcessText(child.stdout),
    readProcessText(child.stderr),
    child.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`Unable to read ${fileName} from archive: ${stderr}`);
  }
  return JSON.parse(stdout);
};

const sha256File = async (path: string): Promise<string> =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");

const createTemporaryRelease = async (): Promise<TemporaryRelease> => {
  const request = await createTestBuildRequest({
    words: [],
    rows: representativeRows,
    fullDatabase: true,
  });
  const sourceData: ReleaseSourceData = {
    sourceDataRevision: "temporary-source-revision",
    databaseFilename: "MWU.db",
    databaseSha256: await sha256File(request.databasePath),
  };
  const manifestPath = join(
    dirname(request.databasePath),
    "source-data-manifest.json",
  );
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        manifestVersion: 1,
        sourceDataRevision: sourceData.sourceDataRevision,
        artifacts: {
          database: {
            filename: sourceData.databaseFilename,
            sha256: sourceData.databaseSha256,
          },
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const result = await runPublicReleaseBuild({
    releaseRevision: "2026.08.18",
    converterCommit,
    sourceData,
    databasePath: request.databasePath,
    stylesPath: request.buildPaths.stylesPath,
    outputDirectory: request.buildPaths.outputDirectory,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return {
    directory: dirname(request.databasePath),
    outputDirectory: request.buildPaths.outputDirectory,
    manifestPath,
    sourceData,
    archivePath: result.value.archivePath,
    indexPath: result.value.indexPath,
    checksumsPath: result.value.checksumsPath,
    reportPath: result.value.reportPath,
  };
};

const withTemporaryRelease = async (
  callback: (release: TemporaryRelease) => Promise<void>,
): Promise<void> => {
  const release = await createTemporaryRelease();
  try {
    await callback(release);
  } finally {
    await rm(release.directory, { force: true, recursive: true });
  }
};

const runVerificationCommand = async (
  release: TemporaryRelease,
): Promise<ProcessOutput> => {
  const child = Bun.spawn(
    [
      "bun",
      "run",
      "test:release",
      "--",
      "--revision",
      "2026.08.18",
      "--commit",
      converterCommit,
      "--release-directory",
      release.outputDirectory,
      "--source-data-manifest",
      release.manifestPath,
    ],
    {
      cwd: packageDirectory,
      stderr: "pipe",
      stdout: "pipe",
    },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    readProcessText(child.stdout),
    readProcessText(child.stderr),
    child.exited,
  ]);
  return { exitCode, stdout, stderr };
};

const updateJsonObject = async (
  path: string,
  update: (value: Record<string, unknown>) => Record<string, unknown>,
): Promise<void> => {
  const value = await readJsonFile(path);
  if (!isRecord(value)) {
    throw new Error(`Expected ${path} to contain an object.`);
  }
  await writeFile(path, `${JSON.stringify(update(value), null, 2)}\n`, "utf8");
};

const expectVerificationFailure = <T>(
  result: Result<T, readonly string[]>,
  expectedMessage: string,
): void => {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.join("\n")).toContain(expectedMessage);
};

const createValidationInput = async (
  release: TemporaryRelease,
): Promise<PublicReleaseValidationInput> => {
  const [archiveIndex, standaloneIndex, report, checksums] = await Promise.all([
    readArchiveJson(release.archivePath, "index.json"),
    readJsonFile(release.indexPath),
    readJsonFile(release.reportPath),
    readFile(release.checksumsPath, "utf8"),
  ]);
  const [archiveStats, indexStats, checksumsStats, reportStats] =
    await Promise.all([
      stat(release.archivePath),
      stat(release.indexPath),
      stat(release.checksumsPath),
      stat(release.reportPath),
    ]);
  const [archiveDigest, indexDigest, reportDigest] = await Promise.all([
    sha256File(release.archivePath),
    sha256File(release.indexPath),
    sha256File(release.reportPath),
  ]);
  return {
    expectedRevision: "2026.08.18",
    expectedConverterCommit: converterCommit,
    sourceData: release.sourceData,
    archiveIndex,
    standaloneIndex,
    report,
    checksums,
    assetSizes: {
      archive: archiveStats.size,
      index: indexStats.size,
      checksums: checksumsStats.size,
      report: reportStats.size,
    },
    computedChecksums: [
      { filename: PUBLIC_ARCHIVE_FILE_NAME, digest: archiveDigest },
      { filename: PUBLIC_INDEX_FILE_NAME, digest: indexDigest },
      { filename: PUBLIC_REPORT_FILE_NAME, digest: reportDigest },
    ],
  };
};

describe("public release verification", () => {
  test("accepts an unmodified temporary full release", async () => {
    await withTemporaryRelease(async (release) => {
      const result = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });

      expect(result).toEqual({
        ok: true,
        value: {
          releaseRevision: "2026.08.18",
          converterCommit,
        },
      });
    });
  });

  test("test:release exits successfully and returns nonzero for a missing asset", async () => {
    await withTemporaryRelease(async (release) => {
      const success = await runVerificationCommand(release);
      expect(success.exitCode, `${success.stdout}\n${success.stderr}`).toBe(0);

      await rm(release.reportPath);
      const failure = await runVerificationCommand(release);
      expect(failure.exitCode).not.toBe(0);
      expect(failure.stderr).toContain(PUBLIC_REPORT_FILE_NAME);
      expect(failure.stderr).toContain("required release asset");
    });
  });

  test.each([
    PUBLIC_ARCHIVE_FILE_NAME,
    PUBLIC_INDEX_FILE_NAME,
    PUBLIC_CHECKSUMS_FILE_NAME,
    PUBLIC_REPORT_FILE_NAME,
  ])("rejects a missing stable asset: %s", async (fileName: string) => {
    await withTemporaryRelease(async (release) => {
      await rm(join(release.outputDirectory, fileName));
      const result = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });

      expectVerificationFailure(result, fileName);
    });
  });

  test.each([
    {
      name: "title",
      update: (index: Record<string, unknown>): Record<string, unknown> => ({
        ...index,
        title: "Wrong title",
      }),
      message: "title",
    },
    {
      name: "revision",
      update: (index: Record<string, unknown>): Record<string, unknown> => ({
        ...index,
        revision: "2026.08.17",
      }),
      message: "revision",
    },
    {
      name: "updatable flag",
      update: (index: Record<string, unknown>): Record<string, unknown> => ({
        ...index,
        isUpdatable: false,
      }),
      message: "isUpdatable",
    },
    {
      name: "index URL",
      update: (index: Record<string, unknown>): Record<string, unknown> => ({
        ...index,
        indexUrl: "https://example.com/index.json",
      }),
      message: "indexUrl",
    },
    {
      name: "download URL",
      update: (index: Record<string, unknown>): Record<string, unknown> => ({
        ...index,
        downloadUrl: "https://example.com/dictionary.zip",
      }),
      message: "downloadUrl",
    },
    {
      name: "sequenced flag",
      update: (index: Record<string, unknown>): Record<string, unknown> => ({
        ...index,
        sequenced: false,
      }),
      message: "sequenced",
    },
    {
      name: "attribution",
      update: (index: Record<string, unknown>): Record<string, unknown> => ({
        ...index,
        attribution: "https://example.com/attribution",
      }),
      message: "attribution",
    },
    {
      name: "unexpected metadata field",
      update: (index: Record<string, unknown>): Record<string, unknown> => ({
        ...index,
        unexpectedMetadata: true,
      }),
      message: "unexpectedMetadata",
    },
  ])("rejects a changed public index %s", async ({ update, message }) => {
    await withTemporaryRelease(async (release) => {
      await updateJsonObject(release.indexPath, update);
      const result = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });

      expectVerificationFailure(result, message);
    });
  });

  test("rejects unequal archive and standalone indexes", async () => {
    await withTemporaryRelease(async (release) => {
      await updateJsonObject(release.indexPath, (index) => ({
        ...index,
        title: "Different archive title",
      }));
      const result = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });

      expectVerificationFailure(
        result,
        "Archive index and standalone update index are not equal",
      );
    });
  });

  test("rejects an archive whose index cannot be read", async () => {
    await withTemporaryRelease(async (release) => {
      await writeFile(release.archivePath, "not a ZIP archive", "utf8");
      const result = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });

      expectVerificationFailure(result, "Archive integrity check");
    });
  });

  test("rejects a checksum that does not match current file bytes", async () => {
    await withTemporaryRelease(async (release) => {
      const checksums = await readFile(release.checksumsPath, "utf8");
      await writeFile(
        release.checksumsPath,
        `${"0".repeat(64)}${checksums.slice(64)}`,
        "utf8",
      );
      const result = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });

      expectVerificationFailure(result, "SHA-256 mismatch");
    });
  });

  test("rejects build errors in the public build report", async () => {
    await withTemporaryRelease(async (release) => {
      await updateJsonObject(release.reportPath, (report) => {
        const totals = report.totals;
        if (!isRecord(totals)) throw new Error("Report totals are missing.");
        return { ...report, totals: { ...totals, errors: 1 } };
      });
      const result = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });

      expectVerificationFailure(result, "totals.errors must be 0");
    });
  });

  test("rejects selected roots in the public build report", async () => {
    await withTemporaryRelease(async (release) => {
      await updateJsonObject(release.reportPath, (report) => ({
        ...report,
        requestedWords: ["o"],
      }));
      const result = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });

      expectVerificationFailure(result, "requestedWords must be empty");
    });
  });

  test("rejects provenance that disagrees with the source-data manifest", async () => {
    await withTemporaryRelease(async (release) => {
      await updateJsonObject(release.reportPath, (report) => {
        const provenance = report.releaseProvenance;
        if (!isRecord(provenance)) {
          throw new Error("Report provenance is missing.");
        }
        return {
          ...report,
          releaseProvenance: {
            ...provenance,
            sourceDataRevision: "different-source-revision",
          },
        };
      });
      const result = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });

      expectVerificationFailure(result, "sourceDataRevision");
    });
  });

  test("rejects an invalid or unexpected converter commit", async () => {
    await withTemporaryRelease(async (release) => {
      const mismatch = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: "b".repeat(40),
        sourceData: release.sourceData,
      });
      expect(mismatch.ok).toBe(false);
      expectVerificationFailure(mismatch, "converterCommit");

      await updateJsonObject(release.reportPath, (report) => {
        const provenance = report.releaseProvenance;
        if (!isRecord(provenance)) {
          throw new Error("Report provenance is missing.");
        }
        return {
          ...report,
          releaseProvenance: { ...provenance, converterCommit: "invalid" },
        };
      });
      const invalid = await verifyPublicReleaseDirectory({
        releaseDirectory: release.outputDirectory,
        expectedRevision: "2026.08.18",
        expectedConverterCommit: converterCommit,
        sourceData: release.sourceData,
      });
      expectVerificationFailure(invalid, "full 40-character SHA-1");
    });
  });

  test("rejects an asset at GitHub's 2 GiB per-asset limit", async () => {
    await withTemporaryRelease(async (release) => {
      const input = await createValidationInput(release);
      const result = validatePublicRelease({
        ...input,
        assetSizes: {
          ...input.assetSizes,
          archive: GITHUB_MAX_RELEASE_ASSET_BYTES,
        },
      });

      expectVerificationFailure(result, "2 GiB");
    });
  });
});
