import { expect, test } from "bun:test";
import * as cheerio from "cheerio";

import { renderToHtml } from "../helpers/renderToHtml";
import { runConverted } from "./fixtures";

const $ = cheerio.load(renderToHtml(runConverted.content));

test("run keeps its noSemicolon also sub-definition unprefixed", () => {
  const subDefinition = $(
    'span[data-sc-content="definition"][data-sc-level="3"]',
  )
    .filter((_, element) =>
      $(element).text().includes("to finish a race in a specified place"),
    )
    .first();
  const separator = subDefinition.children(
    '[data-sc-content="sub-definition-separator"]',
  );

  expect(subDefinition.length).toBe(1);
  expect(separator).toHaveLength(0);
  expect(
    subDefinition
      .text()
      .startsWith("also : to finish a race in a specified place"),
  ).toBe(true);
});
