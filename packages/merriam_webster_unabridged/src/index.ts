import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { parseCliArgs } from "./build/cli";
import { runBuild } from "./build/runBuild";
import { collectRequestedWords } from "./build/selection";

const usage =
  "Usage: bun run src/index.ts --words <word...> [--words-file <path>]";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const readWordsFile = async (
  path: string | null,
): Promise<{ readonly text: string } | null> => {
  if (path === null) return null;
  return { text: await readFile(path, "utf8") };
};

const main = async (): Promise<void> => {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.error.message);
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  let wordsFile: { readonly text: string } | null;
  try {
    wordsFile = await readWordsFile(parsed.value.wordsFilePath);
  } catch (error: unknown) {
    console.error(`Unable to read words file: ${errorMessage(error)}`);
    process.exitCode = 1;
    return;
  }

  const selected = collectRequestedWords({
    flagWords: parsed.value.flagWords,
    wordsFile,
  });
  if (!selected.ok) {
    console.error("No selected words were supplied.");
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  const packageDirectory = dirname(import.meta.dirname);
  const attempt = await runBuild({
    requestedWords: selected.value,
    databasePath: join(packageDirectory, "assets", "MWU.db"),
    buildPaths: {
      outputDirectory: join(packageDirectory, "build"),
      reportPath: join(packageDirectory, "build", "build-report.json"),
    },
  });

  if (!attempt.ok) {
    console.error("MWU selected-word build failed.");
    for (const error of attempt.report.errors) {
      console.error(JSON.stringify(error));
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Built ${attempt.records.length} records for ${attempt.report.requestedWords.length} selected roots: ${attempt.archivePath}`,
  );
};

if (import.meta.main) {
  void main().catch((error: unknown): void => {
    console.error(`MWU selected-word build failed: ${errorMessage(error)}`);
    process.exitCode = 1;
  });
}
