import { describe, expect, test } from "bun:test";

import { runBuild } from "../../src/pipeline/runBuild";
import { dictionaryTagBankV3 } from "../fixture/yomitan-chrome-playwright/lib/validate-schemas.js";
import { createTestBuildRequest } from "../helpers/createTestDatabase";

const dynamicEntry = (term: string, label: string): string =>
  `<mean><div class="entry-header"><h1 class="hword">${term}</h1>` +
  `<span class="fl">${label}</span></div>` +
  '<div class="section" data-id="definition"><span class="dt">meaning</span></div></mean>';

const readArchiveJson = async (
  archivePath: string,
  fileName: string,
): Promise<unknown> => {
  const child = Bun.spawn(["unzip", "-p", archivePath, fileName], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const stdout = child.stdout;
  if (!(stdout instanceof ReadableStream)) {
    throw new Error(`Unable to read ${fileName}: stdout is not a stream`);
  }
  const text = await new Response(stdout).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    const stderr = child.stderr;
    if (!(stderr instanceof ReadableStream)) {
      throw new Error(`Unable to read ${fileName}: stderr is not a stream`);
    }
    const errorText = await new Response(stderr).text();
    throw new Error(`Unable to read ${fileName}: ${errorText}`);
  }
  return JSON.parse(text);
};

describe("functional-label archive output", () => {
  test("emits the complete fixed bank and an encountered dynamic tag", async () => {
    const request = await createTestBuildRequest({
      words: ["future"],
      rows: [
        {
          id: 1,
          encodedKey: "future",
          html: dynamicEntry("future", "future_label, 2%"),
        },
      ],
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    const tagBank = await readArchiveJson(
      attempt.archivePath,
      "tag_bank_1.json",
    );
    const termBank = await readArchiveJson(
      attempt.archivePath,
      "term_bank_1.json",
    );
    expect(Array.isArray(tagBank)).toBe(true);
    expect(Array.isArray(termBank)).toBe(true);
    if (!Array.isArray(tagBank) || !Array.isArray(termBank)) return;

    expect(
      dictionaryTagBankV3(tagBank),
      "tag_bank_1.json must satisfy the Yomitan tag-bank schema",
    ).toBe(true);

    expect(tagBank).toHaveLength(47);
    expect(tagBank).toContainEqual([
      "n",
      "partOfSpeech",
      100,
      expect.stringContaining("Noun"),
      0,
    ]);
    expect(tagBank).toContainEqual([
      "?future%5Flabel%2C_2%25",
      "unmappedPartOfSpeech",
      9000,
      expect.stringContaining("future_label, 2%"),
      0,
    ]);

    const tagNames = tagBank.flatMap((entry: unknown): readonly string[] =>
      Array.isArray(entry) && typeof entry[0] === "string" ? [entry[0]] : [],
    );
    termBank.forEach((entry: unknown): void => {
      if (!Array.isArray(entry) || typeof entry[2] !== "string") return;
      entry[2].split(" ").forEach((tag: string): void => {
        expect(
          tagNames.filter((candidate: string): boolean => candidate === tag),
          `${entry[0]} uses ${tag}`,
        ).toHaveLength(1);
      });
    });

    const record = termBank.find(
      (candidate: unknown): candidate is readonly unknown[] =>
        Array.isArray(candidate) && candidate[0] === "future",
    );
    expect(record?.[2]).toBe("?future%5Flabel%2C_2%25");
    expect(record?.[7]).toBe("");
    expect(attempt.report.conversions).toHaveLength(1);
    expect(attempt.report.conversions[0]?.findings).toContainEqual({
      kind: "unmapped-functional-label",
      rowId: 1,
      term: "future",
      rawLabel: "future_label, 2%",
      normalizedLabel: "future_label, 2%",
      tag: "?future%5Flabel%2C_2%25",
    });
    expect(attempt.report.totals.findings).toBe(1);
    expect(attempt.report.functionalLabels).toEqual({
      fixedTagCount: 46,
      dynamicFindingCount: 1,
      dynamicTags: [
        {
          tag: "?future%5Flabel%2C_2%25",
          normalizedLabel: "future_label, 2%",
          count: 1,
          samples: [{ rowId: 1, term: "future" }],
        },
      ],
    });
  });

  test("keeps full-build dynamic findings bounded and deterministic", async () => {
    const request = await createTestBuildRequest({
      words: [],
      fullDatabase: true,
      rows: Array.from({ length: 7 }, (_, index) => ({
        id: index + 1,
        encodedKey: `future-${index + 1}`,
        html: dynamicEntry(`future-${index + 1}`, "future label"),
      })),
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    expect(attempt.report.conversions).toEqual([]);
    expect(attempt.report.totals.canonicalEntries).toBe(7);
    expect(attempt.report.totals.records).toBe(7);
    expect(attempt.report.totals.findings).toBe(7);
    expect(attempt.report.functionalLabels).toEqual({
      fixedTagCount: 46,
      dynamicFindingCount: 7,
      dynamicTags: [
        {
          tag: "?future_label",
          normalizedLabel: "future label",
          count: 7,
          samples: [1, 2, 3, 4, 5].map((rowId) => ({
            rowId,
            term: `future-${rowId}`,
          })),
        },
      ],
    });
  });
});
