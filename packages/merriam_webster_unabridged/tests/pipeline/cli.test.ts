import { expect, test } from "bun:test";

import { parseCliArgs } from "../../src/pipeline/cli";

test("parses --full as a full-database build", () => {
  const result = parseCliArgs(["--full"]);

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.fullDatabase).toBe(true);
  expect(result.value.flagWords).toEqual([]);
  expect(result.value.wordsFilePath).toBeNull();
});

test("rejects --full combined with --words", () => {
  const result = parseCliArgs(["--full", "--words", "o"]);

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.message).toContain("--full");
});

test("rejects --full combined with --words-file", () => {
  const result = parseCliArgs(["--full", "--words-file", "words.txt"]);

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.message).toContain("--full");
});

test("leaves fullDatabase false for word selections", () => {
  const result = parseCliArgs(["--words", "o", "oh"]);

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.fullDatabase).toBe(false);
  expect(result.value.flagWords).toEqual(["o", "oh"]);
});
