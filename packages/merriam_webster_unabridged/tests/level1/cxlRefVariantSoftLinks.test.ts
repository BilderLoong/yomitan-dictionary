import { describe, expect, test } from "bun:test";

import { planCanonicalOwners } from "../../src/level1/planCanonical";
import { replaceShadowedAlternateLinks } from "../../src/level1/planLinks";
import type { SoftLinkEntryPlan } from "../../src/level1/types";
import {
  buildSourceIndex,
  type SourceIndex,
  type SourceRow,
  type SourceRowSummary,
} from "../../src/source/rows";
import { linkEvidence, softLinkEntryPlan } from "../helpers/level1Factories";
import { cxlRef, definition, mean } from "../helpers/mwuHtml";

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

describe("cxl-ref variant-reference soft links", () => {
  test("emits a variant-reference link for a cross-reference-only mean", () => {
    const html = mean("O", cxlRef("variant spelling of", "oh"));
    const result = planCanonicalOwners(
      sourceRow(1, "o", html),
      sourceIndex([
        { id: 1, encodedKey: "o" },
        { id: 3, encodedKey: "oh" },
      ]),
    );

    expect(result.softLinkEntries).toEqual([
      {
        kind: "soft-link-entry",
        relationship: "cxl-ref-variant-reference-soft-link",
        lookup: "O",
        target: "oh",
        rules: ["variant spelling of"],
        evidence: [
          {
            rowId: 1,
            rowKey: "o",
            meanIndex: 0,
            phraseIndex: null,
            selector: ".cxl-ref",
            qualifier: null,
            localText: "oh",
          },
        ],
      },
    ]);
    expect(result.requiredDependencyIds).toEqual([3]);
    expect(result.canonicalEntries).toEqual([]);
    expect(result.findings).toEqual([]);
  });

  test("resolves the target from the bword href, not the visible text", () => {
    const html = mean("O", cxlRef("variant of", "1oh", "bword://oh[1]"));
    const result = planCanonicalOwners(
      sourceRow(1, "o", html),
      sourceIndex([
        { id: 1, encodedKey: "o" },
        { id: 3, encodedKey: "oh" },
      ]),
    );

    expect(result.softLinkEntries[0]).toMatchObject({
      relationship: "cxl-ref-variant-reference-soft-link",
      lookup: "O",
      target: "oh",
      rules: ["variant of"],
    });
    expect(result.softLinkEntries[0]?.evidence[0]).toMatchObject({
      localText: "1oh",
    });
  });

  test("accepts the confirmed variant family case-insensitively", () => {
    const row = sourceRow(
      21,
      "wright",
      mean("wright", cxlRef("Archaic Variant Of", "wrought")),
    );
    const index = sourceIndex([
      { id: 21, encodedKey: "wright" },
      { id: 22, encodedKey: "wrought" },
    ]);
    const result = planCanonicalOwners(row, index);

    expect(result.softLinkEntries[0]).toMatchObject({
      relationship: "cxl-ref-variant-reference-soft-link",
      lookup: "wright",
      target: "wrought",
      rules: ["Archaic Variant Of"],
    });
  });

  test("keeps an unapproved relationship as a finding without a link", () => {
    const html = mean("p", cxlRef("plural of", "ps"));
    const result = planCanonicalOwners(
      sourceRow(31, "p", html),
      sourceIndex([
        { id: 31, encodedKey: "p" },
        { id: 32, encodedKey: "ps" },
      ]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings).toEqual([
      {
        kind: "cxl-ref-not-emitted",
        rowId: 31,
        meanIndex: 0,
        relation: "plural of",
        target: "ps",
        reason: "unapproved-relation",
        preview: expect.stringContaining('class="cxl-ref"'),
      },
    ]);
  });

  test("reports a missing cross-reference target anchor", () => {
    const html =
      '<mean><h1><span class="hword">q</span></h1>' +
      '<p class="cxl-ref"><span class="cxl">variant spelling of</span></p>' +
      "</mean>";
    const result = planCanonicalOwners(
      sourceRow(41, "q", html),
      sourceIndex([{ id: 41, encodedKey: "q" }]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      relation: "variant spelling of",
      target: null,
      reason: "missing-target",
    });
  });

  test("skips a link whose target equals the lookup spelling", () => {
    const row = sourceRow(
      51,
      "oh",
      mean("oh", cxlRef("variant spelling of", "oh")),
    );
    const result = planCanonicalOwners(
      row,
      sourceIndex([{ id: 51, encodedKey: "oh" }]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      target: "oh",
      reason: "self-link",
    });
  });

  test("skips a link when no decoded source row exists for the target", () => {
    const row = sourceRow(
      61,
      "ph",
      mean("ph", cxlRef("variant spelling of", "fee")),
    );
    const result = planCanonicalOwners(
      row,
      sourceIndex([{ id: 61, encodedKey: "ph" }]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      target: "fee",
      reason: "missing-target",
    });
  });

  test("replaces a same-route alternate link while merging its evidence", () => {
    const cxlLink = softLinkEntryPlan(
      "O",
      "oh",
      ["variant spelling of"],
      "cxl-ref-variant-reference-soft-link",
      [linkEvidence(".cxl-ref")],
    );
    const alternateLink = softLinkEntryPlan(
      "O",
      "oh",
      ["alternative"],
      "vr-mean-alternate-soft-link",
      [linkEvidence(".va")],
    );

    const resolved = replaceShadowedAlternateLinks([alternateLink, cxlLink]);

    expect(
      resolved.map(({ relationship }: SoftLinkEntryPlan) => relationship),
    ).toEqual(["cxl-ref-variant-reference-soft-link"]);
    expect(resolved[0]?.evidence.map(({ selector }) => selector)).toEqual([
      ".cxl-ref",
      ".va",
    ]);
  });

  test("keeps alternate links on different routes", () => {
    const cxlLink = softLinkEntryPlan(
      "O",
      "oh",
      ["variant spelling of"],
      "cxl-ref-variant-reference-soft-link",
      [linkEvidence(".cxl-ref")],
    );
    const alternateLink = softLinkEntryPlan(
      "O",
      "om",
      ["alternative"],
      "vr-mean-alternate-soft-link",
      [linkEvidence(".va")],
    );

    const resolved = replaceShadowedAlternateLinks([alternateLink, cxlLink]);

    expect(resolved.map(({ target }) => target).toSorted()).toEqual([
      "oh",
      "om",
    ]);
  });

  test("keeps a definition-free finding when the mean has no cross-reference", () => {
    const html = mean(
      "example-only",
      '<span class="ex-sent-group">text</span>',
    );
    const result = planCanonicalOwners(
      sourceRow(71, "example-only", html),
      sourceIndex([{ id: 71, encodedKey: "example-only" }]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings.map(({ kind }) => kind)).toEqual([
      "definition-free-mean",
    ]);
  });

  test("suppresses the bare finding for a definition-free mean that also defines phrases", () => {
    const html =
      mean("O", cxlRef("variant spelling of", "oh")) +
      mean("o", definition("letter"));
    const result = planCanonicalOwners(
      sourceRow(81, "o", html),
      sourceIndex([
        { id: 81, encodedKey: "o" },
        { id: 82, encodedKey: "oh" },
      ]),
    );

    expect(result.softLinkEntries).toHaveLength(1);
    expect(result.findings).toEqual([]);
  });
});
