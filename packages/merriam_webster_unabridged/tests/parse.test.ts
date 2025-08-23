import { expect, test, describe } from "bun:test";
import * as cheerio from "cheerio";
import { parser } from "../src/parser";
import { queryGivenWordRows, db } from "../src/db";

function loadXMLString(words: string[]): string[] {
  const rows = queryGivenWordRows(words, db);
  return rows.map((row) => row.m);
}

describe("parseDefinition", () => {
  test("should parse definition correctly with multiple definitions", () => {
    const xmlString = loadXMLString(["what"])[0];

    parser(xmlString);
  });
});
