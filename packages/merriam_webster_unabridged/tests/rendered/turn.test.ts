import { expect, test } from "bun:test";
import * as cheerio from "cheerio";

import { renderToHtml } from "../helpers/renderToHtml";
import { turnConverted } from "./fixtures";

const html = renderToHtml(turnConverted.content);
const $ = cheerio.load(html);

test("collapses extra example sentences behind exactly one inline example", () => {
  const extras = $('details[data-sc-content="extra-examples"]');
  expect(extras.length).toBeGreaterThan(0);
  extras.each((_, element) => {
    const details = $(element);
    expect(details.attr("open")).toBeUndefined();
    const count = details.find('[data-sc-content="example-sentence"]').length;
    const label = `${count} more ${count === 1 ? "example" : "examples"}`;
    expect(details.children("summary").first().text()).toBe(label);
  });
  const inline = $('[data-sc-content="example-sentence"]').not(
    'details[data-sc-content="extra-examples"] [data-sc-content="example-sentence"]',
  );
  expect(inline.length).toBeGreaterThan(0);
});

test("transitive verb sense 1a collapses its five example sentences", () => {
  const definition = $(
    'li[data-sc-content="sense-number"][data-sc-source-marker="1"] ' +
      'li[data-sc-content="subsense-letter"][data-sc-source-marker="a"] ' +
      '[data-sc-content="definition"]',
  ).first();
  expect(definition.length).toBe(1);

  const inline = definition
    .find('[data-sc-content="example-sentence"]')
    .not(
      'details[data-sc-content="extra-examples"] [data-sc-content="example-sentence"]',
    );
  expect(inline.length).toBe(1);
  expect(inline.first().text()).toContain("turn a wheel");

  const extras = definition.children(
    'details[data-sc-content="extra-examples"]',
  );
  expect(extras.length).toBe(1);
  expect(extras.attr("open")).toBeUndefined();
  expect(extras.children("summary").first().text()).toBe("4 more examples");
  const extrasText = extras.text();
  expect(extrasText).toContain("turn a crank");
  expect(extrasText).toContain("great wheel turns its axle");
  expect(extrasText).toContain("50,000 revolutions per minute");
  expect(extrasText).toContain("hold and turn a miner's drill");
});
