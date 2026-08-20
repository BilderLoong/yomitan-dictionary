import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as cheerio from "cheerio";
import type {
  StructuredContent,
  TermInformation,
} from "yomichan-dict-builder/dist/types/yomitan/termbank";

import { runBuild } from "../../src/pipeline/runBuild";
import { renderToHtml } from "../helpers/renderToHtml";

const sourceDatabasePath = new URL("../../assets/MWU.db", import.meta.url)
  .pathname;

const stylesPath = new URL("../../styles.css", import.meta.url).pathname;

const structuredContent = (
  record: TermInformation,
): StructuredContent | null => {
  const definition = record[5][0];
  if (
    typeof definition !== "object" ||
    definition === null ||
    Array.isArray(definition) ||
    definition.type !== "structured-content"
  ) {
    return null;
  }
  return definition.content;
};

test("element keeps its noSemicolon sub-definition unprefixed", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "mwu-element-"));
  const attempt = await runBuild({
    requestedWords: ["element"],
    databasePath: sourceDatabasePath,
    buildPaths: {
      outputDirectory,
      reportPath: join(outputDirectory, "build-report.json"),
      stylesPath,
    },
  });

  expect(
    attempt.ok,
    attempt.ok ? "" : JSON.stringify(attempt.report.errors),
  ).toBe(true);
  if (!attempt.ok) return;

  const content = attempt.records
    .filter((record: TermInformation): boolean => record[0] === "element")
    .map(structuredContent)
    .find(
      (candidate: StructuredContent | null): candidate is StructuredContent =>
        candidate !== null,
    );
  expect(content).toBeDefined();
  if (content === undefined) return;

  const $ = cheerio.load(renderToHtml(content));
  const subDefinition = $(
    'span[data-sc-content="definition"][data-sc-level="3"]',
  )
    .filter((_, element) =>
      $(element)
        .text()
        .includes("one of a number of distinct or different groups or classes"),
    )
    .first();

  expect(subDefinition).toHaveLength(1);
  expect(
    subDefinition.children('[data-sc-content="sub-definition-separator"]'),
  ).toHaveLength(0);
  expect(subDefinition.text().startsWith("specifically :")).toBe(true);
}, 30_000);
