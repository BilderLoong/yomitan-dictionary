import Database from "bun:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

/**
 * Read-only source evidence helper for the manual design fixture.
 *
 * This tool extracts source fragments for human review. It does not emit a
 * term bank, choose Yomitan tags, or run during ZIP packaging.
 */

interface SenseFragment {
  marker: string;
  text: string;
  labels: string[];
  examples: ExampleFragment[];
}

interface ExampleFragment {
  text: string;
  targets: string[];
}

interface SenseBlockFragment {
  marker: string;
  prefixText: string;
  alternatives: PhraseAlternativeFragment[];
  senses: SenseFragment[];
}

interface SenseGroupFragment {
  label: string;
  blocks: SenseBlockFragment[];
}

interface DefinedPhraseFragment {
  term: string;
  partOfSpeech: string;
  alternatives: PhraseAlternativeFragment[];
  senseGroups: SenseGroupFragment[];
}

interface PhraseAlternativeFragment {
  qualifier: string;
  term: string;
}

interface MeanFragment {
  index: number;
  headword: string;
  homographNumber?: string;
  partOfSpeech: string;
  entryQualifiers: string[];
  variantReference: string;
  usageDiscussionReferences: string[];
  pronunciation: string;
  inflections: string;
  origin: string;
  senseGroups: SenseGroupFragment[];
  definedPhrases: DefinedPhraseFragment[];
  superscripts: string[];
}

interface SourceFragmentReport {
  rowId: number;
  sourceKey: string;
  lookup: string;
  means: MeanFragment[];
}

interface WordRow {
  id: number;
  w: string;
  m: string;
}

const databasePath = path.resolve(import.meta.dirname, "../assets/MWU.db");
const defaultOutputPath = path.resolve(
  import.meta.dirname,
  "../build/design-what/mwu-source-fragments.json",
);

const cleanText = (value: string): string => value.replace(/\s+/g, " ").trim();

const textOf = (
  $: cheerio.CheerioAPI,
  element: cheerio.Element | undefined,
): string => (element === undefined ? "" : cleanText($(element).text()));

const firstText = (
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<cheerio.Element>,
  selector: string,
): string => textOf($, root.find(selector).first().get(0));

const sourceSenseGroups = (
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<cheerio.Element>,
): SenseGroupFragment[] =>
  root
    .filter(".vg")
    .add(root.find(".vg"))
    .toArray()
    .map((group) => ({
      label: firstText($, $(group), ".vd em, .sls .sl"),
      blocks: $(group)
        .children(".sb")
        .map((_, block) => ({
          marker: firstText($, $(block), ".sn"),
          prefixText: (() => {
            const prefix = $(block)
              .children(".sb-0")
              .find("> .sen")
              .first()
              .clone();
            prefix.find(".sn").remove();
            prefix.find(".vr").remove();
            return cleanText(prefix.text());
          })(),
          alternatives: $(block)
            .children(".sb-0")
            .find("> .sen > .vr")
            .find(".va")
            .toArray()
            .map((alternative) => ({
              qualifier: firstText($, $(alternative).parent(), ".vl"),
              term: textOf($, alternative),
            })),
          senses: $(block)
            .children("[class^=sb-]")
            .children(".sense")
            .toArray()
            .map((sense) => {
              const senseCopy = $(sense).clone();
              const labels = senseCopy
                .find("> .sl, > .sls .sl, > .sgram, > .lb")
                .toArray()
                .map((label) => textOf($, label));
              const examples = senseCopy
                .find(".ex-sent-group")
                .toArray()
                .map((example) => ({
                  text: textOf($, example),
                  targets: $(example)
                    .find(".mw_t_wi")
                    .toArray()
                    .map((target) => textOf($, target)),
                }));
              senseCopy.find(".ex-sent-group").remove();
              senseCopy.find(".sn").remove();
              senseCopy.find("> .sl, > .sls .sl, > .sgram, > .lb").remove();
              return {
                marker: firstText($, $(sense), ".sn"),
                text: cleanText(senseCopy.text()),
                labels,
                examples,
              };
            }),
        }))
        .get()
        .filter(({ senses }) => senses.length > 0)
        .map((block) => ({
          ...block,
          marker: block.marker || block.senses[0]?.marker || "",
        }))
        .filter(({ senses }) => senses.length > 0),
    }))
    .filter(({ blocks }) => blocks.length > 0);

