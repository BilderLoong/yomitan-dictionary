import * as cheerio from "cheerio";
import { TermEntryData } from ".";


export function parseDefinition(
  mean:,
  $: cheerio.CheerioAPI
): TermEntryData["detailedDefinitions"] {
  const definitions: TermEntryData["detailedDefinitions"] = [];
  const $mean = $(mean);

  return definitions; // Return the array of definitions
}

/**
 * Parse the definition HTML into a TermEntryData
 * @param definitionHTML
 */
export function parser(definitionHTML: string): TermEntryData[] | { error: string } {
  const $ = cheerio.load(definitionHTML);
  const entries: TermEntryData[] = [];

  if (!$("mean").length) {
    return { error: "No <mean> found." };
  }

  $("mean").each((_, mean) => {
    const $mean = $(mean);

    // Find the headword (term) and its superscript number if present
    const headword = $mean.find(".hword").text().trim();
    const superscript = $mean.find(".hword sup").text().trim() || "";

    // Find part of speech
    const partOfSpeech = $mean.find(".fl").text().trim();

    // Find pronunciation
    const pronunciation = $mean.find(".pr").text().trim();

    // Find definitions
    const definitions = parseDefinition(mean, $);

    entries.push({
      term: headword || "Unknown term",
      reading: pronunciation || undefined,
      definitionTags: partOfSpeech || undefined,
      deinflectors: undefined,
      popularity: undefined,
      detailedDefinitions: definitions,
      sequenceNumber: superscript ? parseInt(superscript, 10) : undefined,
      termTags: undefined,
    });
  });

  return entries;
}
