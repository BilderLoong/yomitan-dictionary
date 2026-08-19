import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

import { parseCliArgs } from "./pipeline/cli";
import { writeFunctionalLabelInventory } from "./pipeline/inventory";
import {
  parseSourceDataManifest,
  type ReleaseSourceData,
  runPublicReleaseBuild,
} from "./pipeline/release";
import type { BuildReport } from "./pipeline/report";
import { runBuild } from "./pipeline/runBuild";
import { collectRequestedWords } from "./pipeline/selection";
import type { Result } from "./shared/result";

const usage =
  "Usage: bun run src/index.ts [--full | --inventory:functional-labels | --release --revision <revision> --commit <sha> | --words <word...> [--words-file <path>]]";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const readWordsFile = async (
  path: string | null,
): Promise<{ readonly text: string } | null> => {
  if (path === null) return null;
  return { text: await readFile(path, "utf8") };
};

const readSourceDataManifest = async (
  path: string,
): Promise<Result<ReleaseSourceData, string>> => {
  try {
    return parseSourceDataManifest(JSON.parse(await readFile(path, "utf8")));
  } catch (error: unknown) {
    return {
      ok: false,
      error: `Unable to read source-data manifest: ${errorMessage(error)}`,
    };
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (const next of units.slice(1)) {
    if (value < 1024) break;
    value /= 1024;
    unit = next;
  }
  return `${value.toFixed(1)} ${unit}`;
};

const printFullBuildStats = async (
  report: BuildReport,
  archivePath: string,
  elapsedMs: number,
): Promise<void> => {
  const archiveSize = await stat(archivePath);
  console.log(`Full-database build complete: ${archivePath}`);
  console.log(`  rows planned:      ${report.totals.roots}`);
  console.log(`  dependency rows:   ${report.totals.dependencies}`);
  console.log(`  canonical entries: ${report.totals.canonicalEntries}`);
  console.log(`  soft links:        ${report.totals.softLinkEntries}`);
  console.log(`  records:           ${report.totals.records}`);
  console.log(`  findings:          ${report.totals.findings}`);
  console.log(`  errors:            ${report.totals.errors}`);
  console.log(`  elapsed:           ${elapsedMs} ms`);
  console.log(`  archive size:      ${formatBytes(archiveSize.size)}`);
};

const main = async (): Promise<void> => {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.error.message);
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  const packageDirectory = dirname(import.meta.dirname);
  if (parsed.value.inventoryFunctionalLabels) {
    const outputPath = join(
      packageDirectory,
      "build",
      "functional-label-inventory.json",
    );
    const attempt = await writeFunctionalLabelInventory({
      databasePath: join(packageDirectory, "assets", "MWU.db"),
      outputPath,
    });
    if (!attempt.ok) {
      console.error(`Functional-label inventory failed: ${attempt.error}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `Functional-label inventory: ${attempt.outputPath} (${attempt.report.labelCount} labels, ${attempt.report.unmappedLabels.length} unmapped)`,
    );
    if (attempt.report.errors.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (parsed.value.release.kind === "release") {
    const sourceData = await readSourceDataManifest(
      join(packageDirectory, "assets", "source-data-manifest.json"),
    );
    if (!sourceData.ok) {
      console.error(sourceData.error);
      process.exitCode = 1;
      return;
    }

    const attempt = await runPublicReleaseBuild({
      releaseRevision: parsed.value.release.revision,
      converterCommit: parsed.value.release.converterCommit,
      sourceData: sourceData.value,
      databasePath: join(
        packageDirectory,
        "assets",
        sourceData.value.databaseFilename,
      ),
      stylesPath: join(packageDirectory, "styles.css"),
      outputDirectory: join(packageDirectory, "release"),
    });
    if (!attempt.ok) {
      console.error(attempt.error);
      process.exitCode = 1;
      return;
    }

    console.log(`Public release build complete: ${attempt.value.archivePath}`);
    console.log(`  update index: ${attempt.value.indexPath}`);
    console.log(`  checksums:    ${attempt.value.checksumsPath}`);
    console.log(`  build report: ${attempt.value.reportPath}`);
    return;
  }

  const requestedWords = parsed.value.fullDatabase
    ? []
    : await (async (): Promise<readonly string[] | null> => {
        let wordsFile: { readonly text: string } | null;
        try {
          wordsFile = await readWordsFile(parsed.value.wordsFilePath);
        } catch (error: unknown) {
          console.error(`Unable to read words file: ${errorMessage(error)}`);
          process.exitCode = 1;
          return null;
        }

        const selected = collectRequestedWords({
          flagWords: parsed.value.flagWords,
          wordsFile,
        });
        if (!selected.ok) {
          console.error("No selected words were supplied.");
          console.error(usage);
          process.exitCode = 1;
          return null;
        }
        return selected.value;
      })();
  if (requestedWords === null) return;

  const startedAt = performance.now();
  const attempt = await runBuild({
    requestedWords,
    databasePath: join(packageDirectory, "assets", "MWU.db"),
    buildPaths: {
      outputDirectory: join(packageDirectory, "build"),
      reportPath: join(packageDirectory, "build", "build-report.json"),
      stylesPath: join(packageDirectory, "styles.css"),
    },
    fullDatabase: parsed.value.fullDatabase,
  });
  const elapsedMs = Math.round(performance.now() - startedAt);

  if (!attempt.ok) {
    console.error(
      parsed.value.fullDatabase
        ? "MWU full-database build failed."
        : "MWU selected-word build failed.",
    );
    for (const error of attempt.report.errors) {
      console.error(JSON.stringify(error));
    }
    process.exitCode = 1;
    return;
  }

  if (parsed.value.fullDatabase) {
    await printFullBuildStats(attempt.report, attempt.archivePath, elapsedMs);
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
