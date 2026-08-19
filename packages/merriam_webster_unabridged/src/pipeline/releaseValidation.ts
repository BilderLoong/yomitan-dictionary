import { isDeepStrictEqual } from "node:util";

import type { Result } from "../shared/result";
import {
  createPublicDictionaryIndex,
  PUBLIC_ARCHIVE_FILE_NAME,
  PUBLIC_CHECKSUMS_FILE_NAME,
  PUBLIC_INDEX_FILE_NAME,
  PUBLIC_REPORT_FILE_NAME,
  parseReleaseRevision,
  type ReleaseSourceData,
} from "./release";

export const GITHUB_MAX_RELEASE_ASSET_BYTES = 2 * 1024 * 1024 * 1024;

export interface PublicReleaseAssetSizes {
  readonly archive: number;
  readonly index: number;
  readonly checksums: number;
  readonly report: number;
}

export interface ReleaseAssetDigest {
  readonly filename: string;
  readonly digest: string;
}

export interface PublicReleaseValidationInput {
  readonly expectedRevision: string;
  readonly expectedConverterCommit: string;
  readonly sourceData: ReleaseSourceData;
  readonly archiveIndex: unknown;
  readonly standaloneIndex: unknown;
  readonly report: unknown;
  readonly checksums: string;
  readonly assetSizes: PublicReleaseAssetSizes;
  readonly computedChecksums: readonly ReleaseAssetDigest[];
}

