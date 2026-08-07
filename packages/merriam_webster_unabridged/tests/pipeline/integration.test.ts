import { describe, expect, test } from "bun:test";

import { type BuildRequest, runBuild } from "../../src/pipeline/runBuild";
import { collectRequestedWords } from "../../src/pipeline/selection";
import {
  createTestBuildRequest,
  representativeRows,
} from "../helpers/createTestDatabase";

const createSelectedRequest = async (input: {
  readonly flagWords: readonly string[];
  readonly wordsFile: { readonly text: string } | null;
}): Promise<BuildRequest> => {
  const selection = collectRequestedWords(input);
  if (!selection.ok) throw new Error(JSON.stringify(selection.error));

  const request = await createTestBuildRequest({
    words: selection.value,
    rows: representativeRows,
  });
  return { ...request, requestedWords: selection.value };
};

describe("selected-word build", () => {
  test("builds file-only and combined selections in effective order", async () => {
    const fileOnly = await createSelectedRequest({
      flagWords: [],
      wordsFile: { text: " o\n\n" },
    });
    const combined = await createSelectedRequest({
      flagWords: ["o", "o"],
      wordsFile: { text: " o\n" },
    });

    const fileOnlyAttempt = await runBuild(fileOnly);
    const combinedAttempt = await runBuild(combined);

    expect(fileOnlyAttempt.ok).toBe(true);
    expect(combinedAttempt.ok).toBe(true);
    expect(fileOnlyAttempt.report.requestedWords).toEqual(["o"]);
    expect(combinedAttempt.report.requestedWords).toEqual(["o"]);
  });

  test("builds only requested roots plus dedicated dependencies", async () => {
    const request = await createTestBuildRequest({
      words: ["o"],
      rows: representativeRows,
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    expect(attempt.report.requestedWords).toEqual(["o"]);
    expect(
      attempt.report.dependencyRows.map(({ row }) => row.decodedKey),
    ).toEqual(["o'", "oh"]);
    expect(attempt.records.some(([term]) => term === "unrequested")).toBe(
      false,
    );
    expect(attempt.archivePath.endsWith("Merriam Webster Unabridged.zip")).toBe(
      true,
    );
  });

  test("records missing roots as fatal without an archive", async () => {
    const request = await createTestBuildRequest({
      words: ["missing"],
      rows: representativeRows,
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(false);
    if (attempt.ok) return;

    expect(attempt.report.errors).toEqual([
      { kind: "missing-root", word: "missing" },
    ]);
    expect(attempt.report.archivePath).toBeNull();
  });

  test("full mode plans every row of the database", async () => {
    const request = await createTestBuildRequest({
      words: [],
      rows: representativeRows,
      fullDatabase: true,
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    expect(attempt.report.totals.roots).toBe(3);
    expect(attempt.report.totals.records).toBe(attempt.records.length);
    expect(attempt.report.canonicalEntryPlans).toEqual([]);
    expect(attempt.report.conversions).toEqual([]);
    expect(attempt.report.coverage).toEqual([]);
    const terms = attempt.records.map(([term]) => term);
    expect(terms).toContain("o");
    expect(terms).toContain("o'");
    expect(terms).toContain("oh");
    expect(attempt.report.errors).toEqual([]);
  });
});
