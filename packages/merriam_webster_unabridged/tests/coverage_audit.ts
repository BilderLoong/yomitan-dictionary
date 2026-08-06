import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";
import { parseCliArgs } from "../src/pipeline/cli";
import {
  type CoverageMetrics,
  computeTextCoverage,
  textTokens,
} from "../src/pipeline/coverage";
import { runBuild } from "../src/pipeline/runBuild";
import { collectRequestedWords } from "../src/pipeline/selection";
import { buildSourceIndex } from "../src/source/rows";
import {
  listSourceRowSummaries,
  openSourceDatabase,
} from "../src/source/sqlite";

const sourceDatabasePath = fileURLToPath(
  new URL("../assets/MWU.db", import.meta.url),
);
const stylesPath = fileURLToPath(new URL("../styles.css", import.meta.url));
const outputDirectory = fileURLToPath(new URL("../build", import.meta.url));

const normalizeSourceText = (ownerHtml: string): string =>
  cheerio
    .load(ownerHtml, null, false)
    .root()
    .text()
    .replace(/\s+/gu, " ")
    .trim();

// The record term is the Yomitan row headword, not repeated inside the
// definition content (phrase entries and same-spelling main entries
// deliberately omit it). Exclude it from the source side so coverage
// measures content preservation rather than headword duplication.
const coverageSourceText = (term: string, ownerHtml: string): string => {
  const termTokens = new Set(textTokens(term));
  return textTokens(normalizeSourceText(ownerHtml))
    .filter((token: string): boolean => !termTokens.has(token))
    .join(" ");
};

interface RecordCoverageEntry {
  readonly term: string;
  readonly rowId: number;
  readonly findingKinds: readonly string[];
  readonly coverage: CoverageMetrics;
}

interface BuildReportLike {
  readonly requestedWords: readonly string[];
  readonly conversions: readonly {
    readonly plan: {
      readonly term: string;
      readonly source: { readonly rowId: number; readonly ownerHtml: string };
    };
    readonly content: StructuredContent;
    readonly findings: readonly { readonly kind: string }[];
  }[];
  readonly planningFindings: readonly { readonly kind: string }[];
  readonly errors: readonly {
    readonly kind: string;
    readonly message?: string;
  }[];
}

const recordCoverageEntries = (
  report: BuildReportLike,
): readonly RecordCoverageEntry[] =>
  report.conversions.map((conversion) => ({
    term: conversion.plan.term,
    rowId: conversion.plan.source.rowId,
    findingKinds: conversion.findings.map(({ kind }) => kind),
    coverage: computeTextCoverage(
      coverageSourceText(
        conversion.plan.term,
        conversion.plan.source.ownerHtml,
      ),
      conversion.content,
    ),
  }));

const flaggedRecords = (
  entries: readonly RecordCoverageEntry[],
): readonly string[] =>
  entries
    .filter((entry) => entry.coverage.coverage < 0.95)
    .map(
      (entry) =>
        `${entry.term} (row ${entry.rowId}): ${(entry.coverage.coverage * 100).toFixed(1)}%`,
    );

const countFindings = (
  findings: readonly { readonly kind: string }[],
): Record<string, number> =>
  findings.reduce(
    (counts: Record<string, number>, finding: { readonly kind: string }) => ({
      ...counts,
      [finding.kind]: (counts[finding.kind] ?? 0) + 1,
    }),
    {},
  );

const runCoverageAudit = async (argv: readonly string[]): Promise<number> => {
  const parsed = parseCliArgs(argv);
  if (!parsed.ok) {
    console.error(parsed.error.message);
    return 2;
  }
  const wordsFile =
    parsed.value.wordsFilePath === null
      ? null
      : { text: await readFile(parsed.value.wordsFilePath, "utf8") };
  const selection = collectRequestedWords({
    flagWords: parsed.value.flagWords,
    wordsFile,
  });
  if (!selection.ok) {
    console.error(selection.error.message);
    return 2;
  }

  const database = openSourceDatabase(sourceDatabasePath);
  try {
    const index = buildSourceIndex(listSourceRowSummaries(database));
    const attempt = await runBuild({
      requestedWords: selection.value,
      databasePath: sourceDatabasePath,
      sourceIndex: index,
      buildPaths: {
        outputDirectory,
        reportPath: join(outputDirectory, "build-report.json"),
        stylesPath,
      },
    });

    const entries = recordCoverageEntries(
      attempt.report as unknown as BuildReportLike,
    );
    const meanCoverage =
      entries.length === 0
        ? 1
        : entries.reduce(
            (sum: number, entry: RecordCoverageEntry): number =>
              sum + entry.coverage.coverage,
            0,
          ) / entries.length;
    const flags = flaggedRecords(entries);

    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      join(outputDirectory, "coverage-report.json"),
      `${JSON.stringify(
        {
          requestedWords: attempt.report.requestedWords,
          totals: {
            records: entries.length,
            meanCoverage,
            flaggedRecords: flags.length,
          },
          planningFindingsByKind: countFindings(
            attempt.report.planningFindings,
          ),
          perRecord: entries,
          flags,
          buildErrors: attempt.report.errors,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    console.log(
      `Coverage report: ${join(outputDirectory, "coverage-report.json")}`,
    );
    console.log(`Records: ${entries.length}`);
    console.log(`Mean coverage: ${(meanCoverage * 100).toFixed(1)}%`);
    if (flags.length > 0) {
      console.log(
        `Flagged records (below 95%):\n${flags.map((flag) => `  - ${flag}`).join("\n")}`,
      );
    }
    return attempt.ok ? 0 : 1;
  } finally {
    database.close();
  }
};

process.exit(await runCoverageAudit(process.argv.slice(2)));
