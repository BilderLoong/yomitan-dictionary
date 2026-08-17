import { expect, test } from "bun:test";
import * as cheerio from "cheerio";

import { convertCanonical } from "../../src/conversion/convertCanonical";
import { mainCanonicalEntryPlan } from "../helpers/level1Factories";
import { renderToHtml } from "../helpers/renderToHtml";

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

test("spaces slash-separated header inflection markers", () => {
  const result = convert(
    "<mean>" +
      header(
        "turn",
        "verb",
        "¦tərn",
        '<div class="headword-row"><span class="vg-ins"><span class="ix">-ed/-ing/-s</span></span></div>',
      ) +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">to rotate</span>',
        ),
      ) +
      "</div></div></div></mean>",
    "turn",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const markers = unitsOf(result.value.content, "inflection-marker");
  expect(markers).toHaveLength(1);
  expect(textOf(markers[0])).toBe("-ed / -ing / -s");
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
  const exampleGroups = unitsOf(result.value.content, "example-group");
  expect(exampleGroups).toHaveLength(1);
  expect(exampleGroups[0]?.tag).toBe("div");
  expect(unitsOf(exampleGroups[0], "example-sentence")).toHaveLength(3);
  const extra = unitsOf(result.value.content, "extra-examples");
  expect(extra).toHaveLength(1);
  expect(extra[0]?.open).toBe(false);
  expect(textOf(unitsOf(extra[0], "disclosure-summary")[0])).toContain(
    "what is one",
  );
  expect(textOf(extra[0]?.content)).not.toContain("2 more examples");
  const visibleText = textOf(result.value.content);
  expect(visibleText).toContain("what is one");
  expect(visibleText).toContain("what is two");
  expect(visibleText).toContain("what is three");
  const highlights = unitsOf(result.value.content, "target-highlight");
  expect(highlights).toHaveLength(3);
});

test("keeps nested example groups and their target highlights", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">sense text' +
            '<span class="ex-sent-group">' +
            '<span class="ex-sent first-child t has-aq sents">→ ' +
            '<span class="mw_t_wi">what</span> is one</span>' +
            '<span class="ex-sent aq has-aq sents"><span class="aq">' +
            '<span class="auth"> — source</span></span></span>' +
            '<span class="ex-sent-group"><span class="ex-sent t no-aq sents">' +
            '→ <span class="mw_t_wi">what</span> is two</span></span>' +
            "</span></span>",
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(unitsOf(result.value.content, "example-sentence")).toHaveLength(2);
  expect(unitsOf(result.value.content, "target-highlight")).toHaveLength(2);
  expect(unitsOf(result.value.content, "example-source").map(textOf)).toEqual([
    "— source",
  ]);
  expect(unitsOf(result.value.content, "extra-examples")).toHaveLength(1);
  expect(textOf(result.value.content)).toContain("what is two");
});

