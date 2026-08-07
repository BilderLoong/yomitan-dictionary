import { expect, test } from "bun:test";
import * as cheerio from "cheerio";

import { renderToHtml } from "../helpers/renderToHtml";
import { whatConverted } from "./fixtures";

const html = renderToHtml(whatConverted.content);
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

test("phrase summary lists every alternate spelling of what's what", () => {
  const phrases = $('details[data-sc-content="phrase"]');
  expect(phrases.length).toBeGreaterThan(0);
  const whatsWhat = phrases.filter((_, element) =>
    $(element).children("summary").first().text().startsWith("what's what"),
  );
  expect(whatsWhat.length).toBe(1);
  const summaryText = whatsWhat.children("summary").first().text();
  expect(summaryText).toBe("what's what or what is what or what was what");
});
