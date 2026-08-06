import { describe, expect, test } from "bun:test";

import { parseCliArgs } from "../../src/pipeline/cli";

describe("parseCliArgs", () => {
  test("parses variadic words and a words file", () => {
    expect(
      parseCliArgs([
        "--words",
        "give",
        "in",
        "take the word",
        "--words-file",
        "/tmp/words.txt",
      ]),
    ).toEqual({
      ok: true,
      value: {
        flagWords: ["give", "in", "take the word"],
        wordsFilePath: "/tmp/words.txt",
      },
    });
  });

  test.each(["--limit", "--additional-words-list-file"])(
    "rejects removed option %s",
    (option: string): void => {
      const result = parseCliArgs([option, "1"]);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("usage");
    },
  );

  test("returns usage errors instead of throwing", () => {
    const result = parseCliArgs(["--words-file"]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      kind: "usage",
      message: expect.stringContaining("argument missing"),
    });
  });

  test("uses a fresh command for each parse", () => {
    expect(parseCliArgs(["--words", "give"])).toEqual({
      ok: true,
      value: { flagWords: ["give"], wordsFilePath: null },
    });
    expect(parseCliArgs([])).toEqual({
      ok: true,
      value: { flagWords: [], wordsFilePath: null },
    });
  });
});