test("collapses consecutive sibling example groups into one extras block", () => {
  const result = convert(
    "<mean>" +
      header("turn", "verb", "¦tərn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">to cause to move' +
            '<span class="ex-sent-group">' +
            '<span class="ex-sent first-child t no-aq sents">→ ' +
            '<span class="mw_t_wi">turn</span> a wheel</span></span>' +
            '<span class="ex-sent-group">' +
            '<span class="ex-sent t no-aq sents">→ ' +
            '<span class="mw_t_wi">turn</span> a crank</span></span>' +
            '<span class="ex-sent-group">' +
            '<span class="ex-sent t has-aq sents">→ great wheel ' +
            '<span class="mw_t_wi">turns</span> its axle</span>' +
            '<span class="ex-sent aq has-aq sents"><span class="aq">' +
            '<span class="auth"> — Theodore Roethke</span></span></span>' +
            "</span></span>",
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(unitsOf(result.value.content, "example-sentence")).toHaveLength(3);
  expect(unitsOf(result.value.content, "target-highlight")).toHaveLength(3);
  expect(unitsOf(result.value.content, "example-source").map(textOf)).toEqual([
    "— Theodore Roethke",
  ]);
  const extras = unitsOf(result.value.content, "extra-examples");
  expect(extras).toHaveLength(1);
  expect(extras[0]?.open).toBe(false);
  expect(textOf(unitsOf(extras[0], "disclosure-summary")[0])).toContain(
    "turn a wheel",
  );
  expect(textOf(extras[0]?.content)).not.toContain("2 more examples");
  expect(textOf(extras[0]?.content)).toContain("turn a crank");
  expect(textOf(extras[0]?.content)).toContain("great wheel turns its axle");
  expect(
    textOf(unitsOf(result.value.content, "example-sentence")[0]?.content),
  ).toContain("turn a wheel");
});

test("keeps example groups separated by definition text uncollapsed", () => {
  const result = convert(
    "<mean>" +
      header("turn", "verb", "¦tərn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">first sense' +
            '<span class="ex-sent-group">' +
            '<span class="ex-sent first-child t no-aq sents">→ ' +
            '<span class="mw_t_wi">turn</span> one</span></span>' +
            '<strong class="mw_t_bc">: </strong>second sense' +
            '<span class="ex-sent-group">' +
            '<span class="ex-sent t no-aq sents">→ ' +
            '<span class="mw_t_wi">turn</span> two</span></span>' +
            "</span>",
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(unitsOf(result.value.content, "example-sentence")).toHaveLength(2);
  expect(unitsOf(result.value.content, "extra-examples")).toHaveLength(0);
});

test("preserves examples directly under a usage wrapper", () => {
  const result = convert(
    "<mean>" +
      header("turn", "verb", "¦tərn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">definition' +
            '<span class="uns"><span class="un"><span class="mdash">—</span>' +
            "usually used with away</span>" +
            '<span class="vi"><span class="ex-sent-group"><span class="ex-sent t no-aq sents">' +
            '→ no deserving person is ever <span class="mw_t_wi">turned</span> away</span></span></span>' +
            "</span></span>",
        ),
      ) +
      "</div></div></div></mean>",
    "turn",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(unitsOf(result.value.content, "usage-note")).toHaveLength(2);
  expect(unitsOf(result.value.content, "example-sentence")).toHaveLength(1);
  expect(unitsOf(result.value.content, "target-highlight")).toHaveLength(1);
  expect(textOf(result.value.content)).toContain(
    "no deserving person is ever turned away",
  );
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
  expect(textOf(origins[0])).toContain("First Known Use: before 12th century");
  expect(unitsOf(result.value.content, "first-known-use")).toHaveLength(1);

  const phrases = unitsOf(result.value.content, "phrase");
  expect(phrases).toHaveLength(1);
  expect(phrases[0]?.tag).toBe("details");
  expect(phrases[0]?.open).toBe(false);
  expect(textOf(phrases[0])).toContain("no matter what");
  expect(textOf(phrases[0])).toContain("regardless");

  const phraseGroup = unitsOf(result.value.content, "phrase-group");
  expect(phraseGroup).toHaveLength(1);
  expect(phraseGroup[0]?.tag).toBe("details");
  expect(phraseGroup[0]?.open).toBe(false);
  expect(textOf(phraseGroup[0])).toContain("Phrases");
  expect(textOf(phraseGroup[0])).toContain("no matter what");
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
    ["verb, transitive + intransitive", "v transitive intransitive"],
    ["noun combining form", "comb noun-forming"],
    ["geographical name", "geographical-name"],
    ["adverb (or adjective)", "adj adv"],
    ["noun, ", "?noun%2C"],
    [
      "noun plural but singular in construction",
      "n plural-form takes-singular-verb",
    ],
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

test("reads functional labels only from the owned entry header", () => {
  const result = convert(
    "<mean>" +
      header("homeothermic", "", "¦hōmēəˈthərmik") +
      '<div class="uro"><span class="ure">homeotherm</span>' +
      '<span class="fl">noun, </span></div>' +
      '<div class="section" data-id="definition"><span class="dt">of homeothermy</span></div></mean>',
    "homeothermic",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.definitionTags).toBe(null);
  expect(unitsOf(result.value.content, "part-of-speech").map(textOf)).toEqual([
    "noun, ",
  ]);
});

const nestedRunOnRegressionCases: readonly (readonly [string, string])[] = [
  ["Hall of Fame", "Hall of Famer"],
  ["role-play", "role-player"],
];

test.each(nestedRunOnRegressionCases)(
  "%s does not borrow the noun label from its nested undefined run-on",
  (term: string, runOnTerm: string) => {
    const result = convert(
      "<mean>" +
        `<div class="entry-header"><h1 class="hword">${term}</h1></div>` +
        '<div class="section" data-id="definition"><span class="dt">meaning</span></div>' +
        `<div class="dro"><div class="uro"><span class="ure">${runOnTerm}</span>` +
        '<span class="fl">noun</span></div></div></mean>',
      term,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.definitionTags).toBe(null);
    expect(unitsOf(result.value.content, "part-of-speech").map(textOf)).toEqual(
      ["noun"],
    );
  },
);

test("does not cross into a nested run-on entry header for a functional label", () => {
  const result = convert(
    '<mean><div class="section" data-id="definition"><span class="dt">meaning</span></div>' +
      '<div class="dro"><div class="uro"><div class="entry-header">' +
      '<h1 class="hword">nested form</h1><span class="fl">noun</span>' +
      "</div></div></div></mean>",
    "parent form",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.definitionTags).toBe(null);
});

test("uses only its owned label for an alternative-spelling canonical entry", () => {
  const result = convertCanonical({
    kind: "alternative-spelling-canonical-entry",
    term: "colour",
    displayHeadword: "colour",
    source: {
      rowId: 12,
      rowKey: "color",
      meanIndex: 0,
      phraseIndex: null,
      ownerHtml:
        '<mean><div class="entry-header"><h1 class="hword">colour</h1>' +
        '<span class="fl">adjective</span></div>' +
        '<div class="section" data-id="definition"><span class="dt">colored</span></div>' +
        '<div class="dro"><div class="uro"><span class="ure">colourer</span>' +
        '<span class="fl">noun</span></div></div></mean>',
    },
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.definitionTags).toBe("adj");
});

test("adds phrase to a defined phrase with its owned functional label", () => {
  const result = convertCanonical({
    kind: "drp-phrase-canonical-entry",
    term: "what phrase",
    parentTerm: "what",
    source: {
      rowId: 10,
      rowKey: "what",
      meanIndex: 0,
      phraseIndex: 0,
      ownerHtml:
        '<div class="dro"><span class="drp">what phrase</span>' +
        '<div class="entry-header"><span class="fl">noun</span></div>' +
        '<div class="vg"><div class="sb"><div class="sense"><span class="dt">meaning</span></div></div></div></div>',
    },
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.definitionTags).toBe("n phrase");
});

test("keeps the fixed phrase tag before a dynamic functional tag", () => {
  const result = convertCanonical({
    kind: "drp-phrase-canonical-entry",
    term: "future phrase",
    parentTerm: "future",
    source: {
      rowId: 11,
      rowKey: "future",
      meanIndex: 0,
      phraseIndex: 0,
      ownerHtml:
        '<div class="dro"><span class="drp">future phrase</span>' +
        '<div class="entry-header"><span class="fl">future label</span></div>' +
        '<div class="vg"><div class="sb"><div class="sense"><span class="dt">meaning</span></div></div></div></div>',
    },
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.definitionTags).toBe("phrase ?future_label");
});

test("keeps an unknown owned functional label visible with a finding", () => {
  const result = convert(
    "<mean>" +
      header("future", "future_label, 2%", "¦fyütʃər") +
      '<div class="section" data-id="definition"><span class="dt">meaning</span></div></mean>',
    "future",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.definitionTags).toBe("?future%5Flabel%2C_2%25");
  expect(result.value.findings).toContainEqual({
    kind: "unmapped-functional-label",
    rowId: 1,
    term: "future",
    rawLabel: "future_label, 2%",
    normalizedLabel: "future_label, 2%",
    tag: "?future%5Flabel%2C_2%25",
  });
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

test("renders nested usage notes as separate notes", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">def' +
            '<span class="uns"><span class="un">' +
            '<span class="mdash">—</span><span class="unText">first note' +
            '<span class="vis"><span class="vi"><span class="ex-sent-group">' +
            '<span class="ex-sent t no-aq sents">→ first example</span>' +
            "</span></span></span></span>" +
            '<span class="un"><span class="unText">second note</span></span>' +
            '<span class="un"><span class="unText">third note' +
            '<span class="vis"><span class="vi"><span class="ex-sent-group">' +
            '<span class="ex-sent t no-aq sents">→ third example</span>' +
            "</span></span></span></span></span></span></span>" +
            "</span>",
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const notes = unitsOf(result.value.content, "usage-note");
  expect(notes).toHaveLength(3);
  expect(textOf(notes[0])).toContain("first note");
  expect(textOf(notes[0])).toContain("first example");
  expect(textOf(notes[0])).not.toContain("third example");
  expect(textOf(notes[1])).toContain("second note");
  expect(textOf(notes[2])).toContain("third note");
  expect(textOf(notes[2])).toContain("third example");
});

test("pairs each example with its own attribution", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">sense text' +
            '<span class="vis">' +
            '<span class="vi"><span class="ex-sent-group">' +
            '<span class="ex-sent t no-aq sents">→ first sentence</span>' +
            '<span class="ex-sent aq"><span class="aq">' +
            '<span class="auth"> — Shakespeare</span></span></span>' +
            "</span></span>" +
            '<span class="vi"><span class="ex-sent-group">' +
            '<span class="ex-sent t no-aq sents">→ second sentence</span>' +
            '<span class="ex-sent aq"><span class="aq">' +
            '<span class="source"> — Psalms 8:4</span></span></span>' +
            "</span></span></span></span>",
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const examples = unitsOf(result.value.content, "example-sentence");
  expect(examples).toHaveLength(2);
  expect(textOf(examples[0])).toContain("Shakespeare");
  expect(textOf(examples[0])).not.toContain("Psalms");
  expect(textOf(examples[1])).toContain("Psalms");
  expect(textOf(examples[1])).not.toContain("Shakespeare");
});

test("structures a flat usage discussion explanation", () => {
  const result = convert(
    "<mean>" +
      header("because", "conjunction", "¦bi-¦kȯz") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">for the reason that</span>',
        ),
      ) +
      "</div></div></div>" +
      '<div class="section custom-accordion" data-id="usage-notes" id="usage-notes">' +
      '<h2 class="toggle"><span class="text">Usage of BECAUSE</span></h2>' +
      '<div class="section-content usage-notes"><div class="sub-well"><p> A university professor some years back surveyed incoming freshmen to find out what they had been taught about writing before they came to college. About 75 percent of them reported that they had been told never to begin a sentence with <em class="mw_t_it">because</em>. This rule is a myth. <em class="mw_t_it">Because</em> is frequently used to begin sentences. It\'s especially useful when you want to put the cause before an effect. ' +
      '<span class="ex-sent t has-aq sents sents-inline"> → <span class="mw_t_sp"><span class="mw_t_wi">Because</span> the detail being removed was such a telling illustration of his meticulousness, I put up a small brief argument for keeping it …</span> </span>' +
      '<span class="ex-sent aq has-aq sents"> <span class="aq"> <span class="auth"> — George F. Will</span>, <span class="source"><em class="mw_t_it">Sports Illustrated</em></span>, <span class="aqdate">12 Mar. 1990</span></span> </span>' +
      '<span class="ex-sent t has-aq sents sents-inline"> → <span class="mw_t_sp"><span class="mw_t_wi">Because</span> of their quantum nature, atoms (like the particles they are made of) act like waves.</span> </span>' +
      '<span class="ex-sent aq has-aq sents"> <span class="aq"> <span class="auth"> — George Johnson</span>, <span class="source"><em class="mw_t_it">New York Times</em></span>, <span class="aqdate">16 Oct. 2001</span></span> </span>' +
      '<span class="ex-sent t has-aq sents sents-inline"> → <span class="mw_t_sp"><em class="mw_t_it">Because</em> of the wood\'s value and popularity, lumber brokers in other parts of the world have bestowed the name "mahogany" on other species of reddish wood as a way to burnish their appeal.</span> </span>' +
      '<span class="ex-sent aq has-aq sents"> <span class="aq"> <span class="auth"> — Jeanne Huber</span>, <span class="source"><em class="mw_t_it">This Old House</em></span>, <span class="aqdate">January/February 2002</span></span> </span>' +
      '<span class="ex-sent t has-aq sents sents-inline"> → <span class="mw_t_sp"><span class="mw_t_wi">Because</span> their audience works during the week, they tour less in the manner of rock and pop musicians, who are often on the road for weeks and months at a time, playing night after night, and more in the manner of drag racers, who race on the weekends and go home.</span> </span>' +
      '<span class="ex-sent aq has-aq sents"> <span class="aq"> <span class="auth"> — Alec Wilkinson</span>, <span class="source"><em class="mw_t_it">New Yorker</em></span>, <span class="aqdate">24 May 2010</span></span> </span>' +
      '</p><p class="see-in-addition"><strong>usages</strong> see in addition <a href="bword://account%5B1%5D" class="ua-link"><sup>1</sup>account</a></p></div></div></div></mean>',
    "because",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const explanation = unitsOf(result.value.content, "usage-explanation");
  expect(explanation).toHaveLength(1);
  expect(textOf(explanation[0])).toContain(
    "A university professor some years back surveyed incoming freshmen",
  );

  const exampleGroups = unitsOf(result.value.content, "example-group");
  expect(exampleGroups).toHaveLength(1);
  const examples = unitsOf(exampleGroups[0], "example-sentence");
  expect(examples).toHaveLength(4);
  expect(examples.map(textOf)).toEqual([
    "Because the detail being removed was such a telling illustration of his meticulousness, I put up a small brief argument for keeping it … — George F. Will, Sports Illustrated, 12 Mar. 1990",
    "Because of their quantum nature, atoms (like the particles they are made of) act like waves. — George Johnson, New York Times, 16 Oct. 2001",
    'Because of the wood\'s value and popularity, lumber brokers in other parts of the world have bestowed the name "mahogany" on other species of reddish wood as a way to burnish their appeal. — Jeanne Huber, This Old House, January/February 2002',
    "Because their audience works during the week, they tour less in the manner of rock and pop musicians, who are often on the road for weeks and months at a time, playing night after night, and more in the manner of drag racers, who race on the weekends and go home. — Alec Wilkinson, New Yorker, 24 May 2010",
  ]);
  const extraExamples = unitsOf(exampleGroups[0], "extra-examples");
  expect(extraExamples).toHaveLength(1);
  expect(extraExamples[0]?.open).toBe(false);
  const summaries = unitsOf(extraExamples[0], "disclosure-summary");
  expect(summaries).toHaveLength(1);
  expect(textOf(summaries[0])).toBe(textOf(examples[0]));
  expect(textOf(extraExamples[0])).not.toContain("3 more examples");
  expect(unitsOf(extraExamples[0], "see-in-addition")).toHaveLength(0);

  const pointers = unitsOf(result.value.content, "see-in-addition");
  expect(pointers).toHaveLength(1);
  expect(textOf(pointers[0])).toBe("usages see in addition account");
  expect(JSON.stringify(result.value.content)).not.toContain("bword://");
});

test("preserves an unmatched flat usage attribution with a finding", () => {
  const result = convert(
    "<mean>" +
      header("because", "conjunction", "¦bi-¦kȯz") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">for the reason that</span>',
        ),
      ) +
      "</div></div></div>" +
      '<div class="section custom-accordion" data-id="usage-notes" id="usage-notes">' +
      '<h2 class="toggle"><span class="text">Usage of BECAUSE</span></h2>' +
      '<div class="section-content usage-notes"><div class="sub-well"><p>Explanation ' +
      '<span class="ex-sent aq"><span class="aq"><span class="auth"> — Orphan Source</span></span></span> ' +
      '<span class="ex-sent t"> → a sentence</span>' +
      "</p></div></div></div></mean>",
    "because",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(textOf(result.value.content)).toContain("— Orphan Source");
  expect(result.value.findings).toEqual([
    expect.objectContaining({
      kind: "unsupported-visible-subtree",
      term: "because",
      tagName: "span",
      classes: ["ex-sent", "aq"],
    }),
  ]);
});

test("preserves whitespace between usage explanation inline nodes", () => {
  const result = convert(
    "<mean>" +
      header("because", "conjunction", "¦bi-¦kȯz") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">for the reason that</span>',
        ),
      ) +
      "</div></div></div>" +
      '<div class="section custom-accordion" data-id="usage-notes" id="usage-notes">' +
      '<h2 class="toggle"><span class="text">Usage of BECAUSE</span></h2>' +
      '<div class="section-content usage-notes"><div class="sub-well"><p>first ' +
      '<em class="mw_t_it">middle</em> <strong>last</strong> ' +
      '<span class="ex-sent t"> → an example</span></p>' +
      "</div></div></div></mean>",
    "because",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const explanations = unitsOf(result.value.content, "usage-explanation");
  expect(explanations).toHaveLength(1);
  expect(textOf(explanations[0])).toBe("first middle last ");
});

test("does not invent attributions for earlier examples", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">sense text' +
            '<span class="vis">' +
            '<span class="vi"><span class="ex-sent-group">' +
            '<span class="ex-sent t no-aq sents">→ first sentence</span>' +
            "</span></span>" +
            '<span class="vi"><span class="ex-sent-group">' +
            '<span class="ex-sent t no-aq sents">→ second sentence</span>' +
            '<span class="ex-sent aq"><span class="aq">' +
            '<span class="auth"> — Christian Science Monitor</span></span></span>' +
            "</span></span></span></span>",
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(unitsOf(result.value.content, "example-source")).toHaveLength(1);
  const examples = unitsOf(result.value.content, "example-sentence");
  expect(textOf(examples[0])).not.toContain("— ");
  expect(textOf(examples[1])).toContain("Christian Science Monitor");
});

test("marks inline source and auth citations as example-source-inline", () => {
  const result = convert(
    "<mean>" +
      header("give", "verb", "¦giv") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">to transfer possession<span class="source"> — J. Doe</span>' +
            '<span class="auth">, author</span></span>',
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const sources = unitsOf(result.value.content, "example-source-inline");
  expect(sources).toHaveLength(2);
  expect(textOf(sources[0])).toBe(" — J. Doe");
  expect(textOf(sources[1])).toBe(", author");
  expect(sources[0].data).not.toHaveProperty("level");
});

test("preserves punctuation and annotation in multi-part pronunciations", () => {
  const result = convert(
    "<mean>" +
      '<div class="entry-header"><h1 class="hword"><sup>1</sup>in</h1>' +
      '<span class="fl">preposition</span>' +
      '<span class="prs"><span class="first-slash">\\</span>' +
      '<span class="pr">(¦)in</span><span class="addPunct">, </span>' +
      '<span class="pr">ən</span><span class="pun">;</span>' +
      '<span class="pr"> <em class="mw_t_it">usually</em> ᵊn <em class="mw_t_it">after</em> t</span>' +
      '<span class="addPunct">, </span><span class="pr">d</span>' +
      '<span class="addPunct">, </span><span class="pr">s</span>' +
      '<span class="last-slash">\\</span></span></div>' +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(sense('<span class="num">1</span>', '<span class="dt ">def</span>')) +
      "</div></div></div></mean>",
    "in",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const pronunciations = unitsOf(result.value.content, "pronunciation");
  expect(pronunciations).toHaveLength(1);
  expect(textOf(pronunciations[0])).toBe("/(ˈ)in/, /ən/, /d/, /s/");
  expect(
    unitsOf(result.value.content, "pronunciation-reading").map(textOf),
  ).toEqual(["/(ˈ)in/", "/ən/", "/d/", "/s/"]);
  const notes = unitsOf(result.value.content, "pronunciation-note");
  expect(textOf(notes.map(textOf))).toContain("usually ᵊn after t");
  expect(textOf(notes.map(textOf))).not.toContain("/d/");
});

test("keeps an embedded pronunciation qualifier in source order", () => {
  const result = convert(
    "<mean>" +
      header(
        "put",
        "verb",
        'ˈpu̇t <em class="mw_t_it">chiefly dialectal</em> ˈpət',
      ) +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(sense('<span class="num">1</span>', '<span class="dt ">def</span>')) +
      "</div></div></div></mean>",
    "put",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(
    unitsOf(result.value.content, "pronunciation-reading").map(textOf),
  ).toEqual(["/ˈpu̇t/", "/ˈpət/"]);
  expect(unitsOf(result.value.content, "pronunciation-note")).toHaveLength(0);
  expect(unitsOf(result.value.content, "tag").map(textOf)).toEqual([
    "chiefly dialectal",
  ]);
});

test("marks run-in variants as alternate forms", () => {
  const result = convert(
    "<mean>" +
      header("O", "noun", "¦ō") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="vr"><span class="va">O</span></span>' +
            '<span class="dt ">the one of the four blood groups</span>',
        ),
      ) +
      "</div></div></div></mean>",
    "O",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(
    unitsOf(result.value.content, "alternate-form").some(
      (node: JsonObject): boolean =>
        node.tag === "span" && textOf(node) === "O",
    ),
  ).toBe(true);
});

test("marks called-also units", () => {
  const result = convert(
    "<mean>" +
      header("turn", "noun", "¦tərn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">an event in any gambling game</span>' +
            '<p class="ca"><span class="mdash">—</span> ' +
            '<span class="intro">called also ' +
            '<a href="bword://coup" class="cat">coup</a></span></p>',
        ),
      ) +
      "</div></div></div></mean>",
    "turn",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const calledAlso = unitsOf(result.value.content, "called-also");
  expect(calledAlso).toHaveLength(1);
  expect(textOf(calledAlso[0])).toContain("called also");
  expect(textOf(calledAlso[0])).toContain("coup");
});

test("marks comparison references with compare relations", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">' +
            '<span class="dx-jump"> — compare ' +
            '<a href="bword://that[4]" class="mw_t_dxt"> <sup>4</sup>that</a> 1</span>' +
            "</span>",
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const comparisons = unitsOf(result.value.content, "comparison-reference");
  expect(comparisons).toHaveLength(1);
  expect(textOf(comparisons[0])).toContain("compare");
  expect(textOf(comparisons[0])).toContain("that");
  expect(
    unitsOf(result.value.content, "cross-reference")[0]?.data?.relation,
  ).toBe("compare");
  expect(unitsOf(result.value.content, "superscript-reference")).toHaveLength(
    0,
  );
});

test("marks relation references with the exact source phrase", () => {
  const result = convert(
    "<mean>" +
      header("O", "noun", "¦ō") +
      '<div class="section" data-id="definition">' +
      '<p class="cxl-ref"> <span class="cxl">plural of</span> ' +
      '<a href="bword://zero" class="cxt">zero</a> </p></div></mean>',
    "O",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const references = unitsOf(result.value.content, "relation-reference");
  expect(references).toHaveLength(1);
  expect(references[0]?.data?.relation).toBe("plural of");
  const targets = unitsOf(result.value.content, "cross-reference");
  expect(targets).toHaveLength(1);
  expect(targets[0]?.data?.relation).toBeUndefined();
  expect(textOf(targets[0])).toBe("zero");
});

test("preserves the raw relation wording in relation metadata", () => {
  const result = convert(
    "<mean>" +
      header("wright", "noun", "¦rīt") +
      '<div class="section" data-id="definition">' +
      '<p class="cxl-ref"> <span class="cxl">Archaic   Variant Of</span> ' +
      '<a href="bword://wrought" class="cxt">wrought</a> </p></div></mean>',
    "wright",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const references = unitsOf(result.value.content, "relation-reference");
  expect(references).toHaveLength(1);
  expect(references[0]?.data?.relation).toBe("Archaic   Variant Of");
});

test("removes a leading homograph number from a reference target label", () => {
  const result = convert(
    "<mean>" +
      header("booty", "noun", "¦bü-tē") +
      '<div class="section" data-id="definition">' +
      '<p class="cxl-ref"> <span class="cxl">variant of</span> ' +
      '<a href="bword://booty[2]" class="cxt"><sup>2</sup>booty</a> </p></div></mean>',
    "booty",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const targets = unitsOf(result.value.content, "cross-reference");
  expect(targets).toHaveLength(1);
  expect(textOf(targets[0])).toBe("booty");
  expect(unitsOf(result.value.content, "superscript-reference")).toHaveLength(
    0,
  );
});

test("preserves superscripts outside reference anchors", () => {
  const result = convert(
    "<mean>" +
      header("iron", "noun", "¦ī(-ə)rn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">a metal with the symbol Fe<sup>3+</sup></span>',
        ),
      ) +
      "</div></div></div></mean>",
    "iron",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const superscripts = unitsOf(result.value.content, "superscript-reference");
  expect(superscripts).toHaveLength(1);
  expect(textOf(superscripts[0])).toBe("3+");
});

test("tags cross-reference relations from source classes", () => {
  const result = convert(
    "<mean>" +
      header("who", "pronoun", "¦hü") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">' +
            '<a href="bword://who" class="mw_t_mat">who</a>, ' +
            '<a href="bword://who[1]" class="mw_t_sx"><sup>1</sup>who</a>, ' +
            '<a href="bword://depend" class="mw_t_sc">depend</a>' +
            "</span>",
        ),
      ) +
      "</div></div></div></mean>",
    "who",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(
    unitsOf(result.value.content, "cross-reference").map(
      (node: JsonObject): unknown => node.data?.relation,
    ),
  ).toEqual(["origin", "see", "related"]);
});

test("renders a Level 1 see-in-addition line in a synonym discussion", () => {
  const result = convert(
    "<mean>" +
      header("turn", "noun", "¦tərn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense('<span class="num">1</span>', '<span class="dt ">a place</span>'),
      ) +
      "</div></div></div>" +
      '<div class="section" data-id="related-to"><div class="section-content">' +
      '<div class="synonym-discussion">' +
      '<p class="see-in-addition"><strong>synonyms</strong> see in addition ' +
      '<a href="bword://depend" class="sa-link sc">depend</a></p>' +
      "</div></div></div></mean>",
    "turn",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const seeInAddition = unitsOf(result.value.content, "see-in-addition");
  expect(seeInAddition).toHaveLength(1);
  expect(seeInAddition[0]?.data).toMatchObject({
    content: "see-in-addition",
    level: "1",
  });
  expect(textOf(seeInAddition[0])).toContain("synonyms");
  expect(textOf(seeInAddition[0])).toContain("depend");
  const strong = unitsOf(result.value.content, "strong");
  expect(strong).toHaveLength(1);
  expect(textOf(strong[0])).toContain("synonyms");
});

test("uses the nearest owner for a nested see-in-addition line", () => {
  const result = convert(
    "<mean>" +
      header("future", "noun", "¦fyü-chər") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">time that is to come</span>',
        ),
      ) +
      "</div></div></div>" +
      '<div class="section" data-id="related-to"><div class="section-content">' +
      '<div class="synonym-discussion"><div class="usage">' +
      '<p class="see-in-addition"><strong>usages</strong> see in addition ' +
      '<a href="bword://later" class="ua-link">later</a></p>' +
      "</div></div></div></div></mean>",
    "future",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const pointers = unitsOf(result.value.content, "see-in-addition");
  expect(pointers).toHaveLength(1);
  expect(pointers[0]?.data).toMatchObject({
    content: "see-in-addition",
    level: "6",
  });
});

test("renders a Level 6 see-in-addition line in entry usage notes", () => {
  const result = convert(
    "<mean>" +
      header("because", "conjunction", "¦bi-¦kȯz") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">for the reason that</span>',
        ),
      ) +
      "</div></div></div>" +
      '<div class="section custom-accordion" data-id="usage-notes" id="usage-notes">' +
      '<h2 class="toggle"><span class="text">Usage of BECAUSE</span></h2>' +
      '<div class="section-content usage-notes"><div class="sub-well">' +
      "<p>usage explanation</p>" +
      '<p class="see-in-addition"><strong>usages</strong> see in addition ' +
      '<a href="bword://account%5B1%5D" class="ua-link"><sup>1</sup>account</a></p>' +
      "</div></div></div></mean>",
    "because",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const pointers = unitsOf(result.value.content, "see-in-addition");
  expect(pointers).toHaveLength(1);
  expect(pointers[0]?.data).toMatchObject({
    content: "see-in-addition",
    level: "6",
  });
  expect(textOf(pointers[0])).toBe("usages see in addition account");
  expect(unitsOf(pointers[0], "cross-reference").map(textOf)).toEqual([
    "account",
  ]);
  expect(unitsOf(pointers[0], "superscript-reference")).toHaveLength(0);
  expect(JSON.stringify(pointers[0])).not.toContain("bword://");
});

test("renders entry usage notes as a titled collapsed disclosure", () => {
  const result = convert(
    "<mean>" +
      header("because", "conjunction", "¦bi-¦kȯz") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">for the reason that</span>',
        ),
      ) +
      "</div></div></div>" +
      '<div class="section custom-accordion" data-id="usage-notes" id="usage-notes">' +
      '<h2 class="toggle"><span class="text">Usage of BECAUSE</span></h2>' +
      '<div class="section-content usage-notes"><div class="sub-well">' +
      "<p>usage explanation</p>" +
      '<p class="see-in-addition"><strong>usages</strong> see in addition ' +
      '<a href="bword://account%5B1%5D" class="ua-link"><sup>1</sup>account</a></p>' +
      "</div></div></div></mean>",
    "because",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const disclosures = unitsOf(result.value.content, "usage-note");
  expect(disclosures).toHaveLength(1);
  expect(disclosures[0]?.tag).toBe("details");
  expect(disclosures[0]?.open).toBe(false);
  expect(disclosures[0]?.data).toMatchObject({
    content: "usage-note",
    level: "6",
  });

  const summaries = unitsOf(result.value.content, "disclosure-summary").filter(
    (node: JsonObject): boolean =>
      isObject(node.data) && node.data.category === "usage-note",
  );
  expect(summaries).toHaveLength(1);
  expect(textOf(summaries[0])).toBe("Usage of BECAUSE");

  expect(textOf(disclosures[0])).toContain("usage explanation");
  expect(textOf(disclosures[0])).toContain("usages see in addition account");
  const pointer = unitsOf(disclosures[0], "see-in-addition");
  expect(pointer).toHaveLength(1);
  expect(pointer[0]?.data).toMatchObject({
    content: "see-in-addition",
    level: "6",
  });
  expect(JSON.stringify(disclosures[0])).not.toContain("bword://");
});

test("renders a Level 6 see-in-addition line in a definition-local usage", () => {
  const result = convert(
    "<mean>" +
      header("he", "pronoun", "¦hē") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">the male person previously mentioned</span>' +
            '<div class="usages"><div class="usage">' +
            "<span>Usage Discussion of <i>he</i></span><br>discussion text" +
            '<p class="see-in-addition"><strong>usages</strong> see in addition ' +
            '<a href="bword://anybody" class="ua-link">anybody</a>, ' +
            '<a href="bword://everybody" class="ua-link">everybody</a></p>' +
            "</div></div>",
        ),
      ) +
      "</div></div></div></mean>",
    "he",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const pointers = unitsOf(result.value.content, "see-in-addition");
  expect(pointers).toHaveLength(1);
  expect(pointers[0]?.data).toMatchObject({
    content: "see-in-addition",
    level: "6",
  });
  expect(textOf(pointers[0])).toBe("usages see in addition anybody, everybody");
  expect(unitsOf(pointers[0], "cross-reference").map(textOf)).toEqual([
    "anybody",
    "everybody",
  ]);
  expect(textOf(result.value.content).indexOf("discussion text")).toBeLessThan(
    textOf(result.value.content).indexOf("usages see in addition"),
  );
  expect(JSON.stringify(pointers[0])).not.toContain("bword://");
});

test("reports see-in-addition content outside confirmed owners", () => {
  const result = convert(
    "<mean>" +
      header("future", "noun", "¦fyü-chər") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">time that is to come</span>',
        ),
      ) +
      "</div></div></div>" +
      '<p class="see-in-addition"><strong>usages</strong> see in addition ' +
      '<a href="bword://later" class="ua-link">later</a></p></mean>',
    "future",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(unitsOf(result.value.content, "see-in-addition")).toHaveLength(0);
  expect(textOf(result.value.content)).toContain(
    "usages see in addition later",
  );
  expect(result.value.findings).toEqual([
    expect.objectContaining({
      kind: "unsupported-visible-subtree",
      term: "future",
      tagName: "p",
      classes: ["see-in-addition"],
    }),
  ]);
});

test("reports inline see-in-addition content outside confirmed owners", () => {
  const result = convert(
    "<mean>" +
      header("future", "noun", "¦fyü-chər") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">time that is to come ' +
            '<span class="see-in-addition">usages see in addition later</span>' +
            "</span>",
        ),
      ) +
      "</div></div></div></mean>",
    "future",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(unitsOf(result.value.content, "see-in-addition")).toHaveLength(0);
  expect(textOf(result.value.content)).toContain(
    "usages see in addition later",
  );
  expect(result.value.findings).toEqual([
    expect.objectContaining({
      kind: "unsupported-visible-subtree",
      term: "future",
      tagName: "span",
      classes: ["see-in-addition"],
    }),
  ]);
});

test("renders em and mw_t_it as emphasis units", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt "><em>plain</em> <em class="mw_t_it">styled</em> text</span>',
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const emphasis = unitsOf(result.value.content, "emphasis");
  expect(emphasis).toHaveLength(2);
  expect(textOf(emphasis[0])).toBe("plain");
  expect(textOf(emphasis[1])).toBe("styled");
});

test("keeps local tags free of duplicate title affordances", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="sl">chiefly dialectal</span> <span class="dt ">def</span>',
        ),
      ) +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const tags = unitsOf(result.value.content, "tag");
  expect(tags).toHaveLength(1);
  expect(tags[0]?.title).toBeUndefined();
});

