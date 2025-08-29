import { expect, test, describe, it } from "bun:test";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import {
  getLevel2DefinitionText,
  extractOnlyOuterLevelSenseText,
  parseDefinition,
  parseUns,
  extractOuterLevelExamples,
  extractUnText,
} from "../src/parser";
import { queryGivenWordRows, db } from "../src/db";

function loadXMLString(words: string[]): string[] {
  const rows = queryGivenWordRows(words, db);
  return [...rows].map((row) => row.m);
}

describe("word", () => {
  const xmlString = loadXMLString(["word"])[0];
  const $ = cheerio.load(xmlString);
  const $means = $("mean");
  expect($means.length).toBe(2);

  const word1MeanElement = $means[0];
  const word2MeanElement = $means[1];

  expect(word1MeanElement).toBeDefined();
  expect(word2MeanElement).toBeDefined();

  describe("parseDefinition", () => {
    describe("extractOnlyOuterLevelSenseText", () => {
      test("should extract and format definition text correctly without `.sense .sl`", () => {
        const targetSenseEle = $(word1MeanElement).find(".sense")[0];
        expect(targetSenseEle).toBeDefined();

        const res = extractOnlyOuterLevelSenseText($(targetSenseEle));
        expect(res).toBe("something that is said: utterance, statement");
      });

      test("should extract and format definition text correctly with `.sense .sl`", () => {
        const targetSenseEle = $(word2MeanElement).find(".sense")[0];
        expect(targetSenseEle).toBeDefined();

        const res = extractOnlyOuterLevelSenseText($(targetSenseEle));
        expect(res).toBe("archaic: to use words: speak");
      });
    });

    describe("getLevel2DefinitionText", () => {
      test("should extract and format definition text correctly", () => {
        const sb1 = $(word1MeanElement).find(".sb:nth-of-type(1) .sb-1")[0];
        expect(sb1).toBeDefined();

        const res = getLevel2DefinitionText($(sb1));
        expect(res).toBe("words plural");

        const sb2 = $(word1MeanElement).find(".sb:nth-of-type(4) .sb-0")[0];
        expect(sb2).toBeDefined();

        const res2 = getLevel2DefinitionText($(sb2));
        expect(res2).toBe("or Word of God");
      });
    });
  });
});

