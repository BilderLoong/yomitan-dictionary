import { expect, test } from "bun:test";

import { convertCanonical } from "../../src/conversion/convertCanonical";
import { mainCanonicalEntryPlan } from "../helpers/level1Factories";

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nodeChildren = (value: unknown): readonly unknown[] =>
  isObject(value) && "content" in value
    ? Array.isArray(value.content)
      ? value.content
      : value.content === undefined
        ? []
        : [value.content]
    : [];

const allNodes = (value: unknown): JsonObject[] => {
  if (Array.isArray(value)) return value.flatMap(allNodes);
  if (!isObject(value)) return [];
  return [value, ...nodeChildren(value).flatMap(allNodes)];
};

const unitsOf = (value: unknown, unit: string): JsonObject[] =>
  allNodes(value).filter(
    (node: JsonObject): boolean =>
      isObject(node.data) && node.data.content === unit,
  );

const textOf = (value: unknown): string =>
  typeof value === "string"
    ? value
    : Array.isArray(value)
      ? value.map(textOf).join("")
      : isObject(value)
        ? nodeChildren(value).map(textOf).join("")
        : "";

const convert = (ownerHtml: string, term = "give") =>
  convertCanonical(mainCanonicalEntryPlan({ term, ownerHtml }));

const header = (
  headword: string,
  pos: string,
  pronunciation: string,
  extra = "",
): string =>
  `<div class="entry-header"><h1 class="hword"><sup>1</sup>${headword}</h1>` +
  `<span class="fl">${pos}</span><span class="prs"><span class="first-slash">\\</span>` +
  `<span class="pr">${pronunciation}</span><span class="last-slash">\\</span></span></div>${extra}`;

const sense = (markers: string, body: string): string =>
  `<div class="sense has-sn"><span class="sn sense-1">${markers}</span>${body}</div>`;

const sb = (body: string, classes = "has-num has-let has-subnum"): string =>
  `<div class="sb ${classes}"><span class="sb-0">${body}</span></div>`;

test("renders an mwu-entry with header and definition flow", () => {
  const result = convert(
    "<mean>" +
      header("give", "verb", "¦giv") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">to transfer possession</span>',
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const converted = result.value;
  expect(converted.definitionTags).toBe("v");
  expect(unitsOf(converted.content, "mwu-entry")).toHaveLength(1);
  expect(unitsOf(converted.content, "mwu-header")).toHaveLength(1);
  expect(unitsOf(converted.content, "homograph-number")[0]?.content).toBe("1");
  expect(textOf(converted.content)).toContain("/ˈgiv/");
  expect(textOf(converted.content)).toContain("to transfer possession");
});

test("builds nested ol sense hierarchy from markers", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span><span class="letter">a</span><span class="sub-num">(1)</span>',
          '<span class="dt ">first sense</span>',
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const levels = unitsOf(result.value.content, "mwu-level");
  expect(levels.map((node: JsonObject): unknown => node.data?.level)).toEqual([
    "3",
    "4",
    "5",
  ]);
  expect(
    unitsOf(result.value.content, "sense-number").map(
      (node: JsonObject): unknown => node.data?.sourceMarker,
    ),
  ).toEqual(["1"]);
  expect(
    unitsOf(result.value.content, "subsense-letter").map(
      (node: JsonObject): unknown => node.data?.sourceMarker,
    ),
  ).toEqual(["a"]);
  expect(
    unitsOf(result.value.content, "definition-number").map(
      (node: JsonObject): unknown => node.data?.sourceMarker,
    ),
  ).toEqual(["(1)"]);
  expect(textOf(result.value.content)).toContain("first sense");
});

test("inherits sense markers across sibling senses", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span><span class="letter">a</span><span class="sub-num">(1)</span>',
          '<span class="dt ">one</span>',
        ) +
          sense(
            '<span class="sub-num">(2)</span>',
            '<span class="dt ">two</span>',
          ) +
          sense(
            '<span class="letter">b</span><span class="sub-num">(1)</span>',
            '<span class="dt ">three</span>',
          ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const markers = unitsOf(result.value.content, "definition-number").map(
    (node: JsonObject): unknown => node.data?.sourceMarker,
  );
  expect(markers).toEqual(["(1)", "(2)", "(1)"]);
  const letters = unitsOf(result.value.content, "subsense-letter").map(
    (node: JsonObject): unknown => node.data?.sourceMarker,
  );
  expect(letters).toEqual(["a", "b"]);
  const text = textOf(result.value.content);
  expect(text).toContain("one");
  expect(text).toContain("two");
  expect(text).toContain("three");
});

test("groups verb subtypes as level-2 list items", () => {
  const result = convert(
    "<mean>" +
      header("turn", "verb", "¦tərn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      '<p class="vd firstVd"><em>transitive verb</em></p>' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">transitive sense</span>',
        ),
        "has-num",
      ) +
      '<p class="vd"><em>intransitive verb</em></p>' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">intransitive sense</span>',
        ),
        "has-num",
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const subtypes = unitsOf(result.value.content, "verb-subtype");
  expect(
    subtypes
      .filter((node: JsonObject): boolean => node.tag === "span")
      .map(textOf),
  ).toEqual(["transitive verb", "intransitive verb"]);
  expect(
    subtypes
      .filter((node: JsonObject): boolean => node.tag === "li")
      .map((node: JsonObject): unknown => node.data?.sourceMarker),
  ).toEqual(["1", "2"]);
  expect(textOf(result.value.content)).toContain("transitive sense");
  expect(textOf(result.value.content)).toContain("intransitive sense");
});