test("renders an undefined run-on under its parent without making a record", () => {
  const result = convert(
    "<mean>" +
      header("in", "preposition", "¦in") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense('<span class="num">1</span>', '<span class="dt ">inside</span>'),
      ) +
      "</div></div></div>" +
      '<div class="dro"><div class="uro">' +
      '<span class="ure">in–ness</span>' +
      '<span class="first-slash">\\</span>' +
      '<span class="prt-a"><span class="mw">ˈin-\u200bnəs</span></span>' +
      '<span class="last-slash">\\</span>' +
      '<span class="fl">noun, </span>' +
      '<span class="il">plural</span><span class="ix">-es</span>' +
      "</div></div></mean>",
    "in",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const runOns = unitsOf(result.value.content, "undefined-run-on");
  expect(runOns).toHaveLength(1);
  expect(textOf(runOns[0])).toContain("in–ness");
  expect(textOf(runOns[0])).toContain("/ˈin-nəs/");
  expect(textOf(runOns[0])).toContain("noun");
  expect(textOf(runOns[0])).toContain("plural");
  expect(textOf(runOns[0])).toContain("-es");
  expect(unitsOf(runOns[0], "run-on-form")).toHaveLength(1);
  expect(unitsOf(runOns[0], "form-pronunciation")).toHaveLength(1);
  expect(unitsOf(runOns[0], "part-of-speech")).toHaveLength(1);
  expect(unitsOf(runOns[0], "inflection-label")).toHaveLength(1);
  expect(unitsOf(runOns[0], "inflection-label")[0]?.data).toMatchObject({
    category: "form-label",
    sourceUnit: "il",
  });
  expect(unitsOf(runOns[0], "inflection-marker")).toHaveLength(1);
  expect(result.value.findings).toEqual([]);
});

