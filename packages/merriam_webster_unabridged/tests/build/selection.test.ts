import { describe, expect, test } from "bun:test";

import { collectRequestedWords } from "../../src/build/selection";

describe("collectRequestedWords", () => {
  test("combines flags and file lines with stable exact deduplication", () => {
    const result = collectRequestedWords({
      flagWords: ["give", "in", "give"],
      wordsFile: {
        path: "/tmp/words.txt",
        text: " in \n take the word \n\nIN\n",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.map(({ word }) => word)).toEqual([
      "give",
      "in",
      "take the word",
      "IN",
    ]);
    expect(result.value[0]?.evidence).toEqual([
      { kind: "flag", argumentIndex: 0 },
      { kind: "flag", argumentIndex: 2 },
    ]);
    expect(result.value[1]?.evidence).toEqual([
      { kind: "flag", argumentIndex: 1 },
      { kind: "file", path: "/tmp/words.txt", line: 1 },
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
      path: "/tmp/words.txt",
      text: "\r\n take \r\n",
    });

    const result = collectRequestedWords({ flagWords, wordsFile });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          word: "give",
          evidence: [
            { kind: "flag", argumentIndex: 0 },
            { kind: "flag", argumentIndex: 2 },
          ],
        },
        {
          word: "take",
          evidence: [{ kind: "file", path: "/tmp/words.txt", line: 2 }],
        },
      ],
    });
    expect(flagWords).toEqual([" give ", " ", "give"]);
    expect(wordsFile.text).toBe("\r\n take \r\n");
  });

  test("rejects selections containing only boundary whitespace", () => {
    expect(
      collectRequestedWords({
        flagWords: ["  "],
        wordsFile: { path: "/tmp/words.txt", text: "\n \r\n" },
      }),
    ).toEqual({
      ok: false,
      error: { kind: "no-words" },
    });
  });
});
