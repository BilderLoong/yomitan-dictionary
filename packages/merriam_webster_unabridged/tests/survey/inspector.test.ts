import { expect, test } from "bun:test";

import { buildInventory, inspectWordHtml } from "../../src/survey/inspector";

const FIXTURE_HTML =
  '<mean><div class="page-content">' +
  '<div class="row entry-header"><h1 class="hword"><sup>1</sup>what</h1>' +
  '<span class="fl">pronoun</span></div>' +
  '<div class="section" data-id="definition">' +
  '<div class="vg"><div class="sense"><span class="dt">: a question' +
  '<span class="ex-sent-group"><span class="ex-sent">→ <span class="mw_t_wi">what</span> is it</span></span>' +
  "</span></div></div></div></div></mean>";

test("classifies known units, presentation wrappers, and unknown classes", () => {
  const survey = inspectWordHtml("what", 1, FIXTURE_HTML);

  const units = survey.findings.map(({ informationName }) => informationName);
  expect(units).toContain("headword-display");
  expect(units).toContain("part-of-speech");
  expect(units).toContain("definition");
  expect(units).toContain("example-sentence");
  expect(units).toContain("target-highlight");

  const presentation = survey.findings.find(
    ({ sourceSelectorOrTag }) => sourceSelectorOrTag === "div.row.entry-header",
  );
  expect(presentation?.findingSection).toBe("notNeeded");
  expect(presentation?.parserStatus).toBe("recognized");

  const unknown = inspectWordHtml(
    "what",
    1,
    FIXTURE_HTML.replace(
      "</div></div></div></div></mean>",
      "<puzzle-tag/>",
    ),
  );
  const unrecognized = unknown.findings.find(
    ({ sourceSelectorOrTag }) => sourceSelectorOrTag === "puzzle-tag",
  );
  expect(unrecognized).toMatchObject({
    informationName: "unclassified-visible-content",
    parserStatus: "unrecognized",
    findingSection: "notYetNoticed",
    boundTo: "div.sense",
  });
});

test("reports ignored units in the not-needed section", () => {
  const survey = inspectWordHtml(
    "hand",
    2,
    '<mean><div class="entry-status"><img src="x.jpg" alt="status"/></div></mean>',
  );
  const statusImage = survey.findings.find(
    ({ informationName }) => informationName === "entry-status-image",
  );
  expect(statusImage?.findingSection).toBe("notNeeded");
});

test("builds an inventory with example words and unknown selectors", () => {
  const surveys = [
    inspectWordHtml("what", 1, FIXTURE_HTML),
    inspectWordHtml(
      "who",
      2,
      FIXTURE_HTML.replace("what", "who") + "<puzzle-tag/>",
    ),
  ];
  const inventory = buildInventory(surveys);

  const definition = inventory.entries.find(
    ({ unit }) => unit === "definition",
  );
  expect(definition?.rowCount).toBe(2);
  expect(definition?.exampleWords).toEqual(["what", "who"]);
  expect(inventory.wordCount).toBe(2);
  expect(inventory.unknownSelectors).toEqual([
    { selector: "puzzle-tag", words: ["who"] },
  ]);
});
