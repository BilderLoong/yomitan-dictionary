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

  test("emits the o-row variant reference as a soft-link record", async () => {
    const request = await createTestBuildRequest({
      words: ["o"],
      rows: representativeRows,
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    const cxlRefLink = attempt.report.softLinkEntries.find(
      (link) => link.relationship === "cxl-ref-variant-reference-soft-link",
    );
    expect(cxlRefLink).toMatchObject({
      lookup: "O",
      target: "oh",
      rules: ["variant spelling of"],
    });
    expect(
      attempt.report.softLinkEntries.filter(
        (link) => link.lookup === "O" && link.target === "oh",
      ),
    ).toHaveLength(1);
    expect(
      cxlRefLink?.evidence.map(({ selector }) => selector).toSorted(),
    ).toEqual([".cxl-ref", ".vr"]);
    expect(
      attempt.records.some(
        ([term, , , , , definitions]) =>
          term === "O" &&
          JSON.stringify(definitions) ===
            JSON.stringify([["oh", ["variant spelling of"]]]),
      ),
    ).toBe(true);
    expect(
      attempt.report.planningFindings.some(
        (finding) => finding.kind === "definition-free-mean",
      ),
    ).toBe(false);
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
});