test("shows one example and collapses the rest", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">sense text' +
            '<span class="vis">' +
            '<span class="vi"><span class="ex-sent-group"><span class="ex-sent t no-aq sents">→ <span class="mw_t_sp"><span class="mw_t_wi">what</span> is one</span></span></span></span>' +
            '<span class="vi"><span class="ex-sent-group"><span class="ex-sent t no-aq sents">→ <span class="mw_t_sp"><span class="mw_t_wi">what</span> is two</span></span></span></span>' +
            '<span class="vi"><span class="ex-sent-group"><span class="ex-sent t no-aq sents">→ <span class="mw_t_sp"><span class="mw_t_wi">what</span> is three</span></span></span></span>' +
            "</span>" +
            "</span>",
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const examples = unitsOf(result.value.content, "example-sentence");
  expect(examples).toHaveLength(3);
  const extra = unitsOf(result.value.content, "extra-examples");
  expect(extra).toHaveLength(1);
  expect(extra[0]?.open).toBe(false);
  expect(textOf(extra[0]?.content)).toContain("2 more examples");
  const visibleText = textOf(result.value.content);
  expect(visibleText).toContain("what is one");
  expect(visibleText).toContain("what is two");
  expect(visibleText).toContain("what is three");
  const highlights = unitsOf(result.value.content, "target-highlight");
  expect(highlights).toHaveLength(3);
});

test("keeps visible link text but drops GoldenDict targets", () => {
  const result = convert(
    "<mean>" +
      header("O", "noun", "¦ō") +
      '<div class="section" data-id="definition"><p class="cxl-ref">variant of ' +
      '<a href="gdlookup://localhost/o">o</a></p></div></mean>',
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const serialized = JSON.stringify(result.value.content);
  expect(serialized).toContain("variant of");
  expect(serialized).toContain("o");
  expect(serialized).not.toContain("gdlookup://");
});

test("renders titled collapsed origin and phrase sections", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">sense text</span>',
        ),
      ) +
      "</div></div></div>" +
      '<div class="dro"><span class="drp">no matter what</span>' +
      '<div class="vg"><div class="sb no-sn"><div class="sense no-subnum">' +
      '<span class="dt ">regardless</span></div></div></div></div>' +
      '<div class="section custom-accordion" data-id="origin">' +
      '<h2 class="toggle"><span class="text">Origin of WHAT</span></h2>' +
      '<div class="section-content etymology"><div class="sub-well">' +
      '<p>Middle English <em class="mw_t_it">hwæt</em> — more at ' +
      '<a href="bword://who" class="mw_t_mat">who</a></p>' +
      "<p>First Known Use: before 12th century</p>" +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const origins = unitsOf(result.value.content, "origin");
  expect(origins).toHaveLength(1);
  expect(origins[0]?.tag).toBe("details");
  expect(origins[0]?.open).toBe(false);
  expect(textOf(origins[0])).toContain("Origin of WHAT");
  expect(textOf(origins[0])).toContain("hwæt");
  expect(textOf(origins[0])).not.toContain("First Known Use");

  const phrases = unitsOf(result.value.content, "phrase");
  expect(phrases).toHaveLength(1);
  expect(phrases[0]?.tag).toBe("details");
  expect(phrases[0]?.open).toBe(false);
  expect(textOf(phrases[0])).toContain("no matter what");
  expect(textOf(phrases[0])).toContain("regardless");
});

test("maps part-of-speech labels to WTY-style tags", () => {
  const cases: readonly [string, string][] = [
    ["noun", "n"],
    ["adjective", "adj"],
    ["adverb", "adv"],
    ["pronoun", "pron"],
    ["conjunction", "conj"],
    ["preposition", "prep"],
    ["abbreviation", "abbr"],
    ["verb, transitive + intransitive", "v"],
    ["noun combining form", "comb"],
    ["geographical name", "geo"],
    ["adverb (or adjective)", "adv"],
    ["noun, ", "n"],
    ["noun plural but singular in construction", "n"],
  ];

  for (const [pos, expected] of cases) {
    const result = convert(
      "<mean>" +
        header("test", pos, "¦t") +
        '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
        sb(
          sense('<span class="num">1</span>', '<span class="dt ">def</span>'),
        ) +
        "</div></div></div></mean>",
      "test",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) continue;
    expect(result.value.definitionTags, pos).toBe(expected);
  }
});

test("renders one fallback and one finding for an unsupported subtree", () => {
  const result = convert(
    "<mean>" +
      header("give", "verb", "¦giv") +
      '<div class="section" data-id="definition"><section class="mystery">unmapped visible text' +
      '<span class="dt">nested text</span></section></div></mean>',
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.findings).toHaveLength(1);
  expect(
    JSON.stringify(result.value.content).match(/unmapped visible text/g),
  ).toHaveLength(1);
});

test("rejects an empty canonical owner", () => {
  expect(
    convertCanonical(
      mainCanonicalEntryPlan({
        term: "empty",
        ownerHtml:
          '<mean><div class="section" data-id="definition">' +
          '<span class="sound"></span></div></mean>',
      }),
    ),
  ).toEqual({
    ok: false,
    error: {
      kind: "empty-canonical-definition",
      rowId: 1,
      term: "empty",
    },
  });
});
