import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  createPublicDictionaryIndex,
  createReleaseProvenance,
  PUBLIC_ARCHIVE_FILE_NAME,
  PUBLIC_INDEX_FILE_NAME,
  parseReleaseRevision,
  type ReleaseSourceData,
  runPublicReleaseBuild,
} from "../../src/pipeline/release";
import { runBuild } from "../../src/pipeline/runBuild";
import {
  createTestBuildRequest,
  representativeRows,
} from "../helpers/createTestDatabase";

const converterCommit = "a".repeat(40);

const readProcessText = async (stream: unknown): Promise<string> => {
  if (!(stream instanceof ReadableStream)) {
    throw new Error("Expected piped process output");
  }
  return new Response(stream).text();
};

const readArchiveJson = async (
  archivePath: string,
  fileName: string,
): Promise<unknown> => {
  const child = Bun.spawn(["unzip", "-p", archivePath, fileName], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const text = await readProcessText(child.stdout);
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    const errorText = await readProcessText(child.stderr);
    throw new Error(`Unable to read ${fileName}: ${errorText}`);
  }
  return JSON.parse(text);
};

const readJsonFile = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(path, "utf8"));

const sha256File = async (path: string): Promise<string> =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const property = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const createTemporaryReleaseInput = async (): Promise<{
  readonly databasePath: string;
  readonly stylesPath: string;
  readonly outputDirectory: string;
  readonly sourceData: ReleaseSourceData;
}> => {
  const request = await createTestBuildRequest({
    words: [],
    rows: representativeRows,
    fullDatabase: true,
  });
  return {
    databasePath: request.databasePath,
    stylesPath: request.buildPaths.stylesPath,
    outputDirectory: request.buildPaths.outputDirectory,
    sourceData: {
      sourceDataRevision: "temporary-source-revision",
      databaseFilename: "MWU.db",
      databaseSha256: await sha256File(request.databasePath),
    },
  };
};

describe("release revision", () => {
  test.each(["2026.08.18", "2026.08.18.1", "1999.01.01", "2099.12.31"])(
    "accepts %s without using the current date",
    (revision: string) => {
      expect(parseReleaseRevision(revision)).toEqual({
        ok: true,
        value: revision,
      });
    },
  );

  test.each([
    "2026.8.18",
    "2026.08.8",
    "2026.02.30",
    "2026.13.01",
    "2026.00.01",
    "2026.08.18.0",
    "2026.08.18.01",
    "2026.08.18.1.2",
    "release-2026.08.18",
  ])("rejects malformed revision %s", (revision: string) => {
    expect(parseReleaseRevision(revision).ok).toBe(false);
  });
});

describe("release metadata", () => {
  test("creates public updatable metadata and provenance", () => {
    const sourceData: ReleaseSourceData = {
      sourceDataRevision: "source-2024",
      databaseFilename: "MWU.db",
      databaseSha256: "b".repeat(64),
    };
    const provenance = createReleaseProvenance({
      releaseRevision: "2026.08.18.1",
      converterCommit,
      sourceData,
    });

    expect(provenance).toEqual({
      ok: true,
      value: {
        releaseRevision: "2026.08.18.1",
        releaseTag: "2026.08.18.1",
        converterCommit,
        sourceDataRevision: "source-2024",
        sourceDatabaseFilename: "MWU.db",
        sourceDatabaseSha256: "b".repeat(64),
      },
    });
    expect(createPublicDictionaryIndex("2026.08.18.1")).toEqual({
      title: "Merriam Webster Unabridged",
      revision: "2026.08.18.1",
      format: 3,
      author: "https://github.com/BilderLoong/yomitan-dictionary",
      isUpdatable: true,
      indexUrl:
        "https://github.com/BilderLoong/yomitan-dictionary/releases/latest/download/Merriam-Webster-Unabridged.index.json",
      downloadUrl:
        "https://github.com/BilderLoong/yomitan-dictionary/releases/latest/download/Merriam-Webster-Unabridged.zip",
      description: "Merriam Webster Unabridged Dictionary",
      attribution: "https://www.merriam-webster.com/",
      sequenced: true,
    });
  });

  test("rejects a non-full converter commit", () => {
    const result = createReleaseProvenance({
      releaseRevision: "2026.08.18",
      converterCommit: "short-sha",
      sourceData: {
        sourceDataRevision: "source-2024",
        databaseFilename: "MWU.db",
        databaseSha256: "b".repeat(64),
      },
    });

    expect(result.ok).toBe(false);
  });
});