test("keeps sense-local forms and labels in one owned definition flow", () => {
  const result = convert(
    "<mean>" +
      header("turn", "noun", "¦tərn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="if">turns</span><span class="spl"> plural</span>' +
            '<span class="dt "><strong class="mw_t_bc">: </strong>' +
            '<a href="bword://menses" class="mw_t_sx">menses</a></span>',
        ),
      ) +
      "</div></div></div></mean>",
    "turn",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const definition = unitsOf(result.value.content, "definition").find(
    (node: JsonObject): boolean => textOf(node).includes("menses"),
  );
  expect(definition).toBeDefined();
  if (definition === undefined) return;
  expect(textOf(definition).replace(/\s+/gu, " ").trim()).toBe(
    "turns plural: menses",
  );
  expect(unitsOf(definition, "inflection-label").map(textOf)).toEqual([
    " plural",
  ]);
  expect(unitsOf(definition, "inflection-label")[0]?.data).toMatchObject({
    category: "form-label",
    sourceUnit: "spl",
  });
  expect(unitsOf(definition, "cross-reference").map(textOf)).toEqual([
    "menses",
  ]);
});

test("keeps separators between consecutive sense-local forms", () => {
  const result = convert(
    "<mean>" +
      header("down", "noun", "¦dau̇n") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span><span class="letter">b</span>',
          '<span class="if">downs</span><span class="il or"> or </span>' +
            '<span class="if">Downs</span><span class="spl plural"> plural</span>' +
            '<span class="dt "><strong class="mw_t_bc">: </strong>' +
            "treeless chalk uplands</span>",
        ),
      ) +
      "</div></div></div></mean>",
    "down",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const definition = unitsOf(result.value.content, "definition").find(
    (node: JsonObject): boolean => textOf(node).includes("chalk uplands"),
  );
  expect(definition).toBeDefined();
  if (definition === undefined) return;
  expect(textOf(definition).replace(/\s+/gu, " ").trim()).toBe(
    "downs or Downs plural: treeless chalk uplands",
  );
  expect(unitsOf(definition, "inflection-label").map(textOf)).toEqual([
    " plural",
  ]);
});

