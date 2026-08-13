import { describe, expect, test } from "bun:test";

import {
  decodeDynamicTag,
  fixedFunctionalTagDefinitions,
  mappedFunctionalLabelNames,
  resolveFunctionalLabel,
  summarizeDynamicFunctionalLabels,
  type UnmappedFunctionalLabelFinding,
  validateFunctionalLabelCoverage,
} from "../../src/conversion/functionalLabels";

describe("functional-label metadata", () => {
  test("covers the complete current owned-label inventory", () => {
    const labels = mappedFunctionalLabelNames();
    const fixedTags = new Set(
      fixedFunctionalTagDefinitions().map(({ name }) => name),
    );

    expect(labels).toHaveLength(98);
    expect(validateFunctionalLabelCoverage(labels)).toEqual([]);
    expect(
      labels.every((label) => {
        const resolution = resolveFunctionalLabel(label);
        return (
          resolution.kind === "fixed" &&
          resolution.tags.every((tag) => fixedTags.has(tag))
        );
      }),
    ).toBe(true);
  });

  test("keeps fixed metadata clear, unique, and in semantic order", () => {
    const tags = fixedFunctionalTagDefinitions();
    const tag = (name: string) => {
      const found = tags.find(({ name: candidate }) => candidate === name);
      if (found === undefined) throw new Error(`Missing fixed tag: ${name}`);
      return found;
    };
    const orders = tags.map(({ order }) => order);

    expect(tags).toHaveLength(46);
    expect(orders).toEqual(orders.toSorted((left, right) => left - right));
    expect(new Set(orders).size).toBe(orders.length);
    expect(
      tags.every(
        ({ category, note, score }) =>
          category === "partOfSpeech" && note.trim().length > 0 && score === 0,
      ),
    ).toBe(true);
    expect(tag("transitive").order).toBeLessThan(tag("prefix").order);
    expect(tag("takes-singular-verb").note).not.toContain("Usually");
    expect(tag("takes-plural-verb").note).not.toContain("Usually");
  });

  const mappingCases: readonly (readonly [string, readonly string[]])[] = [
    ["noun", ["n"]],
    ["verb, transitive + intransitive", ["v", "transitive", "intransitive"]],
    ["definite article", ["article", "definite"]],
    [
      "noun plural but usually singular in construction",
      ["n", "plural-form", "usually-takes-singular-verb"],
    ],
    ["noun plural suffix", ["suffix", "plural-noun-forming"]],
    ["adjective or adverb or conjunction or noun", ["n", "adj", "adv", "conj"]],
    ["service mark", ["service-mark"]],
  ];

  test.each(mappingCases)(
    "maps %s to atomic tags",
    (label: string, expected: readonly string[]) => {
      const resolution = resolveFunctionalLabel(label);

      expect(resolution.kind).toBe("fixed");
      if (resolution.kind !== "fixed") return;
      expect(resolution.tags).toEqual(expected);
    },
  );

  test("keeps absence separate from an unmapped label", () => {
    expect(resolveFunctionalLabel(null)).toMatchObject({
      kind: "absent",
      tags: [],
    });
    expect(resolveFunctionalLabel("   \n\t")).toMatchObject({
      kind: "absent",
      tags: [],
    });
  });

  test("encodes an unknown label reversibly and without collisions", () => {
    const first = resolveFunctionalLabel("Future_label, 2%");
    const second = resolveFunctionalLabel("Future label, 2%");

    expect(first.kind).toBe("dynamic");
    expect(second.kind).toBe("dynamic");
    if (first.kind !== "dynamic" || second.kind !== "dynamic") return;

    expect(first.tags).toEqual(["?Future%5Flabel%2C_2%25"]);
    expect(second.tags).toEqual(["?Future_label%2C_2%25"]);
    expect(first.tags).not.toEqual(second.tags);
    expect(decodeDynamicTag(first.dynamicTag.name)).toEqual({
      kind: "decoded",
      value: "Future_label, 2%",
    });
    expect(first.dynamicTag).toMatchObject({
      category: "unmappedPartOfSpeech",
      order: 9000,
      score: 0,
    });
    expect(first.dynamicTag.note).toContain("Future_label, 2%");
  });

  test("summarizes many dynamic findings with bounded sorted samples", () => {
    const findings = Array.from(
      { length: 32_000 },
      (_, index): UnmappedFunctionalLabelFinding => {
        const rowId = 32_000 - index;
        return {
          kind: "unmapped-functional-label",
          rowId,
          term: `future-${rowId}`,
          rawLabel: "future label",
          normalizedLabel: "future label",
          tag: "?future_label",
        };
      },
    );

    expect(summarizeDynamicFunctionalLabels(findings)).toEqual([
      {
        tag: "?future_label",
        normalizedLabel: "future label",
        count: 32_000,
        samples: [1, 2, 3, 4, 5].map((rowId) => ({
          rowId,
          term: `future-${rowId}`,
        })),
      },
    ]);
  });
});