const sourceDefinedPhrases = (
  $: cheerio.CheerioAPI,
  mean: cheerio.Element,
): DefinedPhraseFragment[] =>
  $(mean)
    .find(".drp")
    .toArray()
    .map((phrase) => {
      const phraseNode = $(phrase);
      const definition = phraseNode.nextUntil(".drp").filter(".vg").first();
      const alternatives = phraseNode
        .nextUntil(".drp")
        .filter(".vr")
        .find(".va")
        .toArray()
        .map((alternative) => ({
          qualifier: firstText($, $(alternative).parent(), ".vl"),
          term: textOf($, alternative),
        }));
      return {
        term: textOf($, phrase),
        partOfSpeech: firstText($, definition, ".fl, .vd"),
        alternatives,
        senseGroups: sourceSenseGroups($, definition),
      };
    });

const sourceMean = (
  $: cheerio.CheerioAPI,
  mean: cheerio.Element,
  index: number,
): MeanFragment => {
  const root = $(mean);
  const headword = root.find(".hword").first();
  const homographNumber = textOf($, headword.find("sup").first());
  return {
    index,
    headword: firstText($, root, ".hword"),
    ...(homographNumber.length > 0 ? { homographNumber } : {}),
    partOfSpeech: firstText($, root, ".hword .fl, .entry-header .fl"),
    entryQualifiers: root
      .find(".entry-header .lbs .lb")
      .toArray()
      .map((label) => textOf($, label)),
    variantReference: firstText($, root, ".cxl-ref"),
    usageDiscussionReferences: root
      .find(".urefs")
      .toArray()
      .map((reference) => textOf($, reference)),
    pronunciation: firstText($, root, ".prs"),
    inflections: firstText($, root, ".vg-ins"),
    origin: firstText($, root, '.section[data-id="origin"] .et'),
    senseGroups: sourceSenseGroups(
      $,
      root.find('.section[data-id="definition"] > .def-wrapper'),
    ),
    definedPhrases: sourceDefinedPhrases($, mean),
    superscripts: root
      .find("sup")
      .toArray()
      .map((superscript) => textOf($, superscript)),
  };
};

const reportForRow = (row: WordRow): SourceFragmentReport => {
  const $ = cheerio.load(row.m, {}, false);
  return {
    rowId: row.id,
    sourceKey: row.w,
    lookup: decodeURIComponent(row.w),
    means: $("mean")
      .toArray()
      .map((mean, index) => sourceMean($, mean, index)),
  };
};

const parseArguments = (
  args: string[],
): { lookups: string[]; outputPath: string } => {
  const outputIndex = args.indexOf("--output");
  const outputArg = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  const outputPath =
    outputArg !== undefined ? path.resolve(outputArg) : defaultOutputPath;
  const lookups = args
    .filter(
      (argument, index) =>
        argument !== "--output" &&
        (outputIndex < 0 || index !== outputIndex + 1) &&
        !argument.startsWith("--"),
    )
    .map((lookup) => lookup);
  return { lookups: lookups.length > 0 ? lookups : ["set"], outputPath };
};

const main = async (): Promise<void> => {
  const { lookups, outputPath } = parseArguments(Bun.argv.slice(2));
  const database = new Database(databasePath, { readonly: true });
  const placeholders = lookups.map(() => "?").join(",");
  const rows = database
    .query<WordRow, string[]>(
      `SELECT id, w, m FROM word WHERE w IN (${placeholders}) ORDER BY id`,
    )
    .all(...lookups);
  const report = rows.map(reportForRow);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${outputPath} (${report.length} source rows)`);
};

if (import.meta.main) await main();