test("keeps local labels semantic and preserves source block boundaries", () => {
  const result = convert(
    "<mean>" +
      header("what", "pronoun", "¦(h)wät") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<div class="sls"><span class="sl">slang</span></div>' +
            '<span class="dt "><span class="sl">archaic</span> ' +
            '<span class="lb">of a blade</span>: definition</span>',
        ),
      ) +
      "</div></div></div></mean>",
    "what",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const tags = unitsOf(result.value.content, "tag");
  expect(tags.map(textOf)).toEqual(["slang", "archaic", "of a blade"]);
  expect(
    tags.map((node: JsonObject): unknown => node.data?.sourceUnit),
  ).toEqual(["sense-label", "sense-label", "definition-label"]);
  const boundaries = unitsOf(result.value.content, "source-block-boundary");
  expect(boundaries).toHaveLength(1);
  expect(textOf(boundaries[0])).toBe("slang");
});

test("marks an entry-level sls label before the sense block as a tag", () => {
  const result = convert(
    "<mean>" +
      header("what", "conjunction", "¦(h)wət") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      '<div class="sls"><span class="sl">substandard</span></div>' +
      sb(
        '<div class="sense no-subnum"><span class="dt ">used after ' +
          '<em class="mw_t_it">than</em> as a function word</span></div>',
        "no-sn",
      ) +
      "</div></div></div></mean>",
    "what",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const tags = unitsOf(result.value.content, "tag");
  expect(tags.map(textOf)).toEqual(["substandard"]);
  expect(tags[0]?.title).toBeUndefined();
  expect(tags[0]?.data).toMatchObject({
    category: "usage",
    sourceUnit: "sense-label",
    level: "5",
  });
  expect(textOf(result.value.content)).toContain("used after");
});

test("renders usage discussion references as non-interactive source pointers", () => {
  const result = convert(
    "<mean>" +
      header("bring", "verb", "¦briŋ") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">definition' +
            '<span class="urefs"><span class="ur"> See Usage Discussion at ' +
            '<a href="gdlookup://bring" class="mw_t_sc">bring</a></span></span>' +
            "</span>",
        ),
      ) +
      "</div></div></div></mean>",
    "bring",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const references = unitsOf(
    result.value.content,
    "usage-discussion-reference",
  );
  expect(references).toHaveLength(1);
  expect(textOf(references[0])).toBe(" See Usage Discussion at bring");
  expect(unitsOf(references[0], "cross-reference")).toHaveLength(0);
  expect(JSON.stringify(references[0])).not.toContain("gdlookup://");
});

