import type { Result } from "../../src/shared/result";

export interface InspectionOptions {
  readonly dictionaryPath: string;
  readonly query: string | null;
  readonly queryFilePath: string | null;
  readonly close: boolean;
  readonly chromeFlags: readonly string[];
  readonly screenshotPath: string | null;
  readonly extensionPath: string | null;
  readonly userDataDirectory: string | null;
}

export interface InspectionArgumentError {
  readonly kind: "help" | "usage";
  readonly message: string;
}

interface ParsedOptions {
  readonly query: string | null;
  readonly queryFilePath: string | null;
  readonly close: boolean;
  readonly chromeFlags: readonly string[];
  readonly screenshotPath: string | null;
  readonly extensionPath: string | null;
  readonly userDataDirectory: string | null;
}

const formatUsage = (
  command: string,
  dictionaryArgument: string,
  queryOptions: string,
): string =>
  [
    `Usage: ${command}${dictionaryArgument} [options]`,
    "Options:",
    `  ${queryOptions}`,
    "  --extension-path <path>",
    "  --user-data-dir <path>",
    "  --mcp-port <port>",
    "  --chrome-flag <flag>",
    "  --screenshot <path>",
    "  --close",
    "  --help",
  ].join("\n");

export const inspectUsage = formatUsage(
  "bun run scripts/dictionary-inspection/inspect.ts",
  " <dictionary.zip>",
  "--query <query>",
);

export const headlessUsage = formatUsage(
  "bun run scripts/dictionary-inspection/inspect-headless.ts",
  " <dictionary.zip>",
  "--query <queries> | --query-file <path>",
);

export const packageInspectUsage = formatUsage(
  "bun run inspect:dict",
  "",
  "--query <query>",
);

export const packageHeadlessUsage = formatUsage(
  "bun run inspect:dict:headless",
  "",
  "--query <queries> | --query-file <path>",
);

const parseOptions = (
  argumentsList: readonly string[],
  index: number,
  options: ParsedOptions,
  usage: string,
): Result<ParsedOptions, InspectionArgumentError> => {
  const argument = argumentsList[index];
  if (argument === undefined) return { ok: true, value: options };

  if (argument === "--help" || argument === "-h") {
    return { ok: false, error: { kind: "help", message: usage } };
  }

  if (argument === "--close") {
    return parseOptions(
      argumentsList,
      index + 1,
      { ...options, close: true },
      usage,
    );
  }

  if (argument === "--mcp-port") {
    const value = argumentsList[index + 1];
    const port = Number(value);
    if (
      value === undefined ||
      value.length === 0 ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message: "--mcp-port requires an integer from 1 to 65535",
        },
      };
    }
    return parseOptions(
      argumentsList,
      index + 2,
      {
        ...options,
        chromeFlags: [
          ...options.chromeFlags,
          `--remote-debugging-port=${port}`,
          "--remote-allow-origins=*",
        ],
      },
      usage,
    );
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
    return parseOptions(
      argumentsList,
      index + 2,
      { ...options, screenshotPath: value },
      usage,
    );
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
    return parseOptions(
      argumentsList,
      index + 2,
      { ...options, extensionPath: value },
      usage,
    );
  }

  if (argument === "--user-data-dir") {
    const value = argumentsList[index + 1];
    if (value === undefined || value.length === 0) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message: "--user-data-dir requires a non-empty value",
        },
      };
    }
    return parseOptions(
      argumentsList,
      index + 2,
      { ...options, userDataDirectory: value },
      usage,
    );
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
    return parseOptions(
      argumentsList,
      index + 2,
      { ...options, chromeFlags: [...options.chromeFlags, value] },
      usage,
    );
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
    usage,
  );
};

export const parseInspectionArguments = (
  argumentsList: readonly string[],
  usage: string,
): Result<InspectionOptions, InspectionArgumentError> => {
  const dictionaryPath = argumentsList[0];
  if (dictionaryPath === "--help" || dictionaryPath === "-h") {
    return { ok: false, error: { kind: "help", message: usage } };
  }
  if (dictionaryPath === undefined) {
    return { ok: false, error: { kind: "usage", message: usage } };
  }

  const parsed = parseOptions(
    argumentsList,
    1,
    {
      query: null,
      queryFilePath: null,
      close: false,
      chromeFlags: [],
      screenshotPath: null,
      extensionPath: null,
      userDataDirectory: null,
    },
    usage,
  );
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
