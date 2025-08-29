import * as cheerio from "cheerio";
import { TermEntryData } from ".";
import type { AnyNode, Element, NodeWithChildren } from "domhandler";
import { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

type NestArray<T> = Array<T | NestArray<T>>;

/**
 * Represents a sense tree structure.
 */
interface SenseNode {
  // The order matters.
  children: SenseNode[];
  data: SenseData[] | null;
}

/**
 * A single sense
 */
interface SenseData {
  text: string;
  examples: string[];
}
// Only use this as a wrapper.
const $ = cheerio.load("");

/**
 * level 1: sb
 * level 2: sb-num
 * level 3: dt
 * refer: https://gemini.google.com/app/f56168c9e9a5655e
 */
export function parseDefinition($mean: cheerio.Cheerio<Element>): SenseNode[] {
  const level1 = $mean
    .find(".sb")
    .get()
    .map<SenseNode>((sb) => {
      const $sb = $(sb);
      const level2 = $sb
        .children()
        .get()
        .map<SenseNode>((sbNum) => {
          const $sbNum = $(sbNum);
          const level3 = $sbNum
            .find(".sense")
            .get()
            .map((sense) => parseSenseForLevel3($(sense)));

          return {
            children: level3,
            data: [
              {
                text: getLevel2DefinitionText($sbNum),
                examples: [],
              },
            ],
          } as SenseNode;
        });

      return { children: level2, data: null };
    }, [] as SenseNode[]);

  return level1;
}

/**
 * Example of sense:
 *
 * ```
 * <div class="sense no-subnum"> <span class="sl">archaic </span>  <span class="dt"><strong class="mw_t_bc">: </strong>to use words <strong class="mw_t_bc">: </strong><a href="gdlookup://localhost/speak" class="mw_t_sx"><span class="text-uppercase">speak</span></a></span> </div>
 * ```
 *
 * ```
 * <div class="sense has-sn"> <span class="sn sense-i"><span class="letter">i</span> </span> <span class="sl">chiefly British </span>  <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used especially at the end of an utterance as a tag that is essentially meaningless but has the appearance of inviting agreement or disagreement with the statement just made<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;a clever play, <span class="mw_t_wi">what</span>&gt;</span></span></span></span></span></span> </span></span></div>
 * ```
 *
 * ```
 * <div class="sense has-sn has-subnum"> <span class="sn sense-1 a (1)"><span class="num">1</span> <span class="letter">a</span> <span class="sub-num">(1)</span></span> <span class="dt"><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">used in direct or indirect questions as an interrogative pronoun expressing inquiry about the identity of an object or matter<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> is this</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> did you say</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> are those things on the table</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> happened after that</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;tell me <span class="mw_t_wi">what</span> you are looking for&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;I wonder <span class="mw_t_wi">what</span> his motives were&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;he knows <span class="mw_t_wi">what</span> he should do&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;he knows <span class="mw_t_wi">what</span> to do&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;he's looking for something, but I don't know <span class="mw_t_wi">what</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;the controversy … centers largely on … who advocated <span class="mw_t_wi">what</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">Christian Science Monitor</em></span></span>&gt;</span></span></span></span></span><span class="un"><span class="mdash">—</span><span class="unText">often used by itself especially to ask for repetition of an utterance not properly heard or understood or to indicate that the speaker has heard someone addressing him or her and is ready to listen to whatever that person wishes to say</span></span><span class="un"><span class="mdash">—</span><span class="unText">often used in connection with another word or words to ask for repetition of the particular part of an utterance that has not been properly heard or understood<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t no-aq sents sents-block">&lt;found <span class="mw_t_wi">what</span>&gt;</span></span></span></span></span></span> </span></span></span></span></div>
 * ```
 */
function parseSenseForLevel3($sense: cheerio.Cheerio<Element>): SenseNode {
  const outerSense = extractOnlyOuterLevelSenseText($sense);

  const outerLevelExamples = extractOuterLevelExamples($sense);

  return {
    children: [],
    data: [
      {
        text: outerSense,
        examples: outerLevelExamples,
      },
      ...parseUns($sense.find(".uns")),
    ],
  };
}

/**
 * Extract examples from a sense, excluding examples within .uns elements
 */
export function extractOuterLevelExamples(
  $sense: cheerio.Cheerio<AnyNode>
): string[] {
  const $senseCopy = $sense.clone();
  // $senseCopy.find(".uns").remove();

  return $senseCopy
    .find(".ex-sent-group:not(.uns *)")
    .map((_, ex) =>
      $(ex)
        .text()
        .trim()
        .replace(/(^→ |^<|>$)/g, "")
        .trim()
    )
    .get();
}

/**
 * Parse .uns (usage notes) elements to extract additional sense data
 */
export function parseUns($uns: cheerio.Cheerio<AnyNode>): SenseData[] {
  return $uns
    .find(".un")
    .map((_, un) => {
      const $un = $(un);

      const text = extractUnText($un);
      const examples = extractUnExamples($un);

      return {
        text,
        examples,
      };
    })
    .get();
}

/**
 * Extract text from a .un element, excluding examples
 */
export function extractUnText($un: cheerio.Cheerio<AnyNode>): string {
  const $unCopy = $un.clone();
  $unCopy.find(".vis").remove();
  $unCopy.find(".un").remove();

  // console.log({
  //   before: $un.prop('outerHTML'),
  //   after: $unCopy.prop('outerHTML'),
  // });

  const text = $unCopy.text().trim();

  return text;
}

/**
 * Extract examples from a .un element
 */
function extractUnExamples($un: cheerio.Cheerio<Element>): string[] {
  return $un
    .find(".ex-sent-group")
    .map((_, exGroup) => $(exGroup).text().trim().replace(/^→ /, ""))
    .get();
}

export function getLevel2DefinitionText(
  $sbNum: cheerio.Cheerio<Element>
): string {
  return $sbNum.find(".sen").contents().not(".sn").text().trim();
}

/**
 * extract and format definition from `.dt`.
 */
export function extractOnlyOuterLevelSenseText(
  $sense: cheerio.Cheerio<Element>
): string {
  const senseCopy = $sense.clone();
  senseCopy.find(".ex-sent-group").remove();
  senseCopy.find(".uns").remove();
  senseCopy.find(".sn").remove();

  const raw = senseCopy.contents().text();
  return raw.trim().replace(/^: /, "").replaceAll(/ *: /g, ": ").trim();
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
  ): StructuredContent[] {
    return [];
  }
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
        detailedDefinitions: [],
        sequenceNumber: superscript ? parseInt(superscript, 10) : undefined,
        termTags: undefined,
      };
    })
    .toArray<TermEntryData>();
}
