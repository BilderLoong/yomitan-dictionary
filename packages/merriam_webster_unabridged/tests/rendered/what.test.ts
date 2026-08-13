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

test("usage note text is wrapped in a span, separated from its examples", () => {
  const notes = $('[data-sc-content="usage-note"]');
  expect(notes.length).toBeGreaterThan(0);
  notes.each((_, element) => {
    const note = $(element);
    // The note text lives in its own inline container, not as bare text —
    // even when the note has no example sentence (e.g. "— often used by
    // itself…").
    const text = note.children('[data-sc-content="usage-note-text"]');
    expect(text.length).toBe(1);
    expect(text.prop("tagName")?.toLowerCase()).toBe("span");
    expect(text.text()).toMatch(/^— /);
    const hasExamples =
      note.children('[data-sc-content="example-group"]').length > 0;
    if (!hasExamples) return;
    // The span is a sibling before the example group, never merged into it.
    expect(text.next('[data-sc-content="example-group"]').length).toBe(1);
  });
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

test("every phrase section is a collapsed details with a non-empty body", () => {
  const phrases = $('details[data-sc-content="phrase"]');
  expect(phrases.length).toBeGreaterThan(0);
  phrases.each((_, element) => {
    const details = $(element);
    expect(details.attr("open")).toBeUndefined();
    const body = details.clone();
    body.children("summary").remove();
    expect(body.text().trim().length).toBeGreaterThan(0);
  });
});

test("example source flows on the same line as the example", () => {
  const sources = $(
    '[data-sc-content="example-source"], [data-sc-content="example-source-inline"]',
  );
  expect(sources.length).toBeGreaterThan(0);
  sources.each((_, element) => {
    const source = $(element);
    // A span is inline and shares the sentence's line box; a div is block
    // and breaks to its own line.
    expect(source.prop("tagName")?.toLowerCase()).toBe("span");
    // Inline flow only shares the line if the source lives inside the
    // sentence's block container.
    expect(source.closest('[data-sc-content="example-sentence"]').length).toBe(
      1,
    );
  });
});

test("renders the first known use verbatim inside the collapsed origin section", () => {
  const origin = $('details[data-sc-content="origin"]');
  expect(origin.length).toBe(1);
  expect(origin.attr("open")).toBeUndefined();

  const firstKnownUse = origin.find('[data-sc-content="first-known-use"]');
  expect(firstKnownUse.length).toBe(1);
  expect(firstKnownUse.text()).toBe(
    "First Known Use: before 12th century (sense 1a(1))",
  );

  // The dateline stays in the collapsed body, after the etymology prose,
  // not on the summary line.
  const summary = origin.children("summary").first().text();
  expect(summary).not.toContain("First Known Use");
  const bodyText = origin.children("div").first().text();
  expect(bodyText.indexOf("First Known Use")).toBeGreaterThan(
    bodyText.indexOf("Middle English"),
  );
});
