import type { Result } from "../src/shared/result";

export interface ImportOptions {
  readonly dictionaryPath: string;
  readonly query: string | null;
  readonly queryFilePath: string | null;
  readonly close: boolean;
  readonly chromeFlags: readonly string[];
  readonly screenshotPath: string | null;
  readonly extensionPath: string | null;
}

export interface ImportArgumentError {
  readonly kind: "usage";
  readonly message: string;
}

interface ParsedOptions {
  readonly query: string | null;
  readonly queryFilePath: string | null;
  readonly close: boolean;
  readonly chromeFlags: readonly string[];
  readonly screenshotPath: string | null;
  readonly extensionPath: string | null;
}

const usage =
  "Usage: bun run tests/import_dict.ts <dictionary.zip> [--query <queries>] [--query-file <path>] [--extension-path <path>] [--chrome-flag <flag>] [--screenshot <path>] [--close]";

const parseOptions = (
  argumentsList: readonly string[],
  index: number,
  options: ParsedOptions,
): Result<ParsedOptions, ImportArgumentError> => {
  const argument = argumentsList[index];
  if (argument === undefined) return { ok: true, value: options };

  if (argument === "--close") {
    return parseOptions(argumentsList, index + 1, {
      ...options,
      close: true,
    });
  }

  if (argument === "--screenshot") {
    const value = argumentsList[index + 1];
    if (value === undefined || value.length === 0) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message: "--screenshot requires a non-empty value",
        },
      };
    }
    return parseOptions(argumentsList, index + 2, {
      ...options,
      screenshotPath: value,
    });
  }

  if (argument === "--extension-path") {
    const value = argumentsList[index + 1];
    if (value === undefined || value.length === 0) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message: "--extension-path requires a non-empty value",
        },
      };
    }
    return parseOptions(argumentsList, index + 2, {
      ...options,
      extensionPath: value,
    });
  }

  if (argument === "--chrome-flag") {
    const value = argumentsList[index + 1];
    if (value === undefined || value.length === 0) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message: "--chrome-flag requires a non-empty value",
        },
      };
    }
    return parseOptions(argumentsList, index + 2, {
      ...options,
      chromeFlags: [...options.chromeFlags, value],
    });
  }

  if (argument !== "--query" && argument !== "--query-file") {
    return {
      ok: false,
      error: { kind: "usage", message: `Unknown option: ${argument}` },
    };
  }

  const value = argumentsList[index + 1];
  if (value === undefined) {
    return {
      ok: false,
      error: { kind: "usage", message: `${argument} requires a value` },
    };
  }

  if (argument === "--query" && options.queryFilePath !== null) {
    return {
      ok: false,
      error: {
        kind: "usage",
        message: "--query and --query-file cannot be used together",
      },
    };
  }

  if (argument === "--query-file" && options.query !== null) {
    return {
      ok: false,
      error: {
        kind: "usage",
        message: "--query and --query-file cannot be used together",
      },
    };
  }

  return parseOptions(
    argumentsList,
    index + 2,
    argument === "--query"
      ? { ...options, query: value }
      : { ...options, queryFilePath: value },
  );
};

export const parseImportArguments = (
  argumentsList: readonly string[],
): Result<ImportOptions, ImportArgumentError> => {
  const dictionaryPath = argumentsList[0];
  if (dictionaryPath === undefined) {
    return { ok: false, error: { kind: "usage", message: usage } };
  }

  const parsed = parseOptions(argumentsList, 1, {
    query: null,
    queryFilePath: null,
    close: false,
    chromeFlags: [],
    screenshotPath: null,
    extensionPath: null,
  });
  if (!parsed.ok) return parsed;

  return {
    ok: true,
    value: { dictionaryPath, ...parsed.value },
  };
};

export const queriesFromText = (text: string): readonly string[] =>
  text
    .split(/[,\r\n]+/u)
    .map((query: string): string => query.trim())
    .filter((query: string): boolean => query.length > 0);
