import { expect, test } from "bun:test";
import * as cheerio from "cheerio";

import { renderToHtml } from "../helpers/renderToHtml";
import { allConverted } from "./fixtures";

for (const converted of allConverted) {
  const term = converted.plan.term;
  const html = renderToHtml(converted.content);
  const $ = cheerio.load(html);

  test(`${term} renders the entry without leaking source targets`, () => {
    expect(html).toContain('data-sc-content="mwu-entry"');
    expect(html).not.toContain("gdlookup://");
    expect(html).not.toContain("bword://");
  });

  test(`${term} keeps every extra-examples group collapsed behind one inline example`, () => {
    const extras = $('details[data-sc-content="extra-examples"]');
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
    if ($('[data-sc-content="example-sentence"]').length > 0) {
      expect(inline.length).toBeGreaterThan(0);
    }
  });
}
