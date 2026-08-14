import { describe, expect, test } from "bun:test";

import { type BuildRequest, runBuild } from "../../src/pipeline/runBuild";
import { collectRequestedWords } from "../../src/pipeline/selection";
import {
  createTestBuildRequest,
  representativeRows,
} from "../helpers/createTestDatabase";
import {
  alternate,
  cxlRef,
  cxlRefs,
  definition,
  mean,
} from "../helpers/mwuHtml";

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
      (link) => link.relationship === "cxl-ref-soft-link",
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

  test("emits every valid target of a multi-target relation", async () => {
    const request = await createTestBuildRequest({
      words: ["p"],
      rows: [
        {
          id: 1,
          encodedKey: "p",
          html:
            mean("p", definition("letter")) +
            mean("P", cxlRefs("plural of", ["ps", "pees"])),
        },
        { id: 2, encodedKey: "ps", html: mean("ps", definition("letters")) },
        {
          id: 3,
          encodedKey: "pees",
          html: mean("pees", definition("letters")),
        },
      ],
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    const cxlRefLinks = attempt.report.softLinkEntries.filter(
      (link) => link.relationship === "cxl-ref-soft-link",
    );
    expect(cxlRefLinks.map(({ target }) => target)).toEqual(["ps", "pees"]);
    expect(
      attempt.records
        .filter(([term]) => term === "P")
        .map(([, , , , , definitions]) => definitions),
    ).toEqual([[["ps", ["plural of"]]], [["pees", ["plural of"]]]]);
    expect(
      attempt.report.dependencyRows.map(({ row }) => row.decodedKey).toSorted(),
    ).toEqual(["pees", "ps"]);
  });

  test("emits continuation routes with the inherited rule", async () => {
    const request = await createTestBuildRequest({
      words: ["arses"],
      rows: [
        {
          id: 1,
          encodedKey: "arses",
          html: mean(
            "arses",
            cxlRef("plural of", "arsis") + cxlRef("or of", "arse"),
          ),
        },
        {
          id: 2,
          encodedKey: "arsis",
          html: mean("arsis", definition("a foot")),
        },
        {
          id: 3,
          encodedKey: "arse",
          html: mean("arse", definition("a buttock")),
        },
      ],
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    const cxlRefLinks = attempt.report.softLinkEntries.filter(
      (link) => link.relationship === "cxl-ref-soft-link",
    );
    expect(cxlRefLinks.map(({ target, rules }) => [target, rules])).toEqual([
      ["arsis", ["plural of"]],
      ["arse", ["plural of"]],
    ]);
    expect(attempt.report.planningFindings).toEqual([]);
  });

  test("keeps a non-spelling cxl route beside the generic alternate", async () => {
    const request = await createTestBuildRequest({
      words: ["o"],
      rows: [
        {
          id: 1,
          encodedKey: "o",
          html:
            mean("o", definition("letter")) +
            mean("O", cxlRef("plural of", "oh")),
        },
        {
          id: 3,
          encodedKey: "oh",
          html: mean(
            "oh",
            definition("exclamation") + alternate("O", "or", ""),
          ),
        },
      ],
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    const oToOh = attempt.report.softLinkEntries.filter(
      (link) => link.lookup === "O" && link.target === "oh",
    );
    expect(oToOh.map(({ relationship }) => relationship).toSorted()).toEqual([
      "cxl-ref-soft-link",
      "vr-mean-alternate-soft-link",
    ]);
    expect(
      attempt.records
        .filter(([term]) => term === "O")
        .map(([, , , , , definitions]) => JSON.stringify(definitions))
        .toSorted(),
    ).toEqual([
      JSON.stringify([["oh", ["alternative"]]]),
      JSON.stringify([["oh", ["plural of"]]]),
    ]);
  });

  test("reports precise per-target cxl findings", async () => {
    const request = await createTestBuildRequest({
      words: ["q"],
      rows: [
        {
          id: 1,
          encodedKey: "q",
          html:
            mean("q", definition("letter")) +
            mean("Q", cxlRef("plural of", "missingword")),
        },
      ],
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    expect(attempt.report.planningFindings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      meanIndex: 1,
      referenceIndex: 0,
      targetIndex: 0,
      rawRelation: "plural of",
      effectiveRelation: "plural of",
      target: "missingword",
      homographNumber: null,
      reason: "target-row-absent",
    });
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
    const terms = attempt.records.map(([term]) => term);
    expect(terms).toContain("o");
    expect(terms).toContain("o'");
    expect(terms).toContain("oh");
    expect(attempt.report.errors).toEqual([]);
  });

  test("full mode excludes collegiate, medical, and thesaurus rows", async () => {
    const request = await createTestBuildRequest({
      words: [],
      rows: [
        ...representativeRows,
        {
          id: 10,
          encodedKey: "collegiate_oh",
          html: mean("oh", definition("exclamation")),
        },
        {
          id: 11,
          encodedKey: "medical_oh",
          html: mean("oh", definition("exclamation")),
        },
        {
          id: 12,
          encodedKey: "thesaurus_oh",
          html: mean("oh", definition("exclamation")),
        },
      ],
      fullDatabase: true,
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    expect(attempt.report.totals.roots).toBe(3);
    expect(attempt.report.errors).toEqual([]);
    const terms = attempt.records.map(([term]) => term);
    expect(terms).toContain("o");
    expect(terms).toContain("o'");
    expect(terms).toContain("oh");
    expect(terms).not.toContain("collegiate_oh");
    expect(terms).not.toContain("medical_oh");
    expect(terms).not.toContain("thesaurus_oh");
  });

  test("selected builds exclude collegiate, medical, and thesaurus rows", async () => {
    const request = await createTestBuildRequest({
      words: ["collegiate_oh", "medical_oh", "thesaurus_oh", "oh"],
      rows: [
        ...representativeRows,
        {
          id: 10,
          encodedKey: "collegiate_oh",
          html: mean("oh", definition("exclamation")),
        },
        {
          id: 11,
          encodedKey: "medical_oh",
          html: mean("oh", definition("exclamation")),
        },
        {
          id: 12,
          encodedKey: "thesaurus_oh",
          html: mean("oh", definition("exclamation")),
        },
      ],
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    expect(attempt.report.errors).toEqual([]);
    expect(attempt.report.rootRows.map(({ decodedKey }) => decodedKey)).toEqual(
      ["oh"],
    );
    expect(attempt.report.planningFindings).toContainEqual({
      kind: "non-unabridged-row-excluded",
      rowId: 10,
      rowKey: "collegiate_oh",
    });
    expect(attempt.report.planningFindings).toContainEqual({
      kind: "non-unabridged-row-excluded",
      rowId: 11,
      rowKey: "medical_oh",
    });
    expect(attempt.report.planningFindings).toContainEqual({
      kind: "non-unabridged-row-excluded",
      rowId: 12,
      rowKey: "thesaurus_oh",
    });
    const terms = attempt.records.map(([term]) => term);
    expect(terms).toContain("oh");
    expect(terms).not.toContain("collegiate_oh");
    expect(terms).not.toContain("medical_oh");
    expect(terms).not.toContain("thesaurus_oh");
  });

  test("full mode drops soft links whose target emits no entry", async () => {
    const request = await createTestBuildRequest({
      words: [],
      rows: [
        {
          id: 1,
          encodedKey: "alpha",
          html:
            mean("alpha", definition("first letter")) +
            mean("aleph", definition("a letter")),
        },
        // Dedicated row for aleph exists but is definition-free, so the
        // embedded aleph mean defers and no canonical aleph term is emitted.
        { id: 2, encodedKey: "aleph", html: mean("aleph", "") },
      ],
      fullDatabase: true,
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    expect(attempt.report.errors).toEqual([]);
    expect(attempt.report.planningFindings).toContainEqual({
      kind: "soft-link-target-not-emitted",
      lookup: "alpha",
      target: "aleph",
    });
    const terms = attempt.records.map(([term]) => term);
    expect(terms).toContain("alpha");
    expect(terms).not.toContain("aleph");
  });

  test("selected mode drops soft links whose target emits no entry", async () => {
    const request = await createTestBuildRequest({
      words: ["alpha"],
      rows: [
        {
          id: 1,
          encodedKey: "alpha",
          html:
            mean("alpha", definition("first letter")) +
            mean("aleph", definition("a letter")),
        },
        { id: 2, encodedKey: "aleph", html: mean("aleph", "") },
      ],
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) throw new Error(JSON.stringify(attempt.report.errors));

    expect(attempt.report.errors).toEqual([]);
    expect(attempt.report.planningFindings).toContainEqual({
      kind: "soft-link-target-not-emitted",
      lookup: "alpha",
      target: "aleph",
    });
    const terms = attempt.records.map(([term]) => term);
    expect(terms).toContain("alpha");
    expect(terms).not.toContain("aleph");
  });
});