describe("what", () => {
  const xmlString = loadXMLString(["what"])[0];
  const $ = cheerio.load(xmlString);
  const $means = $("mean");

  describe("extractOuterLevelExamples", () => {
    it("should extract outer level examples correctly", () => {
      const senseStr = `<div class="sense has-sn"> <span class="sn sense-3 a"><span class="num">3</span> <span class="letter">a</span> </span> <span class="dt"><strong class="mw_t_bc">: </strong>that which <strong class="mw_t_bc">: </strong>those which <strong class="mw_t_bc">: </strong>those things that <strong class="mw_t_bc">: </strong>those who or whom <strong class="mw_t_bc">: </strong>the one or ones that <span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;the wind was … blowing in a direction opposite to <span class="mw_t_wi">what</span> would carry the sparks to the lumber<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — W. L. Moore †1927</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;any imposts or duties on imports or exports, except <span class="mw_t_wi">what</span> may be absolutely necessary for executing its inspection laws<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">U.S. Constitution</em></span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;attributed it to the folly of <span class="mw_t_wi">what</span> he conceived to be irresponsible demagogues<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Robert White</span></span>&gt;</span></span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;has no income but <span class="mw_t_wi">what</span> he gets from his writings&gt;</span></span><span class="ex-sent-group"> <span class="ex-sent t no-aq sents sents-block">&lt;have no children but <span class="mw_t_wi">what</span> you see here&gt;</span></span><span class="uns"><span class="un"><span class="mdash">—</span><span class="unText">sometimes used parenthetically or at the beginning of a sentence in reference to a clause or phrase that is yet to come or is not yet complete<span class="vis"> <span class="vi"><span class="ex-sent-group"> <span class="ex-sent first-child t has-aq sents sents-block">&lt;but, <span class="mw_t_wi">what</span> more amazed him, his wife had willingly accompanied their flight<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — John Dryden</span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;the number of summonses jumped … at a rate of close to 200,000 a year. <span class="mw_t_wi">What'</span> s more, the magistrates … give stiffened fines<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — G. S. Perry</span></span>&gt;</span></span></span></span><span class="vi"><span class="ex-sent-group"> <span class="ex-sent t has-aq sents sents-block">&lt;he brought also, <span class="mw_t_wi">what</span> is rarer than depth of moralism, an art finely rounded<span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="auth hidden"> — Carl Van Doren</span></span>&gt;</span></span></span></span></span></span> <span class="dx-jump"> — compare <a href="gdlookup://localhost/which?gdanchor=hw2" class="mw_t_dxt"> <sup>2</sup><span class="text-uppercase">which</span></a> <span class="text-lowercase">3</span></span></span> </span></span></div>`;
      const $sense = loadHtmlStr(senseStr);

      const res = extractOuterLevelExamples($sense);

      expect(res.length).toEqual(5);
      expect(res[0]).toBe(
        "the wind was … blowing in a direction opposite to what would carry the sparks to the lumber — W. L. Moore †1927"
      );
      expect(res[4]).toBe("have no children but what you see here");
    });
  });

  describe("parseUns", () => {
    test("extractUnText: should extract inner .un text correctly.", () => {
      const $un = loadHtmlStr(
        `<span class="un"><span class="mdash">—</span><span class="unText">often used by itself especially to ask for repetition of an utterance not properly heard or understood or to indicate that the speaker has heard someone addressing him or her and is ready to listen to whatever that person wishes to say</span></span>`
      );

      // console.log({ testBefore: $un.prop("outerHTML") });
      // $un.find(".un").remove();
      // console.log({ testAfter: $un.prop("outerHTML") });

      const res = extractUnText($un);

      expect(res).toBe(
        "—often used by itself especially to ask for repetition of an utterance not properly heard or understood or to indicate that the speaker has heard someone addressing him or her and is ready to listen to whatever that person wishes to say"
      );
    });

    test("extractUnText: should extract outer .un text correctly.", () => {
      const $un = loadHtmlStr(
        `<span class="un"><span class="mdash">—</span><span class="unText">used in direct or indirect questions as an interrogative pronoun expressing inquiry about the identity of an object or matter<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> is this</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> did you say</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> are those things on the table</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;<span class="mw_t_sp"><span class="mw_t_wi">what</span> happened after that</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;tell me <span class="mw_t_wi">what</span> you are looking for&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;I wonder <span class="mw_t_wi">what</span> his motives were&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;he knows <span class="mw_t_wi">what</span> he should do&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;he knows <span class="mw_t_wi">what</span> to do&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t no-aq sents sents-block">&lt;he's looking for something, but I don't know <span class="mw_t_wi">what</span>&gt;</span></span></span><span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent t has-aq sents sents-block">&lt;the controversy … centers largely on … who advocated <span class="mw_t_wi">what</span><span class="ex-sent aq has-aq sents" style="margin-left: 0px;"><span class="aq"><span class="source hidden"> — <em class="mw_t_it">Christian Science Monitor</em></span></span>&gt;</span></span></span></span></span><span class="un"><span class="mdash">—</span><span class="unText">often used by itself especially to ask for repetition of an utterance not properly heard or understood or to indicate that the speaker has heard someone addressing him or her and is ready to listen to whatever that person wishes to say</span></span><span class="un"><span class="mdash">—</span><span class="unText">often used in connection with another word or words to ask for repetition of the particular part of an utterance that has not been properly heard or understood<span class="vis" hidden=""> <span class="vi"><span class="ex-sent-group" hidden=""> <span class="ex-sent first-child t no-aq sents sents-block">&lt;found <span class="mw_t_wi">what</span>&gt;</span></span></span></span></span></span> </span></span>`
      );

      const res = extractUnText($un);

      expect(res).toBe(
        "—used in direct or indirect questions as an interrogative pronoun expressing inquiry about the identity of an object or matter"
      );
    });

    it("should parse usage notes correctly", () => {
      const $targetUns = $means.first().find(".uns").first();

      expect($targetUns).toBeDefined();

      const result = parseUns($targetUns);

      expect(result.length).toEqual(3);

      expect(result[0].examples.length).toBe(11);
      expect(result[0].examples[0]).toBe("what is this");
      expect(result[0].text).toBe(
        "—used in direct or indirect questions as an interrogative pronoun expressing inquiry about the identity of an object or matter"
      );

      expect(result[1].examples.length).toBe(0);

      expect(result[2].examples.length).toBe(1);
    });
  });
});

function pbcopy(data: string) {
  var proc = require("child_process").spawn("pbcopy");
  proc.stdin.write(data);
  proc.stdin.end();
}

function loadHtmlStr(input: string) {
  /**
  * Below two method doesn't work well, cause it return `Cheerio<Document>` whose `find()` method behaves differently.
  * `Cheerio<Document>.find()` result will include the outer most html tag, however `Cheerio<Element>.find()` does not.
  * cheerio.load(input).root();
  * cheerio.load(input, {}, false).root();
  */
  return cheerio.load(input)("body > *");
}
