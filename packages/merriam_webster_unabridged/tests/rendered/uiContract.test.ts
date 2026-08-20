import { expect, test } from "bun:test";
import * as cheerio from "cheerio";

import { renderToHtml } from "../helpers/renderToHtml";
import {
  allConverted,
  giveConverted,
  inConverted,
  oConverted,
  putConverted,
  sumConverted,
  whatConverted,
} from "./fixtures";

const rendered = (content: typeof giveConverted.content): cheerio.CheerioAPI =>
  cheerio.load(renderToHtml(content));

test("structured entry headers expose ordered visual rows", () => {
  for (const [content, expectedRows] of [
    [
      inConverted.content,
      ["mwu-header-pronunciation", "mwu-header-pronunciation-notes"],
    ],
    [
      putConverted.content,
      ["mwu-header-pronunciation", "mwu-header-inflections"],
    ],
    [whatConverted.content, ["mwu-header-pronunciation"]],
  ] as const) {
    const $ = rendered(content);
    const header = $('[data-sc-content="mwu-header"]').first();
    const rows = header.children('[data-sc-content^="mwu-header-"]');

    expect(
      rows.map((_, element) => $(element).attr("data-sc-content")).get(),
    ).toEqual(expectedRows);
    if (expectedRows.includes("mwu-header-pronunciation")) {
      expect(
        rows.eq(0).find('[data-sc-content="pronunciation-reading"]').length,
      ).toBeGreaterThan(0);
      expect(
        rows.eq(0).find('[data-sc-content="pronunciation-note"]').length,
      ).toBe(0);
    }
  }
});

test("pronunciation notes stay out of the primary reading row", () => {
  const $ = rendered(inConverted.content);
  const header = $('[data-sc-content="mwu-header"]').first();
  const readings = header
    .find('[data-sc-content="mwu-header-pronunciation"]')
    .text();
  const notes = header
    .find('[data-sc-content="mwu-header-pronunciation-notes"]')
    .text();

  expect(readings).toContain("/(ˈ)in/");
  expect(readings).not.toContain("often");
  expect(notes).toContain("often");
  expect(notes).toContain("usually ᵊn after t");
});

test("local tags are static structured metadata without title affordances", () => {
  const $ = rendered(giveConverted.content);
  const labels = [
    inConverted.content,
    giveConverted.content,
    putConverted.content,
  ].flatMap((content) => {
    const entry = rendered(content);
    return entry(
      '[data-sc-content="tag"], span[data-sc-content="verb-subtype"]',
    )
      .map((_, element) => entry(element).text().trim())
      .get();
  });

  expect(labels).toEqual(
    expect.arrayContaining([
      "archaic",
      "chiefly British",
      "cricket",
      "of a ship",
      "transitive verb",
      "intransitive verb",
    ]),
  );
  $('[data-sc-content="tag"], span[data-sc-content="verb-subtype"]').each(
    (_, element) => {
      expect($(element).attr("title")).toBeUndefined();
    },
  );
  expect($('[data-sc-content="inflection-label"]').length).toBeGreaterThan(0);
});

test("form metadata and inflection qualifiers stay quiet while local tags use badges", () => {
  const give = rendered(giveConverted.content);
  const o = rendered(oConverted.content);
  const labels = (category: string): string[] =>
    give(`[data-sc-content="inflection-label"][data-sc-category="${category}"]`)
      .map((_, element) => give(element).text().replace(/\s+/gu, " ").trim())
      .get();

  expect(labels("connector")).toEqual(expect.arrayContaining(["or"]));
  expect(labels("qualifier")).toEqual(
    expect.arrayContaining(["or substandard", "or dialectal"]),
  );
  expect(
    o('[data-sc-content="inflection-label"][data-sc-category="form-label"]')
      .map((_, element) => o(element).text().trim())
      .get(),
  ).toEqual(expect.arrayContaining(["plural"]));
});

test("entry qualifiers stay separate from local tags", () => {
  const $ = rendered(oConverted.content);
  const entryQualifier = $('[data-sc-content="entry-qualifier"]');

  expect(entryQualifier.text().trim()).toBe("often capitalized");
  expect(entryQualifier.closest('[data-sc-content="tag"]').length).toBe(0);
  expect(
    $('[data-sc-content="inflection-label"][data-sc-category="form-label"]')
      .map((_, element) => $(element).text().trim())
      .get(),
  ).toEqual(expect.arrayContaining(["plural"]));
});

test("cross references stay neutral, structured, and noninteractive", () => {
  const $ = rendered(whatConverted.content);
  const references = $('[data-sc-content="cross-reference"]');

  expect(references.length).toBeGreaterThan(0);
  references.each((_, element) => {
    expect(element.tagName.toLowerCase()).toBe("span");
    expect($(element).closest("a").length).toBe(0);
    expect($(element).attr("data-sc-relation")).toBeDefined();
  });
});

