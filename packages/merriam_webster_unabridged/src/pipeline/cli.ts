import { Command, CommanderError } from "commander";

import type { Result } from "../shared/result";

export interface ParsedCliArgs {
  readonly flagWords: readonly string[];
  readonly wordsFilePath: string | null;
  readonly fullDatabase: boolean;
}

export type CliParseError = {
  readonly kind: "usage";
  readonly message: string;
};

interface CommanderOptions {
  readonly words?: readonly string[];
  readonly wordsFile?: string;
  readonly full?: boolean;
}

const ignoreCommanderOutput = (_message: string): void => undefined;

const createProgram = (): Command =>
  new Command()
    .exitOverride()
    .configureOutput({
      writeOut: ignoreCommanderOutput,
      writeErr: ignoreCommanderOutput,
    })
    .option("--words <words...>", "Target words to build")
    .option("--words-file <path>", "Newline-delimited target words file")
    .option("--full", "Build the whole source database");

export const parseCliArgs = (
  argv: readonly string[],
): Result<ParsedCliArgs, CliParseError> => {
  const program = createProgram();

  try {
    program.parse(argv, { from: "user" });
    const options = program.opts<CommanderOptions>();
    const fullDatabase = options.full === true;

    if (
      fullDatabase &&
      ((options.words?.length ?? 0) > 0 || options.wordsFile !== undefined)
    ) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message:
            "The --full flag cannot be combined with --words or --words-file.",
        },
      };
    }

    return {
      ok: true,
      value: {
        flagWords: [...(options.words ?? [])],
        wordsFilePath: options.wordsFile ?? null,
        fullDatabase,
      },
    };
  } catch (error: unknown) {
    if (!(error instanceof CommanderError)) throw error;

    return {
      ok: false,
      error: { kind: "usage", message: error.message },
    };
  }
};