test("preserves synonym-discussion reference targets", () => {
  const result = convert(
    "<mean>" +
      header("abstract", "verb", "¦ab-ˈstrakt") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">to summarize</span>',
        ),
      ) +
      "</div></div></div>" +
      '<div class="section custom-accordion related-to" data-id="related-to">' +
      '<h2 class="toggle"><span class="text">Related to ABSTRACT</span></h2>' +
      '<div class="section-content"><div class="sub-well">' +
      '<div class="srefs synonym-discussion">See Synonym Discussion at ' +
      '<a href="bword://detach" class="sr">detach</a></div>' +
      "</div></div></div></mean>",
    "abstract",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const related = unitsOf(result.value.content, "related-item");
  expect(related).toHaveLength(1);
  expect(related[0]?.open).toBe(false);
  const references = unitsOf(related[0], "synonym-discussion-reference");
  expect(references).toHaveLength(1);
  expect(unitsOf(related[0], "synonym-discussion")).toHaveLength(0);
  expect(textOf(references[0])).toBe("See Synonym Discussion at detach");
  const targets = unitsOf(references[0], "cross-reference");
  expect(targets).toHaveLength(1);
  expect(textOf(targets[0])).toBe("detach");
  expect(targets[0]?.data?.relation).toBeUndefined();
  expect(JSON.stringify(references[0])).not.toContain("bword://");

  const rendered = cheerio.load(renderToHtml(result.value.content));
  const renderedReference = rendered(
    '[data-sc-content="synonym-discussion-reference"]',
  );
  const renderedTarget = renderedReference.children(
    'span[data-sc-content="cross-reference"]',
  );
  expect(renderedReference.prop("tagName")?.toLowerCase()).toBe("div");
  expect(renderedTarget.text()).toBe("detach");
  expect(renderedTarget.closest("a")).toHaveLength(0);
  expect(renderedTarget.attr("data-sc-relation")).toBeUndefined();
});

