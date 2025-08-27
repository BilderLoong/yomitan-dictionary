import { expect, test, describe } from "bun:test";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import {
  getLevel2DefinitionText,
  getLevel3DefinitionText,
  parseDefinition,
} from "../src/parser";
import { queryGivenWordRows, db } from "../src/db";

function loadXMLString(words: string[]): string[] {
  const rows = queryGivenWordRows(words, db);
  return [...rows].map((row) => row.m);
}

describe("word", () => {
  const xmlString = loadXMLString(["word"])[0];
  const $ = cheerio.load(xmlString);
  const meanElement = $("mean")[0];

  expect(meanElement).toBeDefined();

  describe("parseDefinition", () => {
    test("should parse definition correctly with multiple definitions", () => {
      const res = JSON.stringify(parseDefinition($(meanElement)), null, 2);
      pbcopy(res);
    });

    describe("getLevel3DefinitionText", () => {
      test("should extract and format definition text correctly", () => {
        const dtElement = $(meanElement).find(".dt")[0];
        expect(dtElement).toBeDefined();

        const res = getLevel3DefinitionText($(dtElement));
        expect(res).toBe("something that is said: utterance, statement");
      });
    });

    describe("getLevel2DefinitionText", () => {
      test("should extract and format definition text correctly", () => {
        const sb1 = $(meanElement).find(".sb:nth-of-type(1) .sb-1")[0];
        expect(sb1).toBeDefined();

        const res = getLevel2DefinitionText($(sb1));
        expect(res).toBe("words plural");

        const sb2 = $(meanElement).find(".sb:nth-of-type(4) .sb-0")[0];
        expect(sb2).toBeDefined();

        const res2 = getLevel2DefinitionText($(sb2));
        expect(res2).toBe("or Word of God");
      });
    });
  });
});

function pbcopy(data) {
  var proc = require("child_process").spawn("pbcopy");
  proc.stdin.write(data);
  proc.stdin.end();
}
