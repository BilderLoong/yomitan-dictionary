import { expect, test } from "bun:test";
import * as cheerio from "cheerio";

import { renderToHtml } from "../helpers/renderToHtml";
import { capeConverted } from "./fixtures";

const $ = cheerio.load(renderToHtml(capeConverted.content));

test("keeps the parent-sense alternate form and origin note in one flow", () => {
  const sense = $('li[data-sc-source-marker-path="2"]')
    .filter((_, element) =>
      $(element).text().includes("Cape of Good Hope Province"),
    )
    .first();
  expect(sense.length).toBe(1);

  const childSenseList = sense.children('ol[data-sc-content="mwu-level"]');
  expect(childSenseList.length).toBe(1);

  const parentSenseContent = sense.children().not(childSenseList);
  expect(parentSenseContent.length).toBe(1);
  expect(parentSenseContent.attr("data-sc-content")).toBe("sense-prefix");
  expect(parentSenseContent.text().replace(/\s+/gu, " ").trim()).toBe(
    "Cape [from Cape of Good Hope]",
  );

  const directVisibleText = sense
    .contents()
    .filter(
      (_, node): boolean => node.type === "text" && node.data.trim().length > 0,
    );
  expect(directVisibleText.length).toBe(0);
});