describe("public release build", () => {
  test("assembles stable assets from a temporary full source database", async () => {
    const input = await createTemporaryReleaseInput();
    const result = await runPublicReleaseBuild({
      releaseRevision: "2026.08.18",
      converterCommit,
      ...input,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);

    expect(basename(result.value.archivePath)).toBe(PUBLIC_ARCHIVE_FILE_NAME);
    expect(basename(result.value.indexPath)).toBe(PUBLIC_INDEX_FILE_NAME);
    expect(result.value.report.totals.errors).toBe(0);
    expect(result.value.report.totals.roots).toBe(3);
    expect(result.value.report.releaseProvenance).toEqual({
      releaseRevision: "2026.08.18",
      releaseTag: "2026.08.18",
      converterCommit,
      sourceDataRevision: "temporary-source-revision",
      sourceDatabaseFilename: "MWU.db",
      sourceDatabaseSha256: input.sourceData.databaseSha256,
    });

    const archiveIndex = await readArchiveJson(
      result.value.archivePath,
      "index.json",
    );
    const standaloneIndex = await readJsonFile(result.value.indexPath);
    expect(archiveIndex).toEqual(standaloneIndex);
    expect(property(standaloneIndex, "title")).toBe(
      "Merriam Webster Unabridged",
    );
    expect(property(standaloneIndex, "revision")).toBe("2026.08.18");
    expect(property(standaloneIndex, "isUpdatable")).toBe(true);
    expect(property(standaloneIndex, "indexUrl")).toContain(
      "/releases/latest/download/Merriam-Webster-Unabridged.index.json",
    );
    expect(property(standaloneIndex, "downloadUrl")).toContain(
      "/releases/latest/download/Merriam-Webster-Unabridged.zip",
    );

    const report = await readJsonFile(result.value.reportPath);
    expect(report).toEqual(result.value.report);

    const expectedChecksums = [
      `${await sha256File(result.value.archivePath)}  ${PUBLIC_ARCHIVE_FILE_NAME}`,
      `${await sha256File(result.value.indexPath)}  ${PUBLIC_INDEX_FILE_NAME}`,
    ].join("\n");
    expect(await readFile(result.value.checksumsPath, "utf8")).toBe(
      `${expectedChecksums}\n`,
    );

    expect(await readFile(result.value.checksumsPath, "utf8")).not.toContain(
      "build-report.json",
    );
  });

  test("keeps selected and development full builds outside the public update channel", async () => {
    const selectedRequest = await createTestBuildRequest({
      words: ["o"],
      rows: representativeRows,
    });
    const fullRequest = await createTestBuildRequest({
      words: [],
      rows: representativeRows,
      fullDatabase: true,
    });

    const attempts = await Promise.all([
      runBuild(selectedRequest),
      runBuild(fullRequest),
    ]);

    for (const attempt of attempts) {
      expect(attempt.ok).toBe(true);
      if (!attempt.ok) continue;
      const index = await readArchiveJson(attempt.archivePath, "index.json");
      expect(property(index, "isUpdatable")).toBeUndefined();
      expect(property(index, "indexUrl")).toBeUndefined();
      expect(property(index, "downloadUrl")).toBeUndefined();
    }
  });

  test("rejects a source database that does not match its contract", async () => {
    const input = await createTemporaryReleaseInput();
    const result = await runPublicReleaseBuild({
      releaseRevision: "2026.08.18",
      converterCommit,
      ...input,
      sourceData: {
        ...input.sourceData,
        databaseSha256: "0".repeat(64),
      },
    });

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining(
        "Source database checksum does not match the source-data contract.",
      ),
    });
  });
});
