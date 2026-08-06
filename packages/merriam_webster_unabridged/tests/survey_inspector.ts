import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCliArgs } from "../src/pipeline/cli";
import { collectRequestedWords } from "../src/pipeline/selection";
import { buildSourceIndex, findSourceRows } from "../src/source/rows";
import {
  listSourceRowSummaries,
  loadSourceRow,
  openSourceDatabase,
} from "../src/source/sqlite";
import {
  buildInventory,
  inspectWordHtml,
  type SurveyFinding,
  type WordSurvey,
} from "../src/survey/inspector";

const sourceDatabasePath = fileURLToPath(
  new URL("../assets/MWU.db", import.meta.url),
);
const outputDirectory = fileURLToPath(new URL("../build", import.meta.url));

const findingSectionCounts = (
  findings: readonly SurveyFinding[],
): Record<string, number> =>
  findings.reduce(
    (counts: Record<string, number>, finding: SurveyFinding) => ({
      ...counts,
      [finding.findingSection]: (counts[finding.findingSection] ?? 0) + 1,
    }),
    {},
  );

const printSurvey = (survey: WordSurvey): void => {
  console.log(`\n=== ${survey.word} (row ${survey.rowId ?? "missing"}) ===`);
  const counts = findingSectionCounts(survey.findings);
  console.log(
    `interesting: ${counts.interesting ?? 0} | notNeeded: ${counts.notNeeded ?? 0} | notYetNoticed: ${counts.notYetNoticed ?? 0}`,
  );
  for (const finding of survey.findings) {
    console.log(
      `[${finding.findingSection}] ${finding.informationName}${finding.unitLevel === null ? "" : ` L${finding.unitLevel}`} @ ${finding.sourceSelectorOrTag} → ${finding.boundTo}`,
    );
  }
};

const runSurveyInspector = async (argv: readonly string[]): Promise<number> => {
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
    const surveys: WordSurvey[] = [];
    for (const word of selection.value) {
      const rowIds = findSourceRows(index, word);
      const row =
        rowIds.length === 0
          ? null
          : loadSourceRow(database, rowIds[0]?.id ?? 0);
      surveys.push(inspectWordHtml(word, row?.id ?? null, row?.html ?? ""));
    }

    await mkdir(outputDirectory, { recursive: true });
    const inventory = buildInventory(surveys);
    await writeFile(
      join(outputDirectory, "survey-inventory.json"),
      `${JSON.stringify({ inventory, surveys }, null, 2)}\n`,
      "utf8",
    );
    console.log(`Report: ${join(outputDirectory, "survey-inventory.json")}`);

    for (const survey of surveys) printSurvey(survey);
    console.log(
      `\nInventory: ${inventory.wordCount} words, ${inventory.entries.length} selectors`,
    );
    if (inventory.unknownSelectors.length > 0) {
      console.log("Unknown selectors (reported, never dropped):");
      for (const unknown of inventory.unknownSelectors) {
        console.log(`  - ${unknown.selector} (${unknown.words.join(", ")})`);
      }
    }
    return 0;
  } finally {
    database.close();
  }
};

process.exit(await runSurveyInspector(process.argv.slice(2)));
