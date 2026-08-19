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
        release: { kind: "development" },
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
        release: { kind: "development" },
      },
    });
    expect(parseCliArgs([])).toEqual({
      ok: true,
      value: {
        flagWords: [],
        wordsFilePath: null,
        fullDatabase: false,
        inventoryFunctionalLabels: false,
        release: { kind: "development" },
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
    expect(result.value.release).toEqual({ kind: "development" });
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
        release: { kind: "development" },
      },
    });
  });

  test("rejects inventory combined with full mode", () => {
    const result = parseCliArgs(["--inventory:functional-labels", "--full"]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("inventory:functional-labels");
  });

  test("parses an explicit release revision and converter commit", () => {
    const result = parseCliArgs([
      "--release",
      "--revision",
      "2026.08.18.1",
      "--commit",
      "a".repeat(40),
    ]);

    expect(result).toEqual({
      ok: true,
      value: {
        flagWords: [],
        wordsFilePath: null,
        fullDatabase: false,
        inventoryFunctionalLabels: false,
        release: {
          kind: "release",
          revision: "2026.08.18.1",
          converterCommit: "a".repeat(40),
        },
      },
    });
  });

  test("rejects a release without both required inputs", () => {
    const result = parseCliArgs(["--release", "--revision", "2026.08.18"]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("--commit");
  });

  test("rejects release inputs without the release command", () => {
    const result = parseCliArgs([
      "--revision",
      "2026.08.18",
      "--commit",
      "a".repeat(40),
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("--release");
  });

  test("rejects a release combined with selected words", () => {
    const result = parseCliArgs([
      "--release",
      "--revision",
      "2026.08.18",
      "--commit",
      "a".repeat(40),
      "--words",
      "o",
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("--release");
  });
});
