import * as cheerio from "cheerio";
import { TermEntryData } from ".";
import type { Element } from "domhandler";
import { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

export function parseDefinition($mean: cheerio.Cheerio<Element>): string[][] {
  // sb -> sb-num -> dt -> uns -> un -> dash & unText -> actual glosses & vis
  return $mean
    .find(".sb")
    .children()
    .get()
    .map((sbNum) => {
      const $sbNumCheerio = cheerio.load(sbNum);
      return $sbNumCheerio(".dt")
        .children()
        .get()
        .map((dt) => {
          const $dt = cheerio.load(dt);
          return $dt.text().trim();
        });
    });
}

function buildDefinitionStructuredContent(
  definitions: string[][]
): StructuredContent {
  return {
    tag: "div",
    data: {
      content: "definitions",
    },
    content: definitions.map((def) => ({
      tag: "ol",
      data: {
        content: "definition",
      },
      content: def.map((item) => ({
        tag: "li",
        data: {
          content: "gloss",
        },
        content: item,
      })),
    })),
  };
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
          content: [buildDefinitionStructuredContent(definitions)],
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
