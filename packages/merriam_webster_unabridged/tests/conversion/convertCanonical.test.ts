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
  expect(textOf(pronunciations[0])).toBe(
    "/(ˈ)in/, /ən/; usually ᵊn after t, /d/",
  );
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
  expect(
    unitsOf(result.value.content, "cross-reference")[0]?.data?.relation,
  ).toBe("compare");
  const superscripts = unitsOf(result.value.content, "superscript-reference");
  expect(superscripts).toHaveLength(1);
  expect(textOf(superscripts[0])).toBe("4");
});

test("marks variant references with variant relations", () => {
  const result = convert(
    "<mean>" +
      header("O", "noun", "¦ō") +
      '<div class="section" data-id="definition">' +
      '<p class="cxl-ref"> <span class="cxl">variant spelling of</span> ' +
      '<a href="bword://oh" class="cxt">oh</a> </p></div></mean>',
    "O",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const variants = unitsOf(result.value.content, "variant-reference");
  expect(variants).toHaveLength(1);
  expect(
    unitsOf(result.value.content, "cross-reference")[0]?.data?.relation,
  ).toBe("variant");
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

test("marks see-in-addition units", () => {
  const result = convert(
    "<mean>" +
      header("turn", "noun", "¦tərn") +
      '<div class="section" data-id="definition"><div class="def-wrapper"><div class="vg">' +
      sb(
        sense('<span class="num">1</span>', '<span class="dt ">a place</span>'),
      ) +
      "</div></div></div>" +
      '<div class="section" data-id="related-to"><div class="section-content">' +
      '<p class="see-in-addition"><strong>synonyms</strong> see in addition ' +
      '<a href="bword://depend" class="sa-link sc">depend</a></p>' +
      "</div></div></mean>",
    "turn",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const seeInAddition = unitsOf(result.value.content, "see-in-addition");
  expect(seeInAddition).toHaveLength(1);
  expect(textOf(seeInAddition[0])).toContain("synonyms");
  expect(textOf(seeInAddition[0])).toContain("depend");
  const strong = unitsOf(result.value.content, "strong");
  expect(strong).toHaveLength(1);
  expect(textOf(strong[0])).toContain("synonyms");
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

test("sets the tag title from the label text", () => {
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
  expect(tags[0]?.title).toBe("chiefly dialectal");
});
