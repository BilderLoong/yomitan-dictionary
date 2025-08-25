import { expect, test, describe } from "bun:test";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { getDefinitionTextFromDt, parseDefinition } from "../src/parser";
import { queryGivenWordRows, db } from "../src/db";

function loadXMLString(words: string[]): string[] {
  const rows = queryGivenWordRows(words, db);
  return [...rows].map((row) => row.m);
}

describe("parseDefinition", () => {
  test("should parse definition correctly with multiple definitions", () => {
    const xmlString = loadXMLString(["word"])[0];
    const $ = cheerio.load(xmlString);
    const meanElement = $("mean")[0];
    if (meanElement) {
      const res = JSON.stringify(parseDefinition($(meanElement)), null, 2);
      if (res) {
        pbcopy(res);
      }
      console.log(res);
    }
  });
});

describe("getDefinitionTextFromDt", () => {
  test("should extract and format definition text correctly", () => {
    const xmlString = loadXMLString(["word"])[0];
    const $ = cheerio.load(xmlString);
    const meanElement = $("mean")[0];
    if (meanElement) {
      const dtElement = $(meanElement).find(".dt")[0];
      if (dtElement) {
        const res = getDefinitionTextFromDt($(dtElement));
        expect(res).toBe("something that is said : utterance, statement");
      }
    }
  });
});

function pbcopy(data) {
  var proc = require("child_process").spawn("pbcopy");
  proc.stdin.write(data);
  proc.stdin.end();
}
