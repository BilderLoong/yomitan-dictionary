import { expect, test } from "bun:test";

import { MWU_TAGS } from "../../src/yomitan/tagBank";

test("defines one tag-bank entry for every stable MWU definition tag", () => {
  const names = MWU_TAGS.map(({ name }) => name);

  expect(new Set(names).size).toBe(names.length);
  expect(names).toEqual(
    expect.arrayContaining([
      "abbr",
      "adj",
      "adv",
      "comb",
      "conj",
      "n",
      "phrase",
      "prep",
      "pron",
      "v",
    ]),
  );
});

test("keeps sense-local labels out of the global tag bank", () => {
  const names = new Set(MWU_TAGS.map(({ name }) => name));

  expect(names.has("archaic")).toBe(false);
  expect(names.has("slang")).toBe(false);
  expect(names.has("of a blade")).toBe(false);
  expect(names.has("transitive")).toBe(false);
});
