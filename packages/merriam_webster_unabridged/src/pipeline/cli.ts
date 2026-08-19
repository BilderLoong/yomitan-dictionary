import { Command, CommanderError } from "commander";

import type { Result } from "../shared/result";

export interface ParsedCliArgs {
  readonly flagWords: readonly string[];
  readonly wordsFilePath: string | null;
  readonly fullDatabase: boolean;
  readonly inventoryFunctionalLabels: boolean;
  readonly release:
    | { readonly kind: "development" }
    | {
        readonly kind: "release";
        readonly revision: string;
        readonly converterCommit: string;
      };
}

export type CliParseError = {
  readonly kind: "usage";
  readonly message: string;
};

interface CommanderOptions {
  readonly words?: readonly string[];
  readonly wordsFile?: string;
  readonly full?: boolean;
  readonly "inventory:functionalLabels"?: boolean;
  readonly release?: boolean;
  readonly revision?: string;
  readonly commit?: string;
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
    .option(
      "--full",
      "Build every Unabridged entry (excludes collegiate_, medical_, and thesaurus_ twin rows)",
    )
    .option(
      "--inventory:functional-labels",
      "Audit the owned functional-label inventory without exporting a dictionary",
    )
    .option("--release", "Build the public full-database release assets")
    .option("--revision <revision>", "Public release revision")
    .option("--commit <sha>", "Full converter commit SHA");

export const parseCliArgs = (
  argv: readonly string[],
): Result<ParsedCliArgs, CliParseError> => {
  const program = createProgram();

  try {
    program.parse(argv, { from: "user" });
    const options = program.opts<CommanderOptions>();
    const fullDatabase = options.full === true;
    const inventoryFunctionalLabels =
      options["inventory:functionalLabels"] === true;
    const releaseRequested = options.release === true;
    const hasReleaseInputs =
      options.revision !== undefined || options.commit !== undefined;

    if (
      releaseRequested &&
      (options.revision === undefined || options.commit === undefined)
    ) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message: "The --release flag requires both --revision and --commit.",
        },
      };
    }

    if (!releaseRequested && hasReleaseInputs) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message: "--revision and --commit require the --release flag.",
        },
      };
    }

    if (
      (fullDatabase || inventoryFunctionalLabels || releaseRequested) &&
      ((options.words?.length ?? 0) > 0 || options.wordsFile !== undefined)
    ) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message:
            "The --full, --inventory:functional-labels, and --release flags cannot be combined with --words or --words-file.",
        },
      };
    }

    if (releaseRequested && (fullDatabase || inventoryFunctionalLabels)) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message:
            "The --release flag cannot be combined with --full or --inventory:functional-labels.",
        },
      };
    }

    if (fullDatabase && inventoryFunctionalLabels) {
      return {
        ok: false,
        error: {
          kind: "usage",
          message:
            "The --full flag cannot be combined with --inventory:functional-labels.",
        },
      };
    }

    return {
      ok: true,
      value: {
        flagWords: [...(options.words ?? [])],
        wordsFilePath: options.wordsFile ?? null,
        fullDatabase,
        inventoryFunctionalLabels,
        release:
          releaseRequested &&
          options.revision !== undefined &&
          options.commit !== undefined
            ? {
                kind: "release",
                revision: options.revision,
                converterCommit: options.commit,
              }
            : { kind: "development" },
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
