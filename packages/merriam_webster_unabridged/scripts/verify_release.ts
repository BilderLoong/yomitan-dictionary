import { dirname, resolve } from "node:path";
import { Command, CommanderError } from "commander";

import {
  readReleaseSourceData,
  verifyPublicReleaseDirectory,
} from "../src/pipeline/releaseVerification";
import type { Result } from "../src/shared/result";

interface VerificationOptions {
  readonly revision?: string;
  readonly commit?: string;
  readonly releaseDirectory?: string;
  readonly sourceDataManifest?: string;
}

interface VerificationArguments {
  readonly revision: string;
  readonly commit: string;
  readonly releaseDirectory: string;
  readonly sourceDataManifest: string;
}

const usage =
  "Usage: bun run test:release -- --revision <revision> --commit <sha> [--release-directory <path>] [--source-data-manifest <path>]";

const ignoreCommanderOutput = (_message: string): void => undefined;

const createProgram = (): Command =>
  new Command()
    .exitOverride()
    .configureOutput({
      writeOut: ignoreCommanderOutput,
      writeErr: ignoreCommanderOutput,
    })
    .option("--revision <revision>", "Expected public release revision")
    .option("--commit <sha>", "Expected full converter commit SHA")
    .option(
      "--release-directory <path>",
      "Directory containing the generated public release assets",
      "release",
    )
    .option(
      "--source-data-manifest <path>",
      "Source-data contract used to build the release",
      "assets/source-data-manifest.json",
    );

const parseArguments = (
  argv: readonly string[],
): Result<VerificationArguments, string> => {
  try {
    const program = createProgram();
    program.parse(argv, { from: "user" });
    const options = program.opts<VerificationOptions>();
    if (options.revision === undefined || options.commit === undefined) {
      return {
        ok: false,
        error: "The --revision and --commit options are required.",
      };
    }
    return {
      ok: true,
      value: {
        revision: options.revision,
        commit: options.commit,
        releaseDirectory: options.releaseDirectory ?? "release",
        sourceDataManifest:
          options.sourceDataManifest ?? "assets/source-data-manifest.json",
      },
    };
  } catch (error: unknown) {
    if (!(error instanceof CommanderError)) throw error;
    return { ok: false, error: error.message };
  }
};

const main = async (): Promise<number> => {
  const parsed = parseArguments(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.error);
    console.error(usage);
    return 1;
  }

  const packageDirectory = dirname(import.meta.dirname);
  const sourceData = await readReleaseSourceData(
    resolve(packageDirectory, parsed.value.sourceDataManifest),
  );
  if (!sourceData.ok) {
    console.error(sourceData.error);
    return 1;
  }

  const result = await verifyPublicReleaseDirectory({
    releaseDirectory: resolve(packageDirectory, parsed.value.releaseDirectory),
    expectedRevision: parsed.value.revision,
    expectedConverterCommit: parsed.value.commit,
    sourceData: sourceData.value,
  });
  if (!result.ok) {
    console.error("Public release verification failed:");
    result.error.forEach((message: string): void => {
      console.error(`- ${message}`);
    });
    return 1;
  }

  console.log(
    `Public release verification passed: ${result.value.releaseRevision} (${result.value.converterCommit})`,
  );
  return 0;
};

if (import.meta.main) {
  void main()
    .then((exitCode: number): void => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown): void => {
      console.error(`Public release verification failed: ${String(error)}`);
      process.exitCode = 1;
    });
}
