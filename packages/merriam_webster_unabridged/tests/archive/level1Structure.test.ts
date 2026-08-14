import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TermInformation } from "yomichan-dict-builder/dist/types/yomitan/termbank";
import { runBuild } from "../../src/pipeline/runBuild";
import { buildSourceIndex, type SourceIndex } from "../../src/source/rows";
import {
  listSourceRowSummaries,
  openSourceDatabase,
} from "../../src/source/sqlite";

const sourceDatabasePath = fileURLToPath(
  new URL("../../assets/MWU.db", import.meta.url),
);

const stylesPath = fileURLToPath(new URL("../../styles.css", import.meta.url));

// The source index is pure input data shared by every build in this file;
// rebuilding it per test would repeat ~1.5s of decode/sort work.
const sourceIndex: SourceIndex = (() => {
  const database = openSourceDatabase(sourceDatabasePath);
  try {
    return buildSourceIndex(listSourceRowSummaries(database));
  } finally {
    database.close();
  }
})();

const readProcessText = async (stream: unknown): Promise<string> => {
  if (!(stream instanceof ReadableStream)) {
    throw new Error("Expected piped process output");
  }
  return new Response(stream).text();
};

const readTermBank = async (
  archivePath: string,
): Promise<readonly TermInformation[]> => {
  const child = Bun.spawn(["unzip", "-p", archivePath, "term_bank_1.json"], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const text = await readProcessText(child.stdout);
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    const errorText = await readProcessText(child.stderr);
    throw new Error(`Unable to read term_bank_1.json: ${errorText}`);
  }
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("term_bank_1.json must contain an array");
  }
  return parsed;
};

const collectStrings = (value: unknown): readonly string[] =>
  typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.flatMap(collectStrings)
      : value !== null && typeof value === "object"
        ? Object.values(value).flatMap(collectStrings)
        : [];

const canonicalEntry = (
  term: string,
  popularity: number,
  definitionTags: string | null | undefined = undefined,
  rules = "",
): TermInformation => [
  term,
  "",
  definitionTags === undefined ? expect.any(String) : definitionTags,
  rules,
  popularity,
  expect.any(Array),
  expect.any(Number),
  "",
];

const softLinkEntry = (
  lookup: string,
  target: string,
  rules: readonly string[],
): TermInformation => [
  lookup,
  "",
  null,
  "",
  -100,
  [[target, [...rules]]],
  expect.any(Number),
  "",
];

const exactCanonicalEntry = (
  term: string,
  popularity: number,
  sequence: number,
): TermInformation => [
  term,
  "",
  null,
  "",
  popularity,
  expect.any(Array),
  sequence,
  "",
];

const exactSoftLinkEntry = (
  lookup: string,
  target: string,
  rules: readonly string[],
  sequence: number,
): TermInformation => [
  lookup,
  "",
  null,
  "",
  -100,
  [[target, [...rules]]],
  sequence,
  "",
];

const definitionHash = (record: TermInformation): string =>
  createHash("sha256").update(JSON.stringify(record[5])).digest("hex");

