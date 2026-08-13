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
        fullDatabase: false,
        inventoryFunctionalLabels: false,
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
      value: {
        flagWords: ["give"],
        wordsFilePath: null,
        fullDatabase: false,
        inventoryFunctionalLabels: false,
      },
    });
    expect(parseCliArgs([])).toEqual({
      ok: true,
      value: {
        flagWords: [],
        wordsFilePath: null,
        fullDatabase: false,
        inventoryFunctionalLabels: false,
      },
    });
  });

  test("parses --full as a full-database build", () => {
    const result = parseCliArgs(["--full"]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fullDatabase).toBe(true);
    expect(result.value.flagWords).toEqual([]);
    expect(result.value.wordsFilePath).toBeNull();
    expect(result.value.inventoryFunctionalLabels).toBe(false);
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

  test("parses the functional-label inventory command", () => {
    expect(parseCliArgs(["--inventory:functional-labels"])).toEqual({
      ok: true,
      value: {
        flagWords: [],
        wordsFilePath: null,
        fullDatabase: false,
        inventoryFunctionalLabels: true,
      },
    });
  });

  test("rejects inventory combined with full mode", () => {
    const result = parseCliArgs(["--inventory:functional-labels", "--full"]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("inventory:functional-labels");
  });
});
