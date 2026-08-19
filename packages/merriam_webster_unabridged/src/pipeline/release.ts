import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DictionaryIndex } from "yomichan-dict-builder";
import type { DictionaryIndexType } from "yomichan-dict-builder/dist/types/yomitan/dictionaryindex";

import type { Result } from "../shared/result";
import { type BuildReport, serializeBuildReport } from "./report";
import { runBuild } from "./runBuild";

export const PUBLIC_ARCHIVE_FILE_NAME = "Merriam-Webster-Unabridged.zip";
export const PUBLIC_INDEX_FILE_NAME = "Merriam-Webster-Unabridged.index.json";
export const PUBLIC_CHECKSUMS_FILE_NAME = "SHA256SUMS";
export const PUBLIC_REPORT_FILE_NAME = "build-report.json";
export const PROVENANCE_NOTES_FILE_NAME = "provenance-notes.md";

const PUBLIC_INDEX_URL =
  "https://github.com/BilderLoong/yomitan-dictionary/releases/latest/download/Merriam-Webster-Unabridged.index.json";
const PUBLIC_DOWNLOAD_URL =
  "https://github.com/BilderLoong/yomitan-dictionary/releases/latest/download/Merriam-Webster-Unabridged.zip";
const RELEASE_REVISION_PATTERN =
  /^(\d{4})\.(\d{2})\.(\d{2})(?:\.([1-9]\d*))?$/u;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;

export interface ReleaseSourceData {
  readonly sourceDataRevision: string;
  readonly databaseFilename: string;
  readonly databaseSha256: string;
}

export interface ReleaseProvenance {
  readonly releaseRevision: string;
  readonly releaseTag: string;
  readonly converterCommit: string;
  readonly sourceDataRevision: string;
  readonly sourceDatabaseFilename: string;
  readonly sourceDatabaseSha256: string;
}

export interface ReleaseBuildRequest {
  readonly releaseRevision: string;
  readonly converterCommit: string;
  readonly sourceData: ReleaseSourceData;
  readonly databasePath: string;
  readonly stylesPath: string;
  readonly outputDirectory: string;
}

export interface ReleaseBuildReport extends BuildReport {
  readonly releaseProvenance: ReleaseProvenance;
}

export interface PublicReleaseAssets {
  readonly archivePath: string;
  readonly indexPath: string;
  readonly checksumsPath: string;
  readonly reportPath: string;
  readonly provenanceNotesPath: string;
  readonly report: ReleaseBuildReport;
}

export type ReleaseInputError = {
  readonly kind: "invalid-release-input";
  readonly message: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const nonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isLeapYear = (year: number): boolean =>
  year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
};

export const parseReleaseRevision = (
  revision: string,
): Result<string, ReleaseInputError> => {
  const match = RELEASE_REVISION_PATTERN.exec(revision);
  if (match === null) {
    return {
      ok: false,
      error: {
        kind: "invalid-release-input",
        message:
          "Release revision must use YYYY.MM.DD with an optional positive .N sequence.",
      },
    };
  }

  const yearText = match.at(1);
  const monthText = match.at(2);
  const dayText = match.at(3);
  if (
    yearText === undefined ||
    monthText === undefined ||
    dayText === undefined
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-release-input",
        message: "Release revision is incomplete.",
      },
    };
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return {
      ok: false,
      error: {
        kind: "invalid-release-input",
        message: `Release revision is not a real calendar date: ${revision}`,
      },
    };
  }

  return { ok: true, value: revision };
};

export const parseSourceDataManifest = (
  raw: unknown,
): Result<ReleaseSourceData, string> => {
  if (!isRecord(raw))
    return { ok: false, error: "Manifest must be an object." };
  if (raw.manifestVersion !== 1) {
    return { ok: false, error: "Manifest version must be 1." };
  }

  const sourceDataRevision = raw.sourceDataRevision;
  const artifacts = raw.artifacts;
  if (!nonEmptyString(sourceDataRevision) || !isRecord(artifacts)) {
    return {
      ok: false,
      error: "Manifest must contain sourceDataRevision and artifacts.",
    };
  }

  const database = artifacts.database;
  if (!isRecord(database)) {
    return { ok: false, error: "Manifest must contain a database artifact." };
  }

  const databaseFilename = database.filename;
  const databaseSha256 = database.sha256;
  if (!nonEmptyString(databaseFilename)) {
    return { ok: false, error: "Manifest database filename is missing." };
  }
  if (
    typeof databaseSha256 !== "string" ||
    SHA256_PATTERN.test(databaseSha256) === false
  ) {
    return { ok: false, error: "Manifest database SHA-256 is invalid." };
  }

  return {
    ok: true,
    value: {
      sourceDataRevision,
      databaseFilename,
      databaseSha256,
    },
  };
};

