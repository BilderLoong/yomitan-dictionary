import { expect, test } from "bun:test";

import { parseImportArguments, queriesFromText } from "./import_options";

test("parses a query file and close option", () => {
  expect(
    parseImportArguments([
      "dictionary.zip",
      "--query-file",
      "queries.txt",
      "--extension-path",
      "/tmp/yomitan-extension",
      "--screenshot",
      "mwu-search.png",
      "--close",
    ]),
  ).toEqual({
    ok: true,
    value: {
      dictionaryPath: "dictionary.zip",
      query: null,
      queryFilePath: "queries.txt",
      close: true,
      chromeFlags: [],
      screenshotPath: "mwu-search.png",
      extensionPath: "/tmp/yomitan-extension",
      userDataDirectory: null,
    },
  });
});

test("forwards chrome flags verbatim in order", () => {
  expect(
    parseImportArguments([
      "dictionary.zip",
      "--chrome-flag",
      "--remote-debugging-port=9222",
      "--chrome-flag",
      "--remote-allow-origins=*",
    ]),
  ).toEqual({
    ok: true,
    value: {
      dictionaryPath: "dictionary.zip",
      query: null,
      queryFilePath: null,
      close: false,
      chromeFlags: ["--remote-debugging-port=9222", "--remote-allow-origins=*"],
      screenshotPath: null,
      extensionPath: null,
      userDataDirectory: null,
    },
  });
});

test("opens an MCP port with the required Chrome flags", () => {
  expect(
    parseImportArguments(["dictionary.zip", "--mcp-port", "9222"]),
  ).toEqual({
    ok: true,
    value: {
      dictionaryPath: "dictionary.zip",
      query: null,
      queryFilePath: null,
      close: false,
      chromeFlags: ["--remote-debugging-port=9222", "--remote-allow-origins=*"],
      screenshotPath: null,
      extensionPath: null,
      userDataDirectory: null,
    },
  });
});

test("rejects an empty chrome flag", () => {
  expect(parseImportArguments(["dictionary.zip", "--chrome-flag", ""])).toEqual(
    {
      ok: false,
      error: {
        kind: "usage",
        message: "--chrome-flag requires a non-empty value",
      },
    },
  );
});

test("parses a user data directory", () => {
  expect(
    parseImportArguments(["dictionary.zip", "--user-data-dir", "/tmp/profile"]),
  ).toEqual({
    ok: true,
    value: {
      dictionaryPath: "dictionary.zip",
      query: null,
      queryFilePath: null,
      close: false,
      chromeFlags: [],
      screenshotPath: null,
      extensionPath: null,
      userDataDirectory: "/tmp/profile",
    },
  });
});

test("rejects an empty user data directory", () => {
  expect(
    parseImportArguments(["dictionary.zip", "--user-data-dir", ""]),
  ).toEqual({
    ok: false,
    error: {
      kind: "usage",
      message: "--user-data-dir requires a non-empty value",
    },
  });
});

test("rejects simultaneous query sources", () => {
  expect(
    parseImportArguments([
      "dictionary.zip",
      "--query",
      "what",
      "--query-file",
      "queries.txt",
    ]),
  ).toEqual({
    ok: false,
    error: {
      kind: "usage",
      message: "--query and --query-file cannot be used together",
    },
  });
});

test("reads comma- and newline-delimited queries in order", () => {
  expect(queriesFromText("what, take the word\n\nin\r\no")).toEqual([
    "what",
    "take the word",
    "in",
    "o",
  ]);
});
