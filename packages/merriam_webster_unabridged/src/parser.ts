import * as cheerio from "cheerio";
import { TermEntryData } from ".";
import type { Element } from "domhandler";
import { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

type NestArray<T> = Array<T | NestArray<T>>;

/**
 * Represents a sense tree structure.
 */
interface SenseTree {
  // The order matters.
  children: SenseTree[];
  data: Sense | null;
}

/**
 * A single sense
 */
interface Sense {
  definition: string;
  examples: string[];
}
// Only use this as a wrapper.
const $ = cheerio.load("");

/**
 * level 1: sb
 * level 2: sb-num
 * level 3: dt
 */
export function parseDefinition($mean: cheerio.Cheerio<Element>): SenseTree[] {
  const level1 = $mean
    .find(".sb")
    .get()
    .map((sb) => {
      const $sb = $(sb);
      const level2 = $sb
        .children()
        .get()
        .map((sbNum) => {
          const $sbNum = $(sbNum);
          const level3 = $sbNum
            .find(".dt")
            .get()
            .map((dt) => parseDtForLevel3($(dt)));

          return {
            children: level3,
            level: 2,
            data: {
              definition: getLevel2DefinitionText($sbNum),
              examples: [],
            },
          };
        });

      return { level: 1, children: level2, data: null };
    }, [] as SenseTree[]);

  return level1;

  function parseDtForLevel3($dt: cheerio.Cheerio<Element>): SenseTree {
    const definitionText = getLevel3DefinitionText($dt);

    const examples = $dt
      .find(".ex-sent-group")
      .map((_, ex) => $(ex).text().trim().replace(/^→ /, ""))
      .get();

    return {
      children: [],
      data: {
        definition: definitionText,
        examples,
      },
    };
  }
}

export function getLevel2DefinitionText(
  $sbNum: cheerio.Cheerio<Element>
): string {
  return $sbNum.find(".sen").contents().not(".sn").text().trim();
}

/**
 * extract and format definition from `.dt`.
 */
export function getLevel3DefinitionText(dt: cheerio.Cheerio<Element>): string {
  const dtCopy = dt.clone();
  dtCopy.find(".ex-sent-group").remove();

  const raw = dtCopy.contents().text();
  return raw.trim().replace(/^: /, "").replace(/ : /, ": ").trim();
}

function buildDefinitionStructuredContentFromNestedSense(
  definitions: NestArray<string>
): StructuredContent {
  return {
    tag: "div",
    data: {
      content: "definitions",
    },
    content: createNestStructuredContentListFromNestArray(definitions),
  };

  function createNestStructuredContentListFromNestArray(
    nestedArray: NestArray<string>
  ): StructuredContent[] {}
}

function buildDetailedDefinition(
  definitions: string[][]
): TermEntryData["detailedDefinitions"] {
  return [
    {
      type: "structured-content",
      content: [
        {
          tag: "div",
          data: {
            content: "detailed-definition",
          },
          content: [],
        },
      ],
    },
  ];
}

/**
 * Parse the definition HTML into a TermEntryData
 * @param definitionHTML
 */
export function parser(
  definitionHTML: string
): TermEntryData[] | { error: string } {
  const $ = cheerio.load(definitionHTML);
  // const entries: TermEntryData[] = [];

  if (!$("mean").length) {
    return { error: "No `<mean>` found." };
  }

  return $("mean")
    .map((_, mean) => {
      const $mean = $(mean);
      // Find the headword (term) and its superscript number if present
      const headword = $mean.find(".hword").text().trim();
      // const $mean_1 = cheerio.load(mean);
      // // Find the headword (term) and its superscript number if present
      // const headword_1 = $mean_1(".hword").text().trim();
      // // Both methods yield the same headword
      // console.assert(headword === headword_1);

      const superscript = $mean.find(".hword sup").text().trim() || "";

      // Find part of speech
      const partOfSpeech = $mean.find(".fl").text().trim();

      // Find pronunciation
      const pronunciation = $mean.find(".pr").text().trim();

      // Find definitions
      // `$(mean) convert raw `Element` to Cheerio Element`,
      // it's context free wrapper which means
      // what `$` loads doesn't matter.

      const definitions = parseDefinition($mean);

      return {
        term: headword || "Unknown term",
        reading: pronunciation || undefined,
        definitionTags: partOfSpeech || undefined,
        deinflectors: undefined,
        popularity: undefined,
        detailedDefinitions: buildDetailedDefinition(definitions),
        sequenceNumber: superscript ? parseInt(superscript, 10) : undefined,
        termTags: undefined,
      };
    })
    .toArray<TermEntryData>();
}
