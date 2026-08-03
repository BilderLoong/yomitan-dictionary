import { describe, expect, test } from "bun:test";

import {
  buildSourceIndex,
  type SourceIndex,
  type SourceRow,
  type SourceRowSummary,
} from "../../src/source/rows";
import { planCanonicalOwners } from "../../src/level1/planCanonical";
import type {
  CanonicalPhrasePlan,
  CanonicalPlan,
} from "../../src/level1/types";
import { definition, example, mean, phrase, runOn } from "../helpers/mwuHtml";

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

const isCanonicalPhrase = (plan: CanonicalPlan): plan is CanonicalPhrasePlan =>
  plan.kind === "canonical-phrase";

describe("canonical defined phrases", () => {
  test("plans each definition-bearing phrase and rejects example-only text", () => {
    const firstPhrase = phrase("take a bath", definition("bathe"));
    const secondPhrase = phrase("take the word", definition("speak"));
    const html = mean(
      "take",
      [
        definition("receive"),
        firstPhrase,
        secondPhrase,
        example("take a walk"),
        runOn("taker"),
      ].join(""),
    );

    const result = planCanonicalOwners(
      sourceRow(10, "take", html),
      sourceIndex([{ id: 10, encodedKey: "take" }]),
    );
    const phrases = result.canonical.filter(isCanonicalPhrase);

    expect(phrases.map(({ term }) => term)).toEqual([
      "take a bath",
      "take the word",
    ]);
    expect(phrases.map(({ parentTerm }) => parentTerm)).toEqual([
      "take",
      "take",
    ]);
    expect(phrases.map(({ source }) => source.ownerHtml)).toEqual([
      firstPhrase,
      secondPhrase,
    ]);
    expect(phrases.map(({ source }) => source.phraseIndex)).toEqual([0, 1]);
  });

  test("isolates adjacent phrase definitions within one collection", () => {
    const firstPhrase = phrase("first phrase", definition("first meaning"));
    const secondPhrase = phrase("second phrase", definition("second meaning"));
    const collection =
      '<div class="dro">' +
      '<span class="drp">first phrase</span>' +
      definition("first meaning") +
      '<span class="drp">example only</span>' +
      example("not a definition") +
      '<span class="drp">second phrase</span>' +
      definition("second meaning") +
      "</div>";

    const result = planCanonicalOwners(
      sourceRow(12, "parent", mean("parent", collection)),
      sourceIndex([{ id: 12, encodedKey: "parent" }]),
    );
    const phrases = result.canonical.filter(isCanonicalPhrase);

    expect(phrases.map(({ term }) => term)).toEqual([
      "first phrase",
      "second phrase",
    ]);
    expect(phrases.map(({ source }) => source.phraseIndex)).toEqual([0, 2]);
    expect(phrases.map(({ source }) => source.ownerHtml)).toEqual([
      firstPhrase,
      secondPhrase,
    ]);
  });

  test("preserves direct text and comments inside each phrase owner range", () => {
    const firstOwner =
      '<div class="dro"><span class="drp">first phrase</span>' +
      "<!--keep this comment-->literal " +
      definition("first meaning") +
      " trailing text</div>";
    const secondOwner = phrase("second phrase", definition("second meaning"));
    const collection =
      '<div class="dro"><span class="drp">first phrase</span>' +
      "<!--keep this comment-->literal " +
      definition("first meaning") +
      " trailing text" +
      secondOwner.slice('<div class="dro">'.length);

    const result = planCanonicalOwners(
      sourceRow(16, "parent", mean("parent", collection)),
      sourceIndex([{ id: 16, encodedKey: "parent" }]),
    );
    const phrases = result.canonical.filter(isCanonicalPhrase);

    expect(phrases.map(({ term }) => term)).toEqual([
      "first phrase",
      "second phrase",
    ]);
    expect(phrases.map(({ source }) => source.ownerHtml)).toEqual([
      firstOwner,
      secondOwner,
    ]);
  });
});