export const createReleaseProvenance = (input: {
  readonly releaseRevision: string;
  readonly converterCommit: string;
  readonly sourceData: ReleaseSourceData;
}): Result<ReleaseProvenance, ReleaseInputError> => {
  const revision = parseReleaseRevision(input.releaseRevision);
  if (!revision.ok) return revision;
  if (!COMMIT_SHA_PATTERN.test(input.converterCommit)) {
    return {
      ok: false,
      error: {
        kind: "invalid-release-input",
        message: "Converter commit must be a full 40-character SHA-1.",
      },
    };
  }
  if (!nonEmptyString(input.sourceData.sourceDataRevision)) {
    return {
      ok: false,
      error: {
        kind: "invalid-release-input",
        message: "Source-data revision must not be empty.",
      },
    };
  }
  if (!nonEmptyString(input.sourceData.databaseFilename)) {
    return {
      ok: false,
      error: {
        kind: "invalid-release-input",
        message: "Source database filename must not be empty.",
      },
    };
  }
  if (!SHA256_PATTERN.test(input.sourceData.databaseSha256)) {
    return {
      ok: false,
      error: {
        kind: "invalid-release-input",
        message:
          "Source database SHA-256 must contain 64 lowercase hex digits.",
      },
    };
  }

  return {
    ok: true,
    value: {
      releaseRevision: revision.value,
      releaseTag: revision.value,
      converterCommit: input.converterCommit,
      sourceDataRevision: input.sourceData.sourceDataRevision,
      sourceDatabaseFilename: input.sourceData.databaseFilename,
      sourceDatabaseSha256: input.sourceData.databaseSha256,
    },
  };
};

export const createPublicDictionaryIndex = (
  revision: string,
): DictionaryIndexType =>
  new DictionaryIndex()
    .setTitle("Merriam Webster Unabridged")
    .setRevision(revision)
    .setFormat(3)
    .setAuthor("Birudo")
    .setIsUpdatable(true)
    .setIndexUrl(PUBLIC_INDEX_URL)
    .setDownloadUrl(PUBLIC_DOWNLOAD_URL)
    .setDescription("Merriam Webster Unabridged Dictionary")
    .setAttribution("https://www.merriam-webster.com/")
    .setSequenced(true)
    .build();

export const addReleaseProvenance = (
  report: BuildReport,
  releaseProvenance: ReleaseProvenance,
): ReleaseBuildReport => ({ ...report, releaseProvenance });

export const formatSha256Sums = (
  entries: readonly { readonly digest: string; readonly filename: string }[],
): string =>
  `${entries.map(({ digest, filename }) => `${digest}  ${filename}`).join("\n")}\n`;

export const formatProvenanceNotes = (provenance: ReleaseProvenance): string =>
  [
    "Release provenance",
    "",
    `Release revision: ${provenance.releaseRevision}`,
    `Release tag: ${provenance.releaseTag}`,
    `Converter commit: ${provenance.converterCommit}`,
    `Source-data revision: ${provenance.sourceDataRevision}`,
    `Source database filename: ${provenance.sourceDatabaseFilename}`,
    `Source database SHA-256: ${provenance.sourceDatabaseSha256}`,
    "",
  ].join("\n");

const sha256File = async (path: string): Promise<string> => {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const runPublicReleaseBuild = async (
  request: ReleaseBuildRequest,
): Promise<Result<PublicReleaseAssets, string>> => {
  const provenance = createReleaseProvenance(request);
  if (!provenance.ok) return { ok: false, error: provenance.error.message };

  let databaseSha256: string;
  try {
    databaseSha256 = await sha256File(request.databasePath);
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to verify source database: ${errorMessage(error)}`,
    };
  }
  if (databaseSha256 !== request.sourceData.databaseSha256) {
    return {
      ok: false,
      error:
        "Source database checksum does not match the source-data contract.\n" +
        `Expected: ${request.sourceData.databaseSha256}\n` +
        `Got: ${databaseSha256}`,
    };
  }

  const index = createPublicDictionaryIndex(provenance.value.releaseRevision);
  const reportPath = join(request.outputDirectory, PUBLIC_REPORT_FILE_NAME);
  const buildAttempt = await runBuild({
    requestedWords: [],
    databasePath: request.databasePath,
    buildPaths: {
      outputDirectory: request.outputDirectory,
      reportPath,
      stylesPath: request.stylesPath,
    },
    archiveFileName: PUBLIC_ARCHIVE_FILE_NAME,
    dictionaryIndex: index,
    fullDatabase: true,
  });
  if (!buildAttempt.ok) {
    return {
      ok: false,
      error: `Public release build failed: ${JSON.stringify(buildAttempt.report.errors)}`,
    };
  }

  const report = addReleaseProvenance(buildAttempt.report, provenance.value);
  const indexPath = join(request.outputDirectory, PUBLIC_INDEX_FILE_NAME);
  const checksumsPath = join(
    request.outputDirectory,
    PUBLIC_CHECKSUMS_FILE_NAME,
  );
  const provenanceNotesPath = join(
    request.outputDirectory,
    PROVENANCE_NOTES_FILE_NAME,
  );

  try {
    await mkdir(request.outputDirectory, { recursive: true });
    await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    await writeFile(reportPath, serializeBuildReport(report), "utf8");

    const checksums = formatSha256Sums([
      {
        digest: await sha256File(buildAttempt.archivePath),
        filename: PUBLIC_ARCHIVE_FILE_NAME,
      },
      {
        digest: await sha256File(indexPath),
        filename: PUBLIC_INDEX_FILE_NAME,
      },
      {
        digest: await sha256File(reportPath),
        filename: PUBLIC_REPORT_FILE_NAME,
      },
    ]);
    await writeFile(checksumsPath, checksums, "utf8");
    await writeFile(
      provenanceNotesPath,
      formatProvenanceNotes(provenance.value),
      "utf8",
    );
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to assemble public release assets: ${errorMessage(error)}`,
    };
  }

  return {
    ok: true,
    value: {
      archivePath: buildAttempt.archivePath,
      indexPath,
      checksumsPath,
      reportPath,
      provenanceNotesPath,
      report,
    },
  };
};
