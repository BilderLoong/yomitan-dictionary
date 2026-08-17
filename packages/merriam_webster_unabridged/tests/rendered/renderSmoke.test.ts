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

  test(`${term} uses the first example as the summary and keeps the rest in the body`, () => {
    const extras = $('details[data-sc-content="extra-examples"]');
    extras.each((_, element) => {
      const details = $(element);
      expect(details.attr("open")).toBeUndefined();
      const summary = details.children("summary").first();
      expect(summary.find('[data-sc-content="example-sentence"]').length).toBe(
        1,
      );
      expect(summary.text()).not.toMatch(/\d+ more examples?/u);
      expect(
        details.children('[data-sc-content="example-sentence"]').length,
      ).toBe(details.find('[data-sc-content="example-sentence"]').length - 1);
    });
  });
}