test("nested sense leaves expose their complete source marker path", () => {
  const $ = rendered(whatConverted.content);
  const paths = $("li[data-sc-source-marker-path]")
    .map((_, element) => $(element).attr("data-sc-source-marker-path"))
    .get();

  expect(paths.slice(0, 7)).toEqual([
    "1a(1)",
    "1a(2)",
    "1b(1)",
    "1b(2)",
    "1c",
    "1d(1)",
    "1d(2)",
  ]);
});

test("marked senses do not leave inline text as direct grid items", () => {
  const directTextNodes = allConverted.flatMap((converted) => {
    const $ = rendered(converted.content);
    return $("li[data-sc-source-marker-path]")
      .toArray()
      .flatMap((item) =>
        $(item)
          .contents()
          .toArray()
          .filter(
            (node): boolean =>
              node.type === "text" && node.data.trim().length > 0,
          ),
      );
  });

  expect(directTextNodes).toHaveLength(0);
});

test("give sense 8 keeps its source note inside the definition flow", () => {
  const $ = rendered(giveConverted.content);
  const sense = $('li[data-sc-source-marker-path="8"]').first();
  const definition = sense.children(
    'div[data-sc-content="definition"][data-sc-level="5"]',
  );

  expect(
    sense
      .children()
      .map((_, element) => $(element).attr("data-sc-content"))
      .get(),
  ).toEqual(["definition"]);
  expect(
    definition.children('[data-sc-content="definition-text"]').text(),
  ).toContain("translation of German gibt");
  expect(definition.text()).toContain("to take place");
});

test("inflection pronunciation qualifiers use the local tag treatment", () => {
  const $ = rendered(putConverted.content);
  const qualifiedForm = $('[data-sc-content="form-pronunciation"]')
    .filter((_, element) => $(element).text().includes("chiefly dialectal"))
    .first();

  expect(
    qualifiedForm
      .find('[data-sc-content="pronunciation-reading"]')
      .map((_, element) => $(element).text())
      .get(),
  ).toEqual(["/ˈpu̇t/", "/ˈpət/"]);
  expect(qualifiedForm.text().replace(/\s+/gu, " ").trim()).toContain(
    "/ˈpu̇t/ chiefly dialectal /ˈpət/",
  );
  expect(qualifiedForm.find('[data-sc-content="tag"]').text().trim()).toBe(
    "chiefly dialectal",
  );
});

test("give thanks keeps its specific meaning in one flow with the example below", () => {
  const $ = rendered(giveConverted.content);
  const mainDefinition = $(
    'div[data-sc-content="definition"][data-sc-level="5"]',
  )
    .filter((_, element) => $(element).text().includes("to express gratitude"))
    .first();
  const specificDefinition = mainDefinition
    .find('[data-sc-content="definition"][data-sc-level="3"]')
    .filter((_, element) => $(element).text().includes("to say grace"))
    .first();

  expect(mainDefinition.length).toBe(1);
  expect(specificDefinition.prop("tagName")?.toLowerCase()).toBe("span");
  expect(mainDefinition.text()).toContain("to say grace");
  expect(
    specificDefinition.children('[data-sc-content="example-group"]').length,
  ).toBe(1);
});

test("give thanks renders the sub-definition separator before its content", () => {
  const $ = rendered(giveConverted.content);
  const specificDefinition = $(
    'span[data-sc-content="definition"][data-sc-level="3"]',
  )
    .filter((_, element) => $(element).text().includes("to say grace"))
    .first();
  const firstChild = specificDefinition.contents().first();

  expect(
    firstChild.is('span[data-sc-content="sub-definition-separator"]'),
  ).toBe(true);
  expect(firstChild.text()).toBe("; ");
  expect(
    specificDefinition.text().startsWith("; specifically : to say grace"),
  ).toBe(true);
});

test("phrase example attributions stay inside the example frame", () => {
  const $ = rendered(giveConverted.content);
  const specificDefinition = $(
    '[data-sc-content="definition"][data-sc-level="3"]',
  )
    .filter((_, element) => $(element).text().includes("to say grace"))
    .first();
  const exampleGroup = specificDefinition.children(
    '[data-sc-content="example-group"]',
  );
  const sources = exampleGroup.find(
    '[data-sc-content="example-source"], [data-sc-content="example-source-inline"]',
  );

  expect(exampleGroup.length).toBe(1);
  expect(sources.length).toBe(1);
  expect(sources.closest('[data-sc-content="example-sentence"]').length).toBe(
    1,
  );
  expect(
    exampleGroup.next(
      '[data-sc-content="example-source"], [data-sc-content="example-source-inline"]',
    ).length,
  ).toBe(0);
});

test("phrase groups, phrases, origin, synonym, and extra-example disclosures start closed with owned summaries", () => {
  for (const content of [whatConverted.content, sumConverted.content]) {
    const $ = rendered(content);
    $(
      'details[data-sc-content="phrase-group"], details[data-sc-content="phrase"], details[data-sc-content="origin"], details[data-sc-content="related-item"], details[data-sc-content="extra-examples"]',
    ).each((_, element) => {
      const details = $(element);
      expect(details.attr("open")).toBeUndefined();
      expect(details.children("summary").attr("data-sc-content")).toBe(
        "disclosure-summary",
      );
    });
  }
});