describe("term-bank level 1 generation test", () => {
  test("nested run-on labels stay out of their real selected owner records", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mwu-real-"));
    const attempt = await runBuild({
      requestedWords: ["Hall of Fame", "homeothermic", "role-play"],
      databasePath: sourceDatabasePath,
      sourceIndex,
      buildPaths: {
        outputDirectory,
        reportPath: join(outputDirectory, "build-report.json"),
        stylesPath,
      },
    });

    expect(
      attempt.ok,
      attempt.ok ? "" : JSON.stringify(attempt.report.errors),
    ).toBe(true);
    if (!attempt.ok) return;

    const termBank = await readTermBank(attempt.archivePath);

    expect(attempt.report.errors).toEqual([]);
    expect(termBank).toEqual([
      exactCanonicalEntry("Hall of Fame", 100, 1),
      exactCanonicalEntry("homeothermic", 100, 2),
      exactCanonicalEntry("role–play", 0, 3),
      exactSoftLinkEntry(
        "ho·moio·ther·mic",
        "homeothermic",
        ["alternative"],
        4,
      ),
      exactSoftLinkEntry("role-play", "role–play", ["alternative"], 5),
    ]);
    expect(
      termBank.map(
        (record: TermInformation): readonly [string, string | null, string] => [
          record[0],
          record[2],
          record[7],
        ],
      ),
    ).toEqual([
      ["Hall of Fame", null, ""],
      ["homeothermic", null, ""],
      ["role–play", null, ""],
      ["ho·moio·ther·mic", null, ""],
      ["role-play", null, ""],
    ]);
    expect(termBank.slice(0, 3).map(definitionHash)).toEqual([
      "34cfe52641201539e0273abed5d655bcd6979e30958b474247dba06c0a1db037",
      "21f160a9ab2042bdcb93a1caebb40a103c55b332dd6d84c63d4d25b63845c59e",
      "59a24cb4a80d23b2197125c70b52f65e4823ecec9cd120547eb7c4fa49460c64",
    ]);
  }, 90_000);

  test("what", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mwu-real-"));
    const attempt = await runBuild({
      requestedWords: ["what"],
      databasePath: sourceDatabasePath,
      sourceIndex,
      buildPaths: {
        outputDirectory,
        reportPath: join(outputDirectory, "build-report.json"),
        stylesPath,
      },
    });

    expect(
      attempt.ok,
      attempt.ok ? "" : JSON.stringify(attempt.report.errors),
    ).toBe(true);
    if (!attempt.ok) return;

    const termBank = await readTermBank(attempt.archivePath);

    expect(attempt.report.errors).toEqual([]);
    const mainCanonicalEntries = [
      canonicalEntry("what", 100),
      canonicalEntry("what", 100),
      canonicalEntry("what", 100),
      canonicalEntry("what", 100),
      canonicalEntry("what", 100),
    ];
    const drpPhraseCanonicalEntries = [
      canonicalEntry("no matter what", 0),
      canonicalEntry("what about", 0),
      canonicalEntry("what an if", 0),
      canonicalEntry("what else", 0),
      canonicalEntry("what for", 0, undefined, "v_phr"),
      canonicalEntry("what have you", 0),
      canonicalEntry("what if", 0),
      canonicalEntry("what it takes", 0),
      canonicalEntry("what of", 0),
      canonicalEntry("what's o'clock", 0),
      canonicalEntry("what's what", 0),
      canonicalEntry("what's with", 0),
      canonicalEntry("what though", 0),
      canonicalEntry("what countryman", 0),
      canonicalEntry("what price", 0),
      canonicalEntry("what time", 0),
      canonicalEntry("what way", 0),
    ];
    const phraseAlternateSoftLinks = [
      softLinkEntry("what and if", "what an if", ["alternative"]),
      softLinkEntry("what is what", "what's what", ["alternative"]),
      softLinkEntry("what was what", "what's what", ["alternative"]),
    ];
    const TARGET_TERMS: TermInformation[] = [
      ...mainCanonicalEntries,
      ...drpPhraseCanonicalEntries,
      ...phraseAlternateSoftLinks,
    ];

    expect(termBank).toHaveLength(TARGET_TERMS.length);
    expect(termBank).toEqual(expect.arrayContaining(TARGET_TERMS));
  }, 90_000);

  test("in", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mwu-real-"));
    const attempt = await runBuild({
      requestedWords: ["in"],
      databasePath: sourceDatabasePath,
      sourceIndex,
      buildPaths: {
        outputDirectory,
        reportPath: join(outputDirectory, "build-report.json"),
        stylesPath,
      },
    });

    expect(
      attempt.ok,
      attempt.ok ? "" : JSON.stringify(attempt.report.errors),
    ).toBe(true);
    if (!attempt.ok) return;

    const termBank = await readTermBank(attempt.archivePath);

    expect(attempt.report.errors).toEqual([]);
    const mainCanonicalEntries = [
      canonicalEntry("in", 100),
      canonicalEntry("in", 100),
      canonicalEntry("in", 100),
      canonicalEntry("in", 100),
      canonicalEntry("in", 100),
      canonicalEntry("in", 100),
    ];
    const alternativeSpellingCanonicalEntries = [
      canonicalEntry("In", 0),
      canonicalEntry("IN", 0),
      canonicalEntry("in-", 0),
      canonicalEntry("in-", 0),
      canonicalEntry("in-", 0),
      canonicalEntry("-in", 0),
      canonicalEntry("-in", 0),
    ];
    const drpPhraseCanonicalEntries = [
      canonicalEntry("not in it", 0),
      canonicalEntry("in for", 0),
      canonicalEntry("in for it", 0),
    ];
    const mainToAlternativeSpellingSoftLinks = [
      softLinkEntry("in", "In", ["alternative"]),
      softLinkEntry("in", "IN", ["alternative"]),
      softLinkEntry("in", "in-", ["alternative"]),
      softLinkEntry("in", "-in", ["alternative"]),
    ];
    const vrMeanAlternateSoftLinks = [
      softLinkEntry("il-", "in-", ["alternative"]),
      softLinkEntry("im-", "in-", ["alternative"]),
      softLinkEntry("ir-", "in-", ["alternative"]),
      softLinkEntry("ino-", "in-", ["alternative"]),
    ];
    const bareAffixSoftLinks = [
      softLinkEntry("il", "in-", ["alternative"]),
      softLinkEntry("im", "in-", ["alternative"]),
      softLinkEntry("ir", "in-", ["alternative"]),
      softLinkEntry("ino", "in-", ["alternative"]),
    ];
    const TARGET_TERMS: TermInformation[] = [
      ...mainCanonicalEntries,
      ...alternativeSpellingCanonicalEntries,
      ...drpPhraseCanonicalEntries,
      ...mainToAlternativeSpellingSoftLinks,
      ...vrMeanAlternateSoftLinks,
      ...bareAffixSoftLinks,
    ];

    expect(termBank).toHaveLength(TARGET_TERMS.length);
    expect(termBank).toEqual(expect.arrayContaining(TARGET_TERMS));
  }, 90_000);

  test("o", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mwu-real-"));
    const attempt = await runBuild({
      requestedWords: ["o"],
      databasePath: sourceDatabasePath,
      sourceIndex,
      buildPaths: {
        outputDirectory,
        reportPath: join(outputDirectory, "build-report.json"),
        stylesPath,
      },
    });

    expect(
      attempt.ok,
      attempt.ok ? "" : JSON.stringify(attempt.report.errors),
    ).toBe(true);
    if (!attempt.ok) return;

    const termBank = await readTermBank(attempt.archivePath);

    expect(attempt.report.errors).toEqual([]);
    // The selected archive also contains dependency records from the dedicated
    // `o'` and `oh` rows. This test only specifies Level 1 entries generated
    // from the requested `o` row, so dependency records are intentionally
    // ignored.
    const mainCanonicalEntries = [canonicalEntry("o", 100)];
    const alternativeSpellingCanonicalEntries = [
      canonicalEntry("O", 0),
      canonicalEntry("O", 0),
      canonicalEntry("o-", 0),
      canonicalEntry("o-", 0),
      canonicalEntry("-o", 0),
      canonicalEntry("-o", 0),
      canonicalEntry("-o-", 0, null),
    ];
    const mainToAlternativeSpellingSoftLinks = [
      softLinkEntry("o", "O", ["alternative"]),
      softLinkEntry("o", "o-", ["alternative"]),
      softLinkEntry("o", "-o", ["alternative"]),
      softLinkEntry("o", "-o-", ["alternative"]),
      softLinkEntry("o", "o'", ["alternative"]),
      softLinkEntry("o", "oh", ["alternative"]),
    ];
    const vrMeanAlternateSoftLinks = [
      softLinkEntry("O", "o", ["alternative"]),
      softLinkEntry("oo-", "o-", ["alternative"]),
    ];
    const bareAffixSoftLinks = [softLinkEntry("oo", "o-", ["alternative"])];
    const cxlRefVariantSoftLinks = [
      softLinkEntry("O", "oh", ["variant spelling of"]),
    ];
    const ROOT_TERMS: TermInformation[] = [
      ...mainCanonicalEntries,
      ...alternativeSpellingCanonicalEntries,
      ...mainToAlternativeSpellingSoftLinks,
      ...vrMeanAlternateSoftLinks,
      ...bareAffixSoftLinks,
      ...cxlRefVariantSoftLinks,
    ];

    expect(termBank).toEqual(expect.arrayContaining(ROOT_TERMS));
  }, 90_000);
});
