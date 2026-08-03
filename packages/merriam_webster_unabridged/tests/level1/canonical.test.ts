import { describe, expect, test } from "bun:test";

import {
  buildSourceIndex,
  type SourceIndex,
  type SourceRow,
  type SourceRowSummary,
} from "../../src/source/rows";
import {
  extractSearchableHeadword,
  planCanonicalOwners,
} from "../../src/level1/planCanonical";
import { definition, mean } from "../helpers/mwuHtml";

const sourceRow = (
  id: number,
  decodedKey: string,
  html: string,
): SourceRow => ({
  id,
  encodedKey: encodeURIComponent(decodedKey),
  decodedKey,
  html,
});

const sourceIndex = (rows: readonly SourceRowSummary[]): SourceIndex =>
  buildSourceIndex(rows);

describe("canonical lexical ownership", () => {
  test("keeps same-spelling means separate and defers a dedicated target", () => {
    const row = sourceRow(
      1,
      "o",
      mean("o", definition("letter name")) +
        mean("O", definition("variant form")) +
        mean("o'", definition("apostrophe form")),
    );
    const index = sourceIndex([
      { id: 1, encodedKey: "o" },
      { id: 2, encodedKey: "o%27" },
    ]);

    const result = planCanonicalOwners(row, index);

    expect(result.canonical.map(({ kind, term }) => [kind, term])).toEqual([
      ["canonical-lexical", "o"],
      ["canonical-lexical", "O"],
    ]);
    expect(result.decisions.map(({ rule }) => rule)).toEqual([
      "case-1-current-row",
      "case-2-embedded",
      "case-3-dedicated-row",
    ]);
    expect(result.requiredDependencyIds).toEqual([2]);
  });

  test("does not merge independent same-spelling means", () => {
    const row = sourceRow(
      7,
      "set",
      mean("set", definition("put in position")) +
        mean("set", definition("fixed or established")),
    );
    const result = planCanonicalOwners(
      row,
      sourceIndex([{ id: 7, encodedKey: "set" }]),
    );

    expect(result.canonical.map(({ term }) => term)).toEqual(["set", "set"]);
    expect(result.decisions.map(({ meanIndex }) => meanIndex)).toEqual([0, 1]);
    expect(result.canonical.map(({ source }) => source.ownerHtml)).toEqual([
      mean("set", definition("put in position")),
      mean("set", definition("fixed or established")),
    ]);
  });

  test("removes only confirmed identity markup and reports unfamiliar markup", () => {
    const decoratedMean = mean(
      "<sup>1</sup> pro\u00b7cess",
      definition("a series of actions"),
    );
    const unfamiliarMean = mean("<em>in</em>-", definition("prefix"));
    const result = planCanonicalOwners(
      sourceRow(11, "process", decoratedMean + unfamiliarMean),
      sourceIndex([{ id: 11, encodedKey: "process" }]),
    );

    expect(result.canonical.map(({ term }) => term)).toEqual([
      "process",
      "in-",
    ]);
    expect(result.canonical[0]).toMatchObject({
      displayHeadword: "1 pro\u00b7cess",
      source: { ownerHtml: decoratedMean },
    });
    expect(result.findings).toEqual([
      {
        kind: "headword-markup",
        rowId: 11,
        meanIndex: 1,
        preview: '<span class="hword"><em>in</em>-</span>',
      },
    ]);
  });

  test("accepts known breakpoint wrappers without changing their visible text", () => {
    const breakpointMean = mean(
      '<span class="breakpoints"><span class="breakpoint">ha</span>' +
        '<span class="breakpoint">nd</span></span> ' +
        '<span class="breakpoints"><span class="breakpoint">ch</span>' +
        '<span class="breakpoint">eese</span></span>',
      definition("a kind of cheese"),
    );
    const result = planCanonicalOwners(
      sourceRow(13, "hand cheese", breakpointMean),
      sourceIndex([{ id: 13, encodedKey: "hand%20cheese" }]),
    );

    expect(result.canonical.map(({ term }) => term)).toEqual(["hand cheese"]);
    expect(result.findings).toEqual([]);
  });

  test("rejects absent and blank searchable identities as findings", () => {
    const missingHeadword =
      "<mean><h1>no local headword</h1>" +
      definition("missing identity") +
      "</mean>";
    const result = planCanonicalOwners(
      sourceRow(
        14,
        "parent",
        missingHeadword + mean("  ", definition("blank identity")),
      ),
      sourceIndex([{ id: 14, encodedKey: "parent" }]),
    );

    expect(result.canonical).toEqual([]);
    expect(result.decisions).toEqual([
      {
        rowId: 14,
        rowKey: "parent",
        meanIndex: 0,
        searchableHeadword: null,
        rule: "unresolved-headword",
        dedicatedRowId: null,
      },
      {
        rowId: 14,
        rowKey: "parent",
        meanIndex: 1,
        searchableHeadword: null,
        rule: "unresolved-headword",
        dedicatedRowId: null,
      },
    ]);
    expect(result.findings.map(({ kind }) => kind)).toEqual([
      "headword-markup",
      "headword-markup",
    ]);
  });
});

test("extracts a conservative searchable headword from a hword fragment", () => {
  expect(
    extractSearchableHeadword(
      '<span class="hword"><sup>2</sup> -o\u00b7- form</span>',
    ),
  ).toBe("-o- form");
  expect(
    extractSearchableHeadword(
      '<span class="hword"><span class="breakpoints"><sup>2</sup>' +
        '<span class="breakpoint">pro</span></span>\u00b7cess</span>',
    ),
  ).toBe("process");
});
