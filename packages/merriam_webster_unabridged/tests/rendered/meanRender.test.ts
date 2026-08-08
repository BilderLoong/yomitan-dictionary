import { expect, test } from "bun:test";
import * as cheerio from "cheerio";

import { renderToHtml } from "../helpers/renderToHtml";
import { turnConverted, whatConverted } from "./fixtures";
import { meanFragments } from "./meanFragments";

/**
 * Per-mean render contract, ported from the storybook per-mean stories:
 * every numbered mean renders its sense subtree with no leaked source
 * targets and collapses its extra examples behind one inline example.
 * The storybook layer keeps only the visual inspection role.
 */

for (const [entry, converted] of [
  ["what", whatConverted],
  ["turn", turnConverted],
] as const) {
  for (const fragment of meanFragments(converted.content)) {
    const html = renderToHtml(fragment.node);
    const $ = cheerio.load(html);

    test(`${entry} mean ${fragment.label} renders its sense subtree`, () => {
      expect($('[data-sc-content="sense-number"]').length).toBeGreaterThan(0);
      expect(html).not.toContain("gdlookup://");
      expect(html).not.toContain("bword://");

      const extras = $('details[data-sc-content="extra-examples"]');
      extras.each((_, element) => {
        const details = $(element);
        expect(details.attr("open")).toBeUndefined();
        const count = details.find(
          '[data-sc-content="example-sentence"]',
        ).length;
        const label = `${count} more ${count === 1 ? "example" : "examples"}`;
        expect(details.children("summary").first().text()).toBe(label);
      });

      const hasExamples = $('[data-sc-content="example-sentence"]').length > 0;
      if (hasExamples) {
        const inline = $('[data-sc-content="example-sentence"]').not(
          'details[data-sc-content="extra-examples"] [data-sc-content="example-sentence"]',
        );
        expect(inline.length).toBeGreaterThan(0);
      }
    });
  }
}
