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
import { cxlRef, cxlRefs, definition, mean } from "../helpers/mwuHtml";

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

describe("cxl-ref soft links", () => {
  test("emits a cxl-ref soft link for a cross-reference-only mean", () => {
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
        relationship: "cxl-ref-soft-link",
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
            referenceIndex: 0,
            targetIndex: 0,
            rawRelation: "variant spelling of",
            effectiveRelation: "variant spelling of",
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
      relationship: "cxl-ref-soft-link",
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
      relationship: "cxl-ref-soft-link",
      lookup: "wright",
      target: "wrought",
      rules: ["Archaic Variant Of"],
    });
  });

  test("emits a complete relation for a cross-reference-only mean", () => {
    const html = mean("p", cxlRef("plural of", "ps"));
    const result = planCanonicalOwners(
      sourceRow(31, "p", html),
      sourceIndex([
        { id: 31, encodedKey: "p" },
        { id: 32, encodedKey: "ps" },
      ]),
    );

    expect(result.softLinkEntries).toEqual([
      {
        kind: "soft-link-entry",
        relationship: "cxl-ref-soft-link",
        lookup: "p",
        target: "ps",
        rules: ["plural of"],
        evidence: [
          {
            rowId: 31,
            rowKey: "p",
            meanIndex: 0,
            phraseIndex: null,
            selector: ".cxl-ref",
            qualifier: null,
            localText: "ps",
            referenceIndex: 0,
            targetIndex: 0,
            rawRelation: "plural of",
            effectiveRelation: "plural of",
          },
        ],
      },
    ]);
    expect(result.requiredDependencyIds).toEqual([32]);
    expect(result.findings).toEqual([]);
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
      referenceIndex: 0,
      targetIndex: 0,
      rawRelation: "variant spelling of",
      effectiveRelation: "variant spelling of",
      target: null,
      homographNumber: null,
      reason: "missing-target-href",
    });
  });

  test("skips a link whose target equals the lookup spelling", () => {
    const row = sourceRow(
      51,
      "oh",
      mean("oh", cxlRef("variant spelling of", "1oh", "bword://oh[1]")),
    );
    const result = planCanonicalOwners(
      row,
      sourceIndex([{ id: 51, encodedKey: "oh" }]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      target: "oh",
      homographNumber: "1",
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
      reason: "target-row-absent",
    });
  });

  test("processes every valid target in a multi-target reference", () => {
    const html = mean("p", cxlRefs("plural of", ["ps", "pees"]));
    const result = planCanonicalOwners(
      sourceRow(91, "p", html),
      sourceIndex([
        { id: 91, encodedKey: "p" },
        { id: 92, encodedKey: "ps" },
        { id: 93, encodedKey: "pees" },
      ]),
    );

    expect(result.softLinkEntries).toEqual([
      {
        kind: "soft-link-entry",
        relationship: "cxl-ref-soft-link",
        lookup: "p",
        target: "ps",
        rules: ["plural of"],
        evidence: [
          {
            rowId: 91,
            rowKey: "p",
            meanIndex: 0,
            phraseIndex: null,
            selector: ".cxl-ref",
            qualifier: null,
            localText: "ps",
            referenceIndex: 0,
            targetIndex: 0,
            rawRelation: "plural of",
            effectiveRelation: "plural of",
          },
        ],
      },
      {
        kind: "soft-link-entry",
        relationship: "cxl-ref-soft-link",
        lookup: "p",
        target: "pees",
        rules: ["plural of"],
        evidence: [
          {
            rowId: 91,
            rowKey: "p",
            meanIndex: 0,
            phraseIndex: null,
            selector: ".cxl-ref",
            qualifier: null,
            localText: "pees",
            referenceIndex: 0,
            targetIndex: 1,
            rawRelation: "plural of",
            effectiveRelation: "plural of",
          },
        ],
      },
    ]);
    expect(result.requiredDependencyIds).toEqual([92, 93]);
    expect(result.findings).toEqual([]);
  });

  test("keeps valid sibling targets when one target has no row", () => {
    const html = mean("p", cxlRefs("plural of", ["ps", "missingword"]));
    const result = planCanonicalOwners(
      sourceRow(91, "p", html),
      sourceIndex([
        { id: 91, encodedKey: "p" },
        { id: 92, encodedKey: "ps" },
      ]),
    );

    expect(result.softLinkEntries.map(({ target }) => target)).toEqual(["ps"]);
    expect(result.requiredDependencyIds).toEqual([92]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      target: "missingword",
      reason: "target-row-absent",
    });
  });

  test("keeps valid sibling targets when one target self-links", () => {
    const html = mean("ps", cxlRefs("plural of", ["ps", "pea"]));
    const result = planCanonicalOwners(
      sourceRow(91, "ps", html),
      sourceIndex([
        { id: 91, encodedKey: "ps" },
        { id: 93, encodedKey: "pea" },
      ]),
    );

    expect(result.softLinkEntries.map(({ target }) => target)).toEqual(["pea"]);
    expect(result.requiredDependencyIds).toEqual([93]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      target: "ps",
      reason: "self-link",
    });
  });

  test("inherits the nearest preceding complete relation phrase", () => {
    const html = mean(
      "arses",
      cxlRef("plural of", "arsis") + cxlRef("Or   Of", "arse"),
    );
    const result = planCanonicalOwners(
      sourceRow(101, "arses", html),
      sourceIndex([
        { id: 101, encodedKey: "arses" },
        { id: 102, encodedKey: "arsis" },
        { id: 103, encodedKey: "arse" },
      ]),
    );

    expect(
      result.softLinkEntries.map(({ target, rules }) => ({ target, rules })),
    ).toEqual([
      { target: "arsis", rules: ["plural of"] },
      { target: "arse", rules: ["plural of"] },
    ]);
    expect(
      result.softLinkEntries.map(({ evidence }: SoftLinkEntryPlan) => ({
        referenceIndex: evidence[0]?.referenceIndex,
        targetIndex: evidence[0]?.targetIndex,
        rawRelation: evidence[0]?.rawRelation,
        effectiveRelation: evidence[0]?.effectiveRelation,
      })),
    ).toEqual([
      {
        referenceIndex: 0,
        targetIndex: 0,
        rawRelation: "plural of",
        effectiveRelation: "plural of",
      },
      {
        referenceIndex: 1,
        targetIndex: 0,
        rawRelation: "Or   Of",
        effectiveRelation: "plural of",
      },
    ]);
    expect(result.requiredDependencyIds).toEqual([102, 103]);
    expect(result.findings).toEqual([]);
  });

  test("rejects a continuation with no preceding complete relation", () => {
    const html = mean("foo", cxlRef("or of", "bar"));
    const result = planCanonicalOwners(
      sourceRow(111, "foo", html),
      sourceIndex([
        { id: 111, encodedKey: "foo" },
        { id: 112, encodedKey: "bar" },
      ]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      rawRelation: "or of",
      target: "bar",
      reason: "orphan-continuation",
    });
  });

  test("keeps a complete phrase containing or as its own relation", () => {
    const html = mean("up", cxlRef("or else", "down"));
    const result = planCanonicalOwners(
      sourceRow(121, "up", html),
      sourceIndex([
        { id: 121, encodedKey: "up" },
        { id: 122, encodedKey: "down" },
      ]),
    );

    expect(result.softLinkEntries[0]).toMatchObject({
      target: "down",
      rules: ["or else"],
    });
    expect(result.findings).toEqual([]);
  });

  test("keeps a non-spelling cxl route beside the generic alternate", () => {
    const cxlLink = softLinkEntryPlan(
      "p",
      "ps",
      ["plural of"],
      "cxl-ref-soft-link",
      [linkEvidence(".cxl-ref")],
    );
    const alternateLink = softLinkEntryPlan(
      "p",
      "ps",
      ["alternative"],
      "vr-mean-alternate-soft-link",
      [linkEvidence(".va")],
    );

    const resolved = replaceShadowedAlternateLinks([alternateLink, cxlLink]);

    expect(
      resolved
        .map(({ relationship }: SoftLinkEntryPlan) => relationship)
        .toSorted(),
    ).toEqual(["cxl-ref-soft-link", "vr-mean-alternate-soft-link"]);
  });

  test("shadows a generic alternate for a bare spelling relation", () => {
    const cxlLink = softLinkEntryPlan(
      "O",
      "oh",
      ["spelling of"],
      "cxl-ref-soft-link",
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
    ).toEqual(["cxl-ref-soft-link"]);
    expect(resolved[0]?.evidence.map(({ selector }) => selector)).toEqual([
      ".cxl-ref",
      ".va",
    ]);
  });

  test("merges shadowed evidence only into spelling or variant routes", () => {
    const pluralLink = softLinkEntryPlan(
      "O",
      "oh",
      ["plural of"],
      "cxl-ref-soft-link",
      [linkEvidence(".cxl-ref")],
    );
    const variantLink = softLinkEntryPlan(
      "O",
      "oh",
      ["variant of"],
      "cxl-ref-soft-link",
      [linkEvidence(".cxl-ref")],
    );
    const alternateLink = softLinkEntryPlan(
      "O",
      "oh",
      ["alternative"],
      "vr-mean-alternate-soft-link",
      [linkEvidence(".va")],
    );

    const resolved = replaceShadowedAlternateLinks([
      alternateLink,
      pluralLink,
      variantLink,
    ]);

    expect(
      resolved.map(({ relationship }: SoftLinkEntryPlan) => relationship),
    ).toEqual(["cxl-ref-soft-link", "cxl-ref-soft-link"]);
    const pluralOut = resolved.find(
      (link: SoftLinkEntryPlan) => link.rules[0] === "plural of",
    );
    const variantOut = resolved.find(
      (link: SoftLinkEntryPlan) => link.rules[0] === "variant of",
    );
    expect(pluralOut?.evidence.map(({ selector }) => selector)).toEqual([
      ".cxl-ref",
    ]);
    expect(variantOut?.evidence.map(({ selector }) => selector)).toEqual([
      ".cxl-ref",
      ".va",
    ]);
  });

  test("reports an empty relation phrase", () => {
    const html =
      '<mean><h1><span class="hword">q</span></h1>' +
      '<p class="cxl-ref"><span class="cxl"></span>' +
      '<a href="bword://x" class="cxt">x</a></p></mean>';
    const result = planCanonicalOwners(
      sourceRow(131, "q", html),
      sourceIndex([
        { id: 131, encodedKey: "q" },
        { id: 132, encodedKey: "x" },
      ]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      referenceIndex: 0,
      targetIndex: 0,
      rawRelation: null,
      effectiveRelation: null,
      target: "x",
      homographNumber: null,
      reason: "empty-relation",
    });
  });

  test("emits one empty-relation finding per target anchor", () => {
    const html =
      '<mean><h1><span class="hword">q</span></h1>' +
      '<p class="cxl-ref"><span class="cxl"></span>' +
      '<a href="bword://x" class="cxt">x</a>, ' +
      '<a href="bword://y[2]" class="cxt">2y</a></p></mean>';
    const result = planCanonicalOwners(
      sourceRow(131, "q", html),
      sourceIndex([
        { id: 131, encodedKey: "q" },
        { id: 132, encodedKey: "x" },
        { id: 133, encodedKey: "y" },
      ]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]).toMatchObject({
      referenceIndex: 0,
      targetIndex: 0,
      target: "x",
      homographNumber: null,
      reason: "empty-relation",
    });
    expect(result.findings[1]).toMatchObject({
      referenceIndex: 0,
      targetIndex: 1,
      target: "y",
      homographNumber: "2",
      reason: "empty-relation",
    });
  });

  test("rejects an unsupported target href scheme", () => {
    const html = mean(
      "q",
      '<p class="cxl-ref"><span class="cxl">variant of</span>' +
        '<a href="gdlookup://localhost/q" class="cxt">q</a></p>',
    );
    const result = planCanonicalOwners(
      sourceRow(141, "q", html),
      sourceIndex([
        { id: 141, encodedKey: "q" },
        { id: 142, encodedKey: "q" },
      ]),
    );

    expect(result.softLinkEntries).toEqual([]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      kind: "cxl-ref-not-emitted",
      target: null,
      homographNumber: null,
      reason: "unsupported-target-href",
    });
  });

  test("keeps target homograph identity as report evidence", () => {
    const html = mean("b", cxlRef("variant of", "2booty", "bword://booty[2]"));
    const result = planCanonicalOwners(
      sourceRow(151, "b", html),
      sourceIndex([
        { id: 151, encodedKey: "b" },
        { id: 152, encodedKey: "booty" },
      ]),
    );

    expect(result.softLinkEntries[0]).toMatchObject({
      target: "booty",
      rules: ["variant of"],
    });
    expect(result.softLinkEntries[0]?.evidence[0]).toMatchObject({
      localText: "2booty",
      targetHomographNumber: "2",
    });
    expect(result.findings).toEqual([]);
  });

  test("decodes the href before stripping the homograph suffix", () => {
    const html = mean(
      "b",
      cxlRef("variant of", "2booty", "bword://booty%5B2%5D"),
    );
    const result = planCanonicalOwners(
      sourceRow(151, "b", html),
      sourceIndex([
        { id: 151, encodedKey: "b" },
        { id: 152, encodedKey: "booty" },
      ]),
    );

    expect(result.softLinkEntries[0]).toMatchObject({
      target: "booty",
      rules: ["variant of"],
    });
    expect(result.softLinkEntries[0]?.evidence[0]).toMatchObject({
      localText: "2booty",
      targetHomographNumber: "2",
    });
    expect(result.findings).toEqual([]);
  });

  test("replaces a same-route alternate link while merging its evidence", () => {
    const cxlLink = softLinkEntryPlan(
      "O",
      "oh",
      ["variant spelling of"],
      "cxl-ref-soft-link",
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
    ).toEqual(["cxl-ref-soft-link"]);
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
      "cxl-ref-soft-link",
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
