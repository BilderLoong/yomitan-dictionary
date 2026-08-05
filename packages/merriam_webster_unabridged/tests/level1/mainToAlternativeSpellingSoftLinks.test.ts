import { expect, test } from "bun:test";

import { planMainToAlternativeSpellingSoftLinks } from "../../src/level1/planLinks";
import { decision } from "../helpers/level1Factories";

test("creates main-to-alternative-spelling soft links without definitions", () => {
  const links = planMainToAlternativeSpellingSoftLinks({
    rowKey: "o",
    decisions: [
      decision("O", "alternative-spelling-canonical-entry", null),
      decision("oh", "alternative-spelling-canonical-entry", 22),
    ],
  });

  expect(
    links.map(({ lookup, target, rules }) => ({
      lookup,
      target,
      rules,
    })),
  ).toEqual([
    { lookup: "o", target: "O", rules: [] },
    { lookup: "o", target: "oh", rules: [] },
  ]);
});