test("structures a synonym discussion into term entries and local examples", () => {
  const result = convert(
    "<mean>" +
      header("take", "verb", "¦tāk") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(sense('<span class="num">1</span>', '<span class="dt ">get</span>')) +
      "</div></div></div>" +
      '<div class="section related-to" data-id="related-to">' +
      '<h2 class="toggle"><span class="text">Synonym Discussion</span></h2>' +
      '<div class="section-content"><div class="syn synonym-discussion"><p class="syn">' +
      "<strong>Synonym Discussion</strong>" +
      '<a href="bword://seize" class="mw_t_sc">seize</a>, ' +
      '<a href="bword://grasp" class="mw_t_sc">grasp</a>, ' +
      '<a href="bword://clutch" class="mw_t_sc">clutch</a>, ' +
      '<a href="bword://snatch" class="mw_t_sc">snatch</a>, and ' +
      '<a href="bword://grab" class="mw_t_sc">grab</a>: ' +
      '<a href="bword://take" class="mw_t_sc">take</a> is a general term. ' +
      '<span class="ex-sent t no-aq sents-inline">&lt;<span class="mw_t_wi">take</span> the book&gt;</span>' +
      '<span class="ex-sent aq has-aq sents-inline">' +
      '<span class="aq"><span class="auth"> — source</span></span></span>' +
      '<a href="bword://seize" class="mw_t_sc">seize</a> suggests sudden taking. ' +
      '<span class="ex-sent t no-aq sents-inline">&lt;they <span class="mw_t_wi">seized</span> it&gt;</span>' +
      '<span class="ex-sent t no-aq sents-inline">&lt;the second <span class="mw_t_wi">seize</span> example&gt;</span>' +
      '<a href="bword://grasp" class="mw_t_sc">grasp</a> implies firm taking. ' +
      '<a href="bword://clutch" class="mw_t_sc">clutch</a> suggests firmness. ' +
      '<a href="bword://snatch" class="mw_t_sc">snatch</a> stresses suddenness. ' +
      '<a href="bword://grab" class="mw_t_sc">grab</a> suggests rough force. ' +
      '</p><p class="see-in-addition"><strong>synonyms</strong> see in addition ' +
      '<a href="bword://attract" class="sa-link sc">attract</a>, ' +
      '<a href="bword://receive" class="sa-link sc">receive</a></p></div></div></div></mean>',
    "take",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const related = unitsOf(result.value.content, "related-item");
  expect(related).toHaveLength(1);
  expect(related[0]?.open).toBe(false);
  expect(unitsOf(related[0], "synonym-discussion")).toHaveLength(1);
  expect(unitsOf(related[0], "synonym-term-group")).toHaveLength(1);
  expect(textOf(unitsOf(related[0], "synonym-term-group")[0])).toContain(
    "seize, grasp, clutch, snatch, and grab",
  );
  expect(unitsOf(related[0], "synonym-introduction")).toHaveLength(1);
  expect(textOf(unitsOf(related[0], "synonym-introduction")[0])).toContain(
    "take is a general term",
  );
  expect(unitsOf(related[0], "synonym-entry")).toHaveLength(5);
  expect(unitsOf(related[0], "synonym-entry").map(textOf)).toEqual([
    expect.stringContaining("seize suggests sudden taking"),
    expect.stringContaining("grasp implies firm taking"),
    expect.stringContaining("clutch suggests firmness"),
    expect.stringContaining("snatch stresses suddenness"),
    expect.stringContaining("grab suggests rough force"),
  ]);
  expect(unitsOf(related[0], "synonym-term")).toHaveLength(10);
  expect(unitsOf(related[0], "see-in-addition")).toHaveLength(1);
  expect(unitsOf(related[0], "target-highlight").length).toBeGreaterThan(0);
  expect(unitsOf(related[0], "extra-examples")).toHaveLength(1);
  const introduction = unitsOf(related[0], "synonym-introduction")[0];
  expect(unitsOf(introduction, "example-source").map(textOf)).toEqual([
    "— source",
  ]);
  const firstEntry = unitsOf(related[0], "synonym-entry")[0];
  expect(firstEntry?.tag).toBe("div");
  expect(unitsOf(firstEntry, "synonym-explanation")).toHaveLength(1);
  expect(unitsOf(firstEntry, "synonym-explanation")[0]?.tag).toBe("span");
  expect(unitsOf(firstEntry, "example-source-inline")).toHaveLength(0);
  expect(result.value.findings).toEqual([]);
});

test("keeps multiple synonym references inside one inline entry", () => {
  const result = convert(
    "<mean>" +
      header("turn", "verb", "¦tərn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(sense('<span class="num">1</span>', '<span class="dt ">turn</span>')) +
      "</div></div></div>" +
      '<div class="section related-to" data-id="related-to">' +
      '<h2 class="toggle"><span class="text">Synonym Discussion</span></h2>' +
      '<div class="section-content"><div class="syn synonym-discussion"><p class="syn">' +
      "<strong>Synonym Discussion</strong>" +
      '<a href="bword://spin" class="mw_t_sc">spin</a>, ' +
      '<a href="bword://twirl" class="mw_t_sc">twirl</a>, ' +
      '<a href="bword://whirl" class="mw_t_sc">whirl</a>: ' +
      '<a href="bword://spin" class="mw_t_sc">spin</a> is a general term. ' +
      '<a href="bword://twirl" class="mw_t_sc">twirl</a> adds to the ideas of ' +
      '<a href="bword://spin" class="mw_t_sc">spin</a> and ' +
      '<a href="bword://whirl" class="mw_t_sc">whirl</a> those of dexterity. ' +
      '<a href="bword://whirl" class="mw_t_sc">whirl</a> stresses force and speed. ' +
      "</p></div></div></div></mean>",
    "turn",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const related = unitsOf(result.value.content, "related-item")[0];
  const entries = unitsOf(related, "synonym-entry");
  expect(entries).toHaveLength(3);
  expect(entries.map(textOf)).toEqual([
    expect.stringContaining("spin is a general term"),
    expect.stringContaining("twirl adds to the ideas of spin and whirl"),
    expect.stringContaining("whirl stresses force and speed"),
  ]);

  const twirlEntry = entries[1];
  expect(unitsOf(twirlEntry, "synonym-term").map(textOf)).toEqual(["twirl"]);
  expect(unitsOf(twirlEntry, "cross-reference").map(textOf)).toEqual([
    "spin",
    "whirl",
  ]);
  expect(unitsOf(twirlEntry, "synonym-explanation")).toHaveLength(1);
  expect(unitsOf(twirlEntry, "synonym-explanation")[0]?.tag).toBe("span");
  expect(result.value.findings).toEqual([]);
});

const phraseOwner = (headword: string, body: string): string =>
  '<div class="dro"><span class="drp">' +
  headword +
  '</span><span class="fl">transitive verb</span>' +
  body +
  "</div>";

const example = (highlightPairs: string): string =>
  '<span class="vis"><span class="vi"><span class="ex-sent-group">' +
  '<span class="ex-sent t no-aq sents">' +
  highlightPairs +
  "</span></span></span></span>";

const phrasePlan = (ownerHtml: string) => ({
  kind: "drp-phrase-canonical-entry" as const,
  term: "take apart",
  parentTerm: "take",
  source: {
    rowId: 1,
    rowKey: "take",
    meanIndex: 0,
    phraseIndex: 0,
    ownerHtml,
  },
});

test("attaches v_phr rules to a phrase with paired target highlights", () => {
  const result = convertCanonical(
    phrasePlan(
      phraseOwner(
        "take apart",
        '<div class="vg"><div class="sense"><span class="dt">: to separate' +
          example(
            'they <span class="mw_t_wi">took</span> the engine <span class="mw_t_wi">apart</span>',
          ) +
          example(
            'she <span class="mw_t_wi">takes</span> it <span class="mw_t_wi">apart</span>',
          ) +
          "</span></div></div>",
      ),
    ),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(result.value.rules).toBe("v_phr");
  expect(result.value.findings).toContainEqual({
    kind: "interposed-object-v-phr",
    rowId: 1,
    term: "take apart",
    exampleCount: 2,
  });
});

test("never attaches v_phr for a single highlight or adjacent highlights", () => {
  const single = convertCanonical(
    phrasePlan(
      phraseOwner(
        "take apart",
        '<div class="vg"><div class="sense"><span class="dt">: to separate' +
          example('they took it <span class="mw_t_wi">apart</span>') +
          "</span></div></div>",
      ),
    ),
  );
  expect(single.ok && single.value.rules).toBeNull();

  const adjacent = convertCanonical(
    phrasePlan(
      phraseOwner(
        "take apart",
        '<div class="vg"><div class="sense"><span class="dt">: to separate' +
          example(
            'they <span class="mw_t_wi">took</span><span class="mw_t_wi">apart</span> the engine',
          ) +
          "</span></div></div>",
      ),
    ),
  );
  expect(adjacent.ok && adjacent.value.rules).toBeNull();
});

test("treats emphasis pairs as interposed-object evidence when the second mark is the final token", () => {
  const result = convertCanonical(
    phrasePlan(
      phraseOwner(
        "take apart",
        '<div class="vg"><div class="sense"><span class="dt">: to separate' +
          example(
            'they <em class="mw_t_it">took</em> the engine <em class="mw_t_it">apart</em>',
          ) +
          "</span></div></div>",
      ),
    ),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.rules).toBe("v_phr");
  expect(result.value.findings).toContainEqual({
    kind: "interposed-object-v-phr",
    rowId: 1,
    term: "take apart",
    exampleCount: 1,
  });
});

test("ignores emphasis that is not an interposed pair", () => {
  const result = convertCanonical(
    phrasePlan(
      phraseOwner(
        "take apart",
        '<div class="vg"><div class="sense"><span class="dt">: to separate' +
          example("they took the <em>whole</em> engine apart") +
          "</span></div></div>",
      ),
    ),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.rules).toBeNull();
  expect(result.value.findings).toEqual([]);
});

test("requires the second mark to be the term's final token", () => {
  const result = convertCanonical(
    phrasePlan(
      phraseOwner(
        "take apart",
        '<div class="vg"><div class="sense"><span class="dt">: to separate' +
          example(
            'they <em class="mw_t_it">took</em> it <em class="mw_t_it">out</em>',
          ) +
          "</span></div></div>",
      ),
    ),
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.rules).toBeNull();
  expect(result.value.findings).toEqual([]);
});

test("attaches v_phr to a multiword main entry with interposed evidence", () => {
  const result = convert(
    "<mean>" +
      header("give up", "transitive verb", "¦giv ˈəp") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      '<div class="sense has-sn"><span class="sn sense-1">1</span>' +
      '<span class="dt ">to abandon' +
      example(
        'couldn\'t answer the riddle and so <em class="mw_t_it">gave</em> it <em class="mw_t_it">up</em>',
      ) +
      "</span></div>" +
      "</div></div></div></mean>",
    "give up",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.rules).toBe("v_phr");
});

test("keeps v_phr off single-word entries with the same example shapes", () => {
  const result = convert(
    "<mean>" +
      header("give", "verb", "¦giv") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      '<div class="sense has-sn"><span class="sn sense-1">1</span>' +
      '<span class="dt ">to make a present of' +
      example(
        'as for me, <span class="mw_t_wi">give</span> me liberty or <span class="mw_t_wi">give</span> me death',
      ) +
      "</span></div>" +
      "</div></div></div></mean>",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.rules).toBeNull();
});

test("tags etymology links as origin and text-lowercase spans as sense pointers", () => {
  const result = convert(
    "<mean>" +
      header("who", "pronoun", "¦hü") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense(
          '<span class="num">1</span>',
          '<span class="dt ">' +
            '<a href="bword://who" class="mw_t_et_link">who</a>' +
            '<span class="text-lowercase">8</span>, ' +
            '<a href="bword://who[1]" class="mw_t_sx"><sup>1</sup>who</a>' +
            '<span class="text-lowercase">1a(1)</span>, ' +
            '<a href="bword://depend" class="mw_t_sc">depend</a>' +
            '<span class="text-lowercase">intransitive sense 1</span>' +
            "</span>",
        ),
      ) +
      "</div></div></div></mean>",
    "who",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  expect(
    unitsOf(result.value.content, "cross-reference").map(
      (node: JsonObject): unknown => node.data?.relation,
    ),
  ).toEqual(["origin", "see", "related"]);
  const pointers = unitsOf(
    result.value.content,
    "superscript-reference",
  ).filter(
    (node: JsonObject): unknown => node.data?.sourceUnit === "text-lowercase",
  );
  expect(pointers.map(textOf)).toEqual(["8", "1a(1)"]);
});
