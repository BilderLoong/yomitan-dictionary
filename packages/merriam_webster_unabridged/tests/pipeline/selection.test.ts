import { describe, expect, test } from "bun:test";

import { collectRequestedWords } from "../../src/pipeline/selection";

describe("collectRequestedWords", () => {
  test("combines flags and file lines with stable exact deduplication", () => {
    const result = collectRequestedWords({
      flagWords: ["give", "in", "give"],
      wordsFile: {
        text: " in \n take the word \n\nIN\n",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual([
      "give",
      "in",
      "take the word",
      "IN",
    ]);
  });

  test("rejects an empty effective selection", () => {
    expect(collectRequestedWords({ flagWords: [], wordsFile: null })).toEqual({
      ok: false,
      error: { kind: "no-words" },
    });
  });

  test("trims inputs, ignores blanks, and leaves caller data unchanged", () => {
    const flagWords = Object.freeze([" give ", " ", "give"]);
    const wordsFile = Object.freeze({
      text: "\r\n take \r\n",
    });

    const result = collectRequestedWords({ flagWords, wordsFile });

    expect(result).toEqual({
      ok: true,
      value: ["give", "take"],
    });
    expect(flagWords).toEqual([" give ", " ", "give"]);
    expect(wordsFile.text).toBe("\r\n take \r\n");
  });

  test("rejects selections containing only boundary whitespace", () => {
    expect(
      collectRequestedWords({
        flagWords: ["  "],
        wordsFile: { text: "\n \r\n" },
      }),
    ).toEqual({
      ok: false,
      error: { kind: "no-words" },
    });
  });
});
