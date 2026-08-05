import { expect, test } from "bun:test";

import { planPhraseAlternateSoftLinks } from "../../src/level1/planLinks";
import { drpPhraseCanonicalEntryPlan } from "../helpers/level1Factories";

test("binds a phrase alternate soft link to its phrase", () => {
  const result = planPhraseAlternateSoftLinks(
    drpPhraseCanonicalEntryPlan(
      "take the word",
      "take up the word",
      "or less commonly",
    ),
  );

  expect(result.softLinkEntries).toEqual([
    expect.objectContaining({
      relationship: "phrase-alternate-soft-link",
      lookup: "take up the word",
      target: "take the word",
      rules: ["alternative"],
    }),
  ]);
});