export interface VerifiedPublicRelease {
  readonly releaseRevision: string;
  readonly converterCommit: string;
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const CHECKSUM_LINE_PATTERN = /^([0-9a-f]{64}) {2}(.+)$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getProperty = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const describeValue = (value: unknown): string => {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? String(value) : serialized;
};

const describeIndexDifference = (
  label: string,
  index: unknown,
  expectedIndex: unknown,
): readonly string[] => {
  if (!isRecord(index)) return [`${label} must be a JSON object.`];
  if (!isRecord(expectedIndex)) {
    return [`${label} has no valid expected public index object.`];
  }
  if (isDeepStrictEqual(index, expectedIndex)) return [];

  const expectedFields = Object.keys(expectedIndex);
  const actualFields = Object.keys(index);
  const changedFields = expectedFields.flatMap(
    (field: string): readonly string[] => {
      const expected = expectedIndex[field];
      const actual = index[field];
      return Object.hasOwn(index, field) && isDeepStrictEqual(actual, expected)
        ? []
        : [
            `${field} (expected ${describeValue(expected)}, received ${describeValue(actual)})`,
          ];
    },
  );
  const unexpectedFields = actualFields
    .filter((field: string): boolean => !expectedFields.includes(field))
    .map((field: string): string => `${field} (unexpected field)`);
  const differences = [...changedFields, ...unexpectedFields];
  const detail =
    differences.length > 0 ? differences.join("; ") : "nested metadata differs";
  return [
    `${label} must equal the complete expected public index object; ${detail}.`,
  ];
};

const validateExpectedConverterCommit = (
  converterCommit: unknown,
  expectedConverterCommit: string,
): readonly string[] => {
  if (converterCommit === expectedConverterCommit) return [];
  return [
    `Build report releaseProvenance.converterCommit must equal ${expectedConverterCommit}; received ${describeValue(converterCommit)}.`,
  ];
};

const validateReport = (
  input: PublicReleaseValidationInput,
): {
  readonly errors: readonly string[];
  readonly converterCommit: unknown;
} => {
  if (!isRecord(input.report)) {
    return {
      errors: ["Build report must be a JSON object."],
      converterCommit: undefined,
    };
  }

  const totals = getProperty(input.report, "totals");
  const provenance = getProperty(input.report, "releaseProvenance");
  const archivePath = getProperty(input.report, "archivePath");
  const requestedWords = getProperty(input.report, "requestedWords");
  const errors = [
    ...(isRecord(totals) && getProperty(totals, "errors") === 0
      ? []
      : [
          `Build report totals.errors must be 0; received ${describeValue(
            getProperty(totals, "errors"),
          )}.`,
        ]),
    ...(typeof archivePath === "string" &&
    archivePath.split(/[\\/]/u).at(-1) === PUBLIC_ARCHIVE_FILE_NAME
      ? []
      : [
          `Build report archivePath must name ${PUBLIC_ARCHIVE_FILE_NAME}; received ${describeValue(archivePath)}.`,
        ]),
    ...(isRecord(provenance)
      ? []
      : ["Build report releaseProvenance must be an object."]),
    ...(Array.isArray(requestedWords) && requestedWords.length === 0
      ? []
      : [
          `Build report requestedWords must be empty for a public full-database release; received ${describeValue(requestedWords)}.`,
        ]),
  ];

  const provenanceFields: readonly {
    readonly name: string;
    readonly expected: string;
  }[] = [
    { name: "releaseRevision", expected: input.expectedRevision },
    { name: "releaseTag", expected: input.expectedRevision },
    {
      name: "sourceDataRevision",
      expected: input.sourceData.sourceDataRevision,
    },
    {
      name: "sourceDatabaseFilename",
      expected: input.sourceData.databaseFilename,
    },
    {
      name: "sourceDatabaseSha256",
      expected: input.sourceData.databaseSha256,
    },
  ];
  const provenanceErrors = isRecord(provenance)
    ? provenanceFields.flatMap(({ name, expected }): readonly string[] => {
        const actual = getProperty(provenance, name);
        return actual === expected
          ? []
          : [
              `Build report releaseProvenance.${name} must equal ${describeValue(expected)}; received ${describeValue(actual)}.`,
            ];
      })
    : [];
  const converterCommit = getProperty(provenance, "converterCommit");
  const converterCommitErrors = [
    ...(COMMIT_SHA_PATTERN.test(
      typeof converterCommit === "string" ? converterCommit : "",
    )
      ? []
      : [
          "Build report releaseProvenance.converterCommit must be a full 40-character SHA-1.",
        ]),
    ...validateExpectedConverterCommit(
      converterCommit,
      input.expectedConverterCommit,
    ),
  ];

  return {
    errors: [...errors, ...provenanceErrors, ...converterCommitErrors],
    converterCommit,
  };
};

interface ParsedChecksum {
  readonly digest: string;
  readonly filename: string;
}

interface ParsedChecksumResult {
  readonly entries: readonly ParsedChecksum[];
  readonly errors: readonly string[];
}

const parseChecksums = (content: string): ParsedChecksumResult => {
  const lines = content.endsWith("\n")
    ? content.slice(0, -1).split("\n")
    : content.split("\n");
  const parsed = lines.map((line: string): ParsedChecksum | null => {
    const match = CHECKSUM_LINE_PATTERN.exec(line);
    const digest = match?.at(1);
    const filename = match?.at(2);
    return digest === undefined || filename === undefined
      ? null
      : { digest, filename };
  });
  const errors = lines.flatMap(
    (line: string, index: number): readonly string[] =>
      parsed[index] === null
        ? [`SHA256SUMS line ${index + 1} is malformed: ${line}`]
        : [],
  );
  return {
    entries: parsed.flatMap(
      (entry: ParsedChecksum | null): readonly ParsedChecksum[] =>
        entry === null ? [] : [entry],
    ),
    errors,
  };
};

const validateChecksums = (
  input: PublicReleaseValidationInput,
): readonly string[] => {
  const expectedFiles: readonly string[] = [
    PUBLIC_ARCHIVE_FILE_NAME,
    PUBLIC_INDEX_FILE_NAME,
    PUBLIC_REPORT_FILE_NAME,
  ];
  const parsed = parseChecksums(input.checksums);
  const filenames = parsed.entries.map(
    ({ filename }: ParsedChecksum): string => filename,
  );
  const missing = expectedFiles.flatMap(
    (filename: string): readonly string[] =>
      filenames.includes(filename)
        ? []
        : [`SHA256SUMS is missing ${filename}.`],
  );
  const duplicates = expectedFiles.flatMap(
    (filename: string): readonly string[] =>
      filenames.filter((value: string): boolean => value === filename).length >
      1
        ? [`SHA256SUMS contains duplicate entries for ${filename}.`]
        : [],
  );
  const unexpected = parsed.entries.flatMap(
    ({ filename }: ParsedChecksum): readonly string[] =>
      expectedFiles.includes(filename)
        ? []
        : [`SHA256SUMS contains unexpected file ${filename}.`],
  );
  const digestErrors = expectedFiles.flatMap(
    (filename: string): readonly string[] => {
      const declared = parsed.entries.find(
        (entry: ParsedChecksum): boolean => entry.filename === filename,
      )?.digest;
      const computed = input.computedChecksums.find(
        (entry: ReleaseAssetDigest): boolean => entry.filename === filename,
      )?.digest;
      if (declared === undefined || computed === undefined) return [];
      return declared === computed
        ? []
        : [
            `SHA-256 mismatch for ${filename}: declared ${declared}, computed ${computed}.`,
          ];
    },
  );
  return [
    ...parsed.errors,
    ...missing,
    ...duplicates,
    ...unexpected,
    ...digestErrors,
  ];
};

const validateAssetSizes = (
  sizes: PublicReleaseAssetSizes,
): readonly string[] => {
  const assets: readonly {
    readonly filename: string;
    readonly size: number;
  }[] = [
    { filename: PUBLIC_ARCHIVE_FILE_NAME, size: sizes.archive },
    { filename: PUBLIC_INDEX_FILE_NAME, size: sizes.index },
    { filename: PUBLIC_CHECKSUMS_FILE_NAME, size: sizes.checksums },
    { filename: PUBLIC_REPORT_FILE_NAME, size: sizes.report },
  ];
  return assets.flatMap(({ filename, size }): readonly string[] => {
    if (!Number.isFinite(size) || size < 0) {
      return [`Invalid size for ${filename}: ${describeValue(size)}.`];
    }
    return size >= GITHUB_MAX_RELEASE_ASSET_BYTES
      ? [
          `${filename} is ${size} bytes and cannot be published because GitHub's per-asset limit is 2 GiB.`,
        ]
      : [];
  });
};

export const validatePublicRelease = (
  input: PublicReleaseValidationInput,
): Result<VerifiedPublicRelease, readonly string[]> => {
  const revision = parseReleaseRevision(input.expectedRevision);
  const expectedIndex = createPublicDictionaryIndex(input.expectedRevision);
  const report = validateReport(input);
  const errors = [
    ...(revision.ok ? [] : [revision.error.message]),
    ...(COMMIT_SHA_PATTERN.test(input.expectedConverterCommit)
      ? []
      : ["Expected converter commit must be a full 40-character SHA-1."]),
    ...validateAssetSizes(input.assetSizes),
    ...(isDeepStrictEqual(input.archiveIndex, input.standaloneIndex)
      ? []
      : [
          "Archive index and standalone update index are not equal; release metadata must come from one source.",
        ]),
    ...describeIndexDifference(
      "Archive index",
      input.archiveIndex,
      expectedIndex,
    ),
    ...describeIndexDifference(
      "Standalone update index",
      input.standaloneIndex,
      expectedIndex,
    ),
    ...report.errors,
    ...validateChecksums(input),
    ...(SHA256_PATTERN.test(input.sourceData.databaseSha256)
      ? []
      : ["Source-data manifest database SHA-256 is invalid."]),
  ];

  if (errors.length > 0 || typeof report.converterCommit !== "string") {
    return { ok: false, error: errors };
  }
  return {
    ok: true,
    value: {
      releaseRevision: input.expectedRevision,
      converterCommit: report.converterCommit,
    },
  };
};
