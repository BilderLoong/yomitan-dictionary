// Single source of truth for the survey information-unit catalog.
//
// This file mirrors (and feeds) the "Information-unit catalog" table in
// docs/mwu-html-information-unit-catlog/README.md. It is the machine
// truth: change THIS file first when a unit, class token, Ignore flag,
// or follow-up changes, and update the README table from it. The
// inspector is read-only: it reports, it never emits Yomitan entries.

export type UnitState = "resolved" | "follow-up" | "open" | "n/a";

export interface CatalogUnit {
  readonly unit: string;
  readonly explanation: string;
  readonly example: string;
  /** "Related HTML class/tag" column — readable selectors/notes, not a machine map. */
  readonly classes: string;
  /** "Level and binding" column — prose describing the normal owner and observed exceptions. */
  readonly binding: string;
  readonly ignore: boolean;
  /** DB row count, filled for the 2026-08-07 new-discovery units only. */
  readonly rows: number | null;
  readonly state: UnitState | null;
  /** "In the build it appears as…" — verified rendering evidence, new-discovery units only. */
  readonly inBuild: string | null;
  readonly todo: string | null;
}

export const CATALOG_UNITS: readonly CatalogUnit[] = [
  {
    unit: "lexical-entry",
    explanation:
      "One lexical/POS block with its own headword and definition tree.",
    example: "a headword; a phrase",
    classes: "mean tag; .hword",
    binding:
      "Level 1. A definition-bearing block becomes a main-canonical-entry or alternative-spelling-canonical-entry; every defined .drp phrase with its own tree becomes a drp-phrase-canonical-entry and the parent retains its .dro section.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "source-word-row",
    explanation:
      "Source-article boundary and lookup spelling used during Level 1 generation.",
    example: "word.w = o; HTML payload in word.m",
    classes: "SQLite word(id,w,m)",
    binding:
      "Generation metadata for the source article, not rendered content. It supplies the source spelling for canonical ownership and main-to-alternative-spelling-soft-link generation.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "searchable-headword",
    explanation:
      "Lookup spelling extracted from a local headword after removing confirmed presentation-only homograph markup and confirmed syllabification markers, then trimming only leading/trailing HTML boundary whitespace.",
    example: "<sup>1</sup> brief → brief; lit·tle → little; 1 in- → in-",
    classes: ".hword; sup",
    binding:
      "Level 1 identity metadata. It is compared with decoded word.w and used as the canonical target spelling. Meaningful punctuation, internal spaces, and diacritics remain significant. Unrecognized markup must be reported, not silently normalized.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "syllabification-marker",
    explanation:
      "Display-only text marking syllable boundaries in a printed headword.",
    example: "lit·tle",
    classes:
      "Plain · text inside .hword (currently observed as U+00B7 MIDDLE DOT)",
    binding:
      "Level 1 display metadata. · is the only confirmed marker so far, not an exhaustive list. Preserve confirmed markers in headword-display; remove them from searchable-headword only after recognition; report unfamiliar candidates.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "homograph-number",
    explanation:
      "A small source number identifying which same-spelling headword/<mean> is being shown.",
    example: "<sup>1</sup> set; <sup>3</sup> sett",
    classes: "sup inside .hword",
    binding:
      "Level 1 identity metadata. Remove it from the searchable term; preserve it as source evidence or display metadata when the local UI needs the distinction. It is not a sense number and not the same as a superscript attached to a cross-reference.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "dedicated-word-row",
    explanation: "Existence of a source row for an embedded headword.",
    example: "o%27 owns o'; oh owns oh",
    classes: "SQLite word.w index",
    binding:
      "Generation metadata. A dedicated row owns a different-spelling embedded <mean> without semantic comparison.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "source-row-membership",
    explanation:
      "A different-spelling <mean> headword hosted in a source word row.",
    example: "o row contains oh, o-, and -o",
    classes: "word.w; mean; .hword",
    binding:
      "Level 1 relationship metadata. Creates a main-to-alternative-spelling-soft-link from word.w to the target headword, for both alternative-spelling target cases.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "soft-link-entry",
    explanation:
      "Searchable Level 1 relationship that points to a canonical term without copying its definition.",
    example: "o → oh; take up the word → take the word",
    classes: "Derived Yomitan record; dictionary-deinflection tuple",
    binding:
      "Level 1 generated entry. Its evidence is retained separately from the canonical definition tree.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "bare-affix-soft-link",
    explanation:
      "Additional searchable spelling made by removing only the source affix boundary hyphen from a confirmed prefix, suffix, or infix term.",
    example: "il- → il; -in → in; -i- → i",
    classes:
      "Derived from the marked .hword/.va term; Yomitan dictionary-deinflection tuple",
    binding:
      "Level 1 generated soft link to the same canonical target. Apply this to every eligible marked affix and marked alternate, not only the currently observed il-, im-, ir-, and ino- examples. Reuse an existing main-to-alternative-spelling-soft-link when it already supplies the exact term-to-target route.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "alt-index-row",
    explanation:
      "Alternate lookup index row whose semantic relationship is not yet classified.",
    example: "alt(id,w) points a lookup spelling to a source row",
    classes: "SQLite alt table",
    binding:
      "Possible future soft-link evidence; skipped by the current build.",
    ignore: true,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "part-of-speech",
    explanation: "Grammar category for a lexical entry or phrase.",
    example: "verb; noun; pronoun; adverb",
    classes: ".fl; .hword + .fl",
    binding:
      "Level 1. Header .fl belongs to the entry; phrase .fl belongs to the phrase relation.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "entry-qualifier",
    explanation:
      "Header qualification that applies to the whole lexical entry.",
    example: "often capitalized; often attributive",
    classes: ".lbs; .lb",
    binding:
      "Level 1, attached to the entry header. Keep it as visible inline metadata rather than a definition tag.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "verb-subtype",
    explanation: "A verb subgroup such as transitive or intransitive.",
    example: "transitive verb; intransitive verb",
    classes: ".vg; .vd",
    binding:
      "Level 2 when .vd is inside a verb group. A separate intransitive-verb mean is another source shape.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "grammar-label",
    explanation:
      "A local grammar restriction attached to one sense or sense group, distinct from the entry-wide POS tag and from a .vd verb group.",
    example: "transitive; transitive + intransitive",
    classes: ".sgram; sometimes a linked bword:///dictionary/... label",
    binding:
      "Usually Level 3–5, bound to the nearest local sense/group. Keep it as scoped inline text first; do not promote it to the tag bank until its scope is stable across the dictionary.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "pronunciation",
    explanation:
      "Visible pronunciation reading for an entry or other pronunciation-bearing owner.",
    example: "/ˈtərn/; /ˈtu̇rn/",
    classes: ".prs; .pr",
    binding:
      "Level 1 for the entry header; use the nearest semantic owner when pronunciation belongs to a phrase or sense. All readings go into structured content; the Yomitan reading field remains empty.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "pronunciation-reading",
    explanation:
      "One source-supported pronunciation reading, delimited for display as IPA-like text.",
    example: "/ˈin/; /ən/; /d/",
    classes: ".mw inside .pr or .prt-a",
    binding:
      "Child of the nearest pronunciation or form-pronunciation unit. Only reading fragments receive delimiters; the renderer does not infer delimiters for ambiguous prose.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "pronunciation-note",
    explanation:
      "Explanatory pronunciation prose that qualifies a nearby reading or pronunciation group.",
    example: "usually ᵊn after t; also; chiefly Midland also",
    classes: "Plain text or .mw_t_it inside .pr/.prt-a; .l",
    binding:
      "Stays outside reading delimiters and remains local pronunciation content. Preserve raw text when the source does not prove a reading boundary. .l is the qualifier class inside .pr (3,255 rows).",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "pronunciation-audio",
    explanation: "Playable audio metadata associated with one pronunciation.",
    example: "sound://word/0001.mp3",
    classes: ".play-pron; .hw-play-pron; .audio-icon",
    binding:
      "Level 1 source evidence only. Audio files are deferred and are not included in the current Yomitan dictionary.",
    ignore: true,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "form-pronunciation",
    explanation:
      "Pronunciation alternatives attached to an inflected or alternate form rather than the main entry header.",
    example: "process plural: ˈprä-...; put: ˈpu̇t chiefly dialectal ˈpət",
    classes: ".prt-a; .mw",
    binding:
      "Bound to the owning form or variant at its nearest level. Preserve every reading and its local qualifier in structured content; leave the Yomitan reading field empty.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "headword-display",
    explanation:
      "The visible rich headword form, including homograph numbers and printed syllable dots.",
    example: "happiness shown as hap·pi·ness; 1 process",
    classes: ".hword; .breakpoints; .breakpoint; sup",
    binding:
      "Level 1. Preserve visible source text and inline styling. .breakpoint spans may only be responsive line-break chunks, so their boundaries are not interpreted as linguistic syllables.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "source-block-boundary",
    explanation:
      "A source sibling boundary that should remain a visible line break between an attached label and its definition or between responsive text chunks.",
    example:
      "slang on its own line before : what is the reason for : what is wrong with",
    classes: ".sls; .breakpoint; .breakpoints; sibling block elements",
    binding:
      "Bound to the nearest owner level. Render with block structured-content nodes or an equivalent supported layout; do not invent a line break for ordinary inline .sl labels.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "inflection",
    explanation: "A form or grammatical variation of a headword or sense.",
    example: "plural -s; past -ed",
    classes: ".headword-row; .if; .spl",
    binding:
      "Level 1 for headword-row forms; it can bind to Level 4 or Level 5 when inside a sense.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "inflection-group",
    explanation:
      "Ordered display block containing one or more forms, their labels, markers, and pronunciations.",
    example: "have: past had, past participle had, present participle having",
    classes: ".vg-ins; .headword-row",
    binding:
      "Level 1 when it occurs in the entry header; otherwise use the nearest semantic owner. It preserves source order but is not a new hierarchy level.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "inflection-label",
    explanation:
      "Grammatical, register, or alternation text qualifying one form.",
    example: "past; past participle; also archaic 2d singular; or dialectal",
    classes: ".il",
    binding:
      "Bound to the associated form inside an inflection-group. Keep it inline; do not promote it to a global tag without later scope evidence.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "inflection-marker",
    explanation: "Printed form marker indicating a suffix or group of forms.",
    example: "-s; -es; -ed/-ing/-s",
    classes: ".ix",
    binding:
      "Bound to the associated form inside an inflection-group. Preserve it as form metadata, not as a separate lexical entry.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "origin",
    explanation: "Etymological history of an entry.",
    example: "Middle English; partly from Old English",
    classes: ".section-content.etymology; .et; .mw_t_et_link",
    binding: "Level 1, normally scoped to one lexical/POS entry.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "origin-section-title",
    explanation: "Visible title introducing an origin/etymology section.",
    example: "Origin of WHAT",
    classes: ".toggle .text; h2.toggle",
    binding:
      "Level 1, bound to the local origin section. Render as a titled collapsible boundary rather than ordinary definition text.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "first-known-use",
    explanation: "Earliest recorded use, often with a sense reference.",
    example: "before 12th century (sense 1a)",
    classes: "Bare <p> inside .sub-well; .section-content.etymology",
    binding:
      "Level 1, inside the origin section after the etymology prose. It is plain text recognized by its 'First Known Use:' prefix, not a dedicated class (187,911 rows, 39.9%). Render the value verbatim in the collapsed origin body for every canonical entry whose source carries it; the optional parenthesized sense reference stays part of the value.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "sense-number",
    explanation: "Numbered broad sense marker.",
    example: "1; 2; 3",
    classes: ".sn; .num; .sb.has-num",
    binding:
      "Level 3. A deeper marker may inherit the number from an ancestor.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "sense-label",
    explanation: "Usage or register label qualifying a sense or sense group.",
    example: "archaic; chiefly British; chiefly substandard",
    classes: ".sl; .sls > .sl",
    binding:
      "Usually Level 3–5. A group-scoped .sls > .sl label is attached to the nearest local sense flow; phrase-level labels have their own phrase owner. Preserve it inline unless its scope is stable enough for a tag-bank entry.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "subsense-letter",
    explanation: "Lettered subdivision of a numbered or unnumbered sense.",
    example: "a; b; c",
    classes: ".sn; .letter; .sb.has-let; legacy .sense-(a)/.sense-(b) tokens",
    binding:
      'Level 4. The marker may appear with a parenthesized definition number. The legacy class="sn sense-(a)" variants (one row: indirect) duplicate the .letter child text and need no parser special-casing.',
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "definition-number",
    explanation: "Parenthesized individual-definition marker.",
    example: "(1); (2); (3)",
    classes: ".sn; .sub-num; .sb.has-subnum",
    binding:
      "Level 5. It can appear without repeating the inherited number and letter.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "definition",
    explanation: "Meaning text for a sense or phrase.",
    example: "to cause movement around an axis",
    classes: ".dt; .sense; .sen; .pseq",
    binding:
      "Levels 3–5. .sen, .sense, .pseq, and .dt can participate in different depths.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "definition-label",
    explanation: "Text that introduces or qualifies one definition.",
    example: "of a blade; chiefly dialectal",
    classes: ".sl; .lb",
    binding: "Usually Level 5, but verify the nearest definition owner.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "sub-definition",
    explanation:
      "A subordinate definition introduced inside a definition or usage note.",
    example:
      "specifically: to turn the leaves of (a book): read or search through",
    classes: ".sdsense; .sd",
    binding:
      "Source attachment to the nearest definition or usage-note owner; rendered as a normal continuation of that definition, not a separate structural block. Preserve the source order and qualifier styling.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "usage-note",
    explanation: "Usage or grammar note attached to a definition.",
    example: "usually used with over",
    classes: ".uns; .un; .unText",
    binding:
      "Level 6. .un can contain another .un, so nesting must be preserved.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "example-sentence",
    explanation: "Example showing the definition in use.",
    example: "The machine turned slowly.",
    classes: ".ex-sent-group; .ex-sent; .vi; .vis",
    binding: "Level 6 under .dt, .un, a phrase, or related discussion.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "extra-examples",
    explanation:
      "Output-only collapsed container for examples beyond the first visible example in a local group.",
    example: "2 more examples",
    classes: "Generated Yomitan details/summary node",
    binding:
      "Level 6 presentation attached to the local example owner. It does not change example ownership or source order.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "example-source",
    explanation: "Author or publication attribution for an example.",
    example: "Theodore Roethke; Ford Times",
    classes: ".auth; .source; .aq",
    binding:
      "Level 6, attached to its example. .auth and .source are attribution variants.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "example-date",
    explanation: "Date or period included in an example attribution.",
    example: "May 1991; November 2001",
    classes: ".aqdate",
    binding:
      "Level 6 as a child of example-source; keep it with its example rather than making a separate attachment.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "comparison-reference",
    explanation: "See or compare reference attached to meaning content.",
    example: "compare a related term; see another entry",
    classes: ".dx-jump; .mw_t_dxt",
    binding: "Level 6 under a definition or usage note.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "cross-reference",
    explanation:
      "Visible linked word or phrase pointing to another dictionary item, including an etymological “more at” reference.",
    example: "more at 1set; see a related term",
    classes:
      ".mw_t_sx; .mw_t_mat; .mw_t_et_link; .mw_t_a_link; .mw_t_i_link; .iw; gdlookup:// href",
    binding:
      "Bind to the nearest owner: Level 1 for an origin reference such as more at 1set or an in-word see sense N pointer (.iw, visible text encoded in its class tokens), or Level 6 for a local definition reference (.mw_t_a_link, .mw_t_i_link). Internal navigation targets are discarded.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "variant-reference",
    explanation:
      "A source statement identifying the local headword as a spelling variant of another entry.",
    example: "variant spelling of oh under O",
    classes: ".cxl-ref; .cxl; .cxt",
    binding:
      "Level 1, bound to the local <mean> headword. Preserve the visible relation; the source navigation target is not preserved as an internal link. A cross-reference-only <mean> emits a cxl-ref-variant-reference-soft-link to the referenced spelling.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "phrase",
    explanation:
      "A defined run-on multiword lexical unit hosted under a headword, with its own source phrase identity, label, and definition tree.",
    example: "take a bath; take the word",
    classes: ".dro; .drp; .vr; .va; .fl; .vg",
    binding:
      "Level 1 relation to the parent entry. .dro is a collection; each .drp has its own phrase boundary and definition tree and becomes an independent drp-phrase-canonical-entry. A .va alternate becomes a phrase-alternate-soft-link; the parent retains the phrase section.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "alternate-form",
    explanation:
      "A spelling or phrase variant related to a canonical expression.",
    example: "take stage → take the stage; take the word → take up the word",
    classes: ".vr; .va; alt table row",
    binding:
      "Level 1 relationship. A recognized local .va becomes a soft-link-entry; a raw alt-table row alone is not extracted as a dictionary entry.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "variant-qualifier",
    explanation:
      "Text describing how an alternate expression relates to its canonical form.",
    example: "or less commonly; or",
    classes: ".vl; .vr",
    binding:
      "Bound to the alternate-form relation, usually at Level 1 for a phrase or variant, or at the nearest sense owner when .vr occurs inside a sense. Preserve it inline next to the alternate.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "undefined-run-on",
    explanation:
      "A derivative displayed under a parent entry without its own definition tree. It may carry pronunciation, POS, variants, inflections, labels, and examples.",
    example: "abandon → abandoner, noun, plural abandoners",
    classes:
      ".dro; .uro; .ure; optional .prt-a, .mw, .fl, .vr, .va, .il, .if, .ix, .sl, .utxt",
    binding:
      "Level 1 relation. Preserve the complete run-on under its parent. Do not create an independent searchable record or soft link because it has no definition.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "run-on-form",
    explanation: "The visible form spelling owned by an undefined run-on.",
    example: "in–ness",
    classes: ".uro .ure",
    binding:
      "Child of undefined-run-on; keep it in source order with its local pronunciation, POS, labels, and inflection markers.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "phrase-date",
    explanation:
      "Year attached to a defined phrase in .dro, the phrase analog of first-known-use.",
    example: "1850 for the American way; 1681 for the Little Bear",
    classes: ".date",
    binding:
      "Bound to the phrase relation (Level 1), immediately before its .drp. Exactly 2 rows in the DB; distinct from .aqdate (example-date) and from entry-level first-known-use.",
    ignore: true,
    rows: 2,
    state: "resolved",
    inBuild: "not emitted — ignored (the American way record has no 1850)",
    todo: "— (decided ignore)",
  },
  {
    unit: "defined-derivative",
    explanation: "A derivative with its own source-owned definition tree.",
    example: "a derived word that MWU defines separately",
    classes:
      "Definition-bearing derivative structure; exact selector remains to be confirmed when encountered",
    binding:
      "Bound to its nearest source owner. It becomes independently searchable only when MWU provides its own definition.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "related-item",
    explanation:
      "A related word or entry reference outside the main definition.",
    example: "a word in a see-also section",
    classes: ".related-to; .mw_t_sc",
    binding:
      "Usually Level 1 in related-to content, but local related references may be Level 6.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "see-in-addition",
    explanation:
      "A compact pointer line that lists additional entries for synonym or usage information. It is the same information unit in both locations; only its nearest semantic owner changes.",
    example: "synonyms see in addition depend; usages see in addition -ize",
    classes: ".see-in-addition; .sa-link; .sc; #usage-notes; .usage",
    binding:
      "Level 1 inside a synonym discussion; Level 6 when inside #usage-notes or a definition-local .usage block. Bind it to the nearest owner and discard only the navigation target.",
    ignore: false,
    rows: null,
    state: "follow-up",
    inBuild: null,
    todo: "Level 6 #usage-notes/.usage placements (because, finalize, he, one, they) not yet wired through the renderer's usage-notes traversal",
  },
  {
    unit: "called-also",
    explanation: "A named alternative for the thing described by a definition.",
    example: "called also another term",
    classes: ".ca; .cat; .ucat",
    binding:
      "Level 6 when it occurs inside .dt. Called-also targets carry no homograph-prefix superscripts; leading digits are plain chemical names (2,4-dichlorophenoxyacetic acid).",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "called-also-number",
    explanation:
      "Parenthesized list number separating terms in a called-also respectively list.",
    example: "(1); (2); (3) between .ucat terms",
    classes: ".pn",
    binding:
      "Level 6 child of called-also (59 rows). A marker, not a definition number.",
    ignore: false,
    rows: 59,
    state: "resolved",
    inBuild: "inline text ((1), (2) — alligation)",
    todo: null,
  },
  {
    unit: "synonym-discussion",
    explanation:
      "Explanatory comparison of synonyms and their usage differences. It contains an introductory term group, one term-specific synonym entry per compared term, and separate examples, sources, and see-in-addition content.",
    example: "Synonym Discussion: seize, grasp, clutch, snatch, grab",
    classes: ".related-to; .syn; .synonym-discussion; .mw_t_sc",
    binding:
      "Level 1 related information attached to the lexical entry; collapsed as one related-item disclosure by default.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "synonym-term-group",
    explanation:
      "The introductory list of terms compared by a synonym discussion.",
    example: "seize, grasp, clutch, snatch, grab",
    classes: ".mw_t_sc siblings before the introductory explanation",
    binding:
      "Level 1 child of synonym-discussion. Keep each term distinct and preserve its source order.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "synonym-term",
    explanation:
      "One named term in the introductory group or one term-specific entry heading.",
    example: "seize",
    classes: ".mw_t_sc",
    binding:
      "Level 1 child of synonym-term-group or synonym-entry. It is semantic local content, not a clickable Yomitan link.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "synonym-introduction",
    explanation:
      "The prose and examples explaining the comparison before the first term-specific entry.",
    example: "take is a general term ...",
    classes: ".syn nodes after the introductory .mw_t_sc group",
    binding:
      "Level 1 child of synonym-discussion. take remains a normal cross-reference inside this unit and does not become a synonym entry.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "synonym-entry",
    explanation: "One term-specific explanation inside a synonym discussion.",
    example: "seize suggests sudden and forcible taking",
    classes: ".mw_t_sc term boundary and following prose/examples",
    binding:
      "Level 1 child of synonym-discussion. Owns its explanation, examples, attributions, cross-references, and target highlights.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "synonym-explanation",
    explanation:
      "The prose portion owned by one synonym-entry, separate from its heading and examples.",
    example: "suggests sudden and forcible taking",
    classes: "Nodes between successive .mw_t_sc term boundaries",
    binding:
      "Level 1 child of synonym-entry. Keep ordinary cross-references and target highlights nested under the explanation.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "synonym-discussion-reference",
    explanation: "A pointer from an entry to a named synonym discussion.",
    example: "See Synonym Discussion at fun, play:2, room",
    classes: ".srefs.synonym-discussion; .sr",
    binding:
      "Level 1 related information. Keep the pointer separate from the actual synonym discussion and discard internal link targets.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "usage-discussion-reference",
    explanation:
      "A visible, non-interactive pointer from a local definition to a separate usage discussion.",
    example: "See Usage Discussion at bring",
    classes: ".urefs; .ur",
    binding:
      "Bound to the nearest definition that contains it. Preserve the line and visible target text; discard navigation targets, create no clickable affordance, and do not copy the target discussion.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "unclassified-visible-content",
    explanation:
      "Visible source content whose semantic class is not yet recognized.",
    example: "an unfamiliar related-section child",
    classes: "Any unsupported visible source subtree",
    binding:
      "Bind to the nearest known owner, preserve its text, and report a finding rather than silently dropping or flattening it.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "target-highlight",
    explanation:
      "Presentation metadata marking the looked-up expression inside an example.",
    example: "highlighted lookup word in an example",
    classes: ".mw_t_wi; .mw_t_sp",
    binding:
      "Level 6 example metadata. .mw_t_wi is useful for display but is not meaning text.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "superscript-reference",
    explanation:
      "Small visual reference number attached to a visible cross-reference.",
    example: "1whatever; whoever 1",
    classes: ".text-lowercase; sup",
    binding:
      "Bound to the nearest cross-reference, often Level 6. Two distinct source shapes: a sup inside the reference anchor (the target's homograph prefix, e.g. 1who) and a .text-lowercase span after the anchor carrying the target's sense pointer (1a, 8, 1a(1)). Keep both visually raised/lowered and never treat either as a new sense number.",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "entry-status-image",
    explanation:
      "Image used as an entry status or update marker rather than dictionary meaning.",
    example: "_images_definition_update-new.jpg",
    classes: ".entry-status; <img>",
    binding:
      "Level 1 header presentation. The survey reports it, but the current dictionary ignores it.",
    ignore: true,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
  {
    unit: "illustration",
    explanation:
      "Definition-artwork section containing one image and its caption.",
    example: "Illustration of aardvark with art_mwu_*.gif or art_dict_*.gif",
    classes: '.illustrations; .section[data-id="artwork"]; <img>; .sub-well',
    binding:
      "Level 1 related information attached to the lexical entry (3,984 rows; 3,951 images outside .entry-status). Media rendering is deferred to the later media phase.",
    ignore: true,
    rows: 3984,
    state: "resolved",
    inBuild:
      "not emitted — ignored by decision (aardvark record has no illustration text)",
    todo: "media phase (deferred)",
  },
  {
    unit: "illustration-caption",
    explanation:
      "Subject label of a definition illustration, possibly with sense references.",
    example: "compass 4a; abscissa",
    classes: ".caption",
    binding:
      "Child of illustration; Level 1 related information. Media phase is deferred.",
    ignore: true,
    rows: 3982,
    state: "resolved",
    inBuild:
      "not emitted — ignored by decision (aardvark record has no illustration text)",
    todo: "media phase (deferred)",
  },
  {
    unit: "table-image",
    explanation: "A full-page table rendered as an image on its own table row.",
    example: "table_unabridged_weight.jpg",
    classes: '.table-image; <img>; mean show="0"',
    binding:
      "Media page (52 rows) reached through table-reference links. No HTML <table> elements exist anywhere in the DB. Media phase is deferred.",
    ignore: true,
    rows: 52,
    state: "open",
    inBuild:
      "no entry — the row yields a missing-root finding (table_collegiate_alphabet)",
    todo: "media phase; confirm the expected finding for direct table-page lookups",
  },
  {
    unit: "table-reference",
    explanation: "A pointer section linking to a table-image page.",
    example: "Alphabet Table; Weights and Measures",
    classes: '.table-section; a[href^="bword:///table/"]',
    binding:
      "Level 1 related-item pointer (65 rows) directly after the definition body; keep the visible text, discard the navigation target. Media phase is deferred.",
    ignore: true,
    rows: 65,
    state: "resolved",
    inBuild: "not emitted — ignored (alphabet record has no table pointer)",
    todo: "media phase (deferred)",
  },
  {
    unit: "interposed-object-candidate",
    explanation:
      "Derived evidence that the components of a phrasal verb are separated by an intervening object in an example.",
    example: "take [a town] apart; takes [it] apart; gave it up",
    classes: ".ex-sent-group; .ex-sent; .mw_t_wi; .mw_t_it",
    binding:
      "Observed at Level 6, but points to the Level 1 entry where the canonical expression and Yomitan v_phr rule belong. Derive it from two marked spans (target highlight .mw_t_wi or emphasis .mw_t_it) with retained text between them, where the second marked span equals the term's final token. Entries with candidates serialize the v_phr rule in the term-bank rules field (evidence-based; see ADR 0005).",
    ignore: false,
    rows: null,
    state: null,
    inBuild: null,
    todo: null,
  },
];

export interface UnitMapping {
  readonly unit: string;
  readonly level: number;
}

// Machine map used by the inspector: class token → information unit + the
// level it is assigned at that token's normal owner. Curated alongside the
// unit rows above; a token that appears in a unit's `classes` column should
// be added here when the inspector should report it.
export const CLASS_TO_UNIT: Readonly<Record<string, UnitMapping>> = {
  hword: { unit: "headword-display", level: 1 },
  fl: { unit: "part-of-speech", level: 1 },
  lbs: { unit: "entry-qualifier", level: 1 },
  lb: { unit: "definition-label", level: 5 },
  vg: { unit: "sense-group", level: 2 },
  vd: { unit: "verb-subtype", level: 2 },
  sgram: { unit: "grammar-label", level: 3 },
  prs: { unit: "pronunciation", level: 1 },
  pr: { unit: "pronunciation-reading", level: 1 },
  l: { unit: "pronunciation-note", level: 1 },
  mw: { unit: "pronunciation-reading", level: 1 },
  "prt-a": { unit: "form-pronunciation", level: 1 },
  "play-pron": { unit: "pronunciation-audio", level: 1 },
  "hw-play-pron": { unit: "pronunciation-audio", level: 1 },
  "audio-icon": { unit: "pronunciation-audio", level: 1 },
  breakpoints: { unit: "headword-display", level: 1 },
  breakpoint: { unit: "headword-display", level: 1 },
  "no-hyphen": { unit: "headword-display", level: 1 },
  "headword-row": { unit: "inflection", level: 1 },
  if: { unit: "inflection-marker", level: 1 },
  spl: { unit: "inflection", level: 1 },
  "vg-ins": { unit: "inflection-group", level: 1 },
  il: { unit: "inflection-label", level: 1 },
  ix: { unit: "inflection-marker", level: 1 },
  etymology: { unit: "origin", level: 1 },
  et: { unit: "origin", level: 1 },
  mw_t_et_link: { unit: "cross-reference", level: 1 },
  toggle: { unit: "origin-section-title", level: 1 },
  sn: { unit: "sense-number", level: 3 },
  num: { unit: "sense-number", level: 3 },
  letter: { unit: "subsense-letter", level: 4 },
  "sense-(a)": { unit: "subsense-letter", level: 4 },
  "sense-(b)": { unit: "subsense-letter", level: 4 },
  "sub-num": { unit: "definition-number", level: 5 },
  sl: { unit: "sense-label", level: 3 },
  sls: { unit: "source-block-boundary", level: 3 },
  dt: { unit: "definition", level: 5 },
  sense: { unit: "definition", level: 3 },
  sen: { unit: "definition", level: 3 },
  pseq: { unit: "definition", level: 3 },
  sdsense: { unit: "sub-definition", level: 6 },
  sd: { unit: "sub-definition", level: 6 },
  uns: { unit: "usage-note", level: 6 },
  un: { unit: "usage-note", level: 6 },
  unText: { unit: "usage-note", level: 6 },
  "ex-sent-group": { unit: "example-sentence", level: 6 },
  "ex-sent": { unit: "example-sentence", level: 6 },
  vi: { unit: "example-sentence", level: 6 },
  vis: { unit: "example-sentence", level: 6 },
  auth: { unit: "example-source", level: 6 },
  source: { unit: "example-source", level: 6 },
  aq: { unit: "example-source", level: 6 },
  aqdate: { unit: "example-date", level: 6 },
  "dx-jump": { unit: "comparison-reference", level: 6 },
  mw_t_dxt: { unit: "comparison-reference", level: 6 },
  mw_t_sx: { unit: "cross-reference", level: 6 },
  mw_t_mat: { unit: "cross-reference", level: 1 },
  mw_t_a_link: { unit: "cross-reference", level: 6 },
  mw_t_i_link: { unit: "cross-reference", level: 6 },
  iw: { unit: "cross-reference", level: 1 },
  "cxl-ref": { unit: "variant-reference", level: 1 },
  cxl: { unit: "variant-reference", level: 1 },
  cxt: { unit: "variant-reference", level: 1 },
  dro: { unit: "phrase", level: 1 },
  drp: { unit: "phrase", level: 1 },
  vr: { unit: "alternate-form", level: 1 },
  va: { unit: "alternate-form", level: 1 },
  vl: { unit: "variant-qualifier", level: 1 },
  uro: { unit: "undefined-run-on", level: 1 },
  ure: { unit: "run-on-form", level: 1 },
  utxt: { unit: "undefined-run-on", level: 1 },
  "related-to": { unit: "related-item", level: 1 },
  mw_t_sc: { unit: "synonym-term", level: 1 },
  "see-in-addition": { unit: "see-in-addition", level: 1 },
  "sa-link": { unit: "see-in-addition", level: 1 },
  sc: { unit: "see-in-addition", level: 1 },
  usage: { unit: "see-in-addition", level: 6 },
  ca: { unit: "called-also", level: 6 },
  cat: { unit: "called-also", level: 6 },
  ucat: { unit: "called-also", level: 6 },
  pn: { unit: "called-also-number", level: 6 },
  syn: { unit: "synonym-discussion", level: 1 },
  "synonym-discussion": { unit: "synonym-discussion", level: 1 },
  srefs: { unit: "synonym-discussion-reference", level: 1 },
  sr: { unit: "synonym-discussion-reference", level: 1 },
  urefs: { unit: "usage-discussion-reference", level: 6 },
  ur: { unit: "usage-discussion-reference", level: 6 },
  mw_t_wi: { unit: "target-highlight", level: 6 },
  mw_t_sp: { unit: "target-highlight", level: 6 },
  "text-lowercase": { unit: "superscript-reference", level: 6 },
  "entry-status": { unit: "entry-status-image", level: 1 },
  illustrations: { unit: "illustration", level: 1 },
  caption: { unit: "illustration-caption", level: 1 },
  date: { unit: "phrase-date", level: 1 },
  "table-image": { unit: "table-image", level: 1 },
  "table-section": { unit: "table-reference", level: 1 },
  mw_t_bold: { unit: "strong", level: 6 },
};

// Presentation wrappers and containers without their own information unit.
export const PRESENTATION_CLASSES: readonly string[] = [
  "addPunct",
  "first-slash",
  "last-slash",
  "sents",
  "sents-inline",
  "sents-block",
  "toggle-icon",
  "visible-phone",
  "widget",
  "search-toolbar",
  "sub-well",
  "section-content",
  "def-accordion-sections",
  "def-wrapper",
  "wordclick",
  "left-content",
  "col-xl-12",
  "row",
  "entry-header",
  "page-content",
  "well",
  "content-body",
  "mw_t_bc",
  "sb-0",
  "sb-1",
  "sb-2",
  "sb-3",
  "no-sn",
  "has-sn",
  "has-num",
  "has-let",
  "has-subnum",
  "letter-only",
  "first-child",
  "firstVd",
  "mdash",
];

export const SEMANTIC_CONTAINERS: readonly string[] = [
  "mean",
  "dro",
  "drp",
  "vg",
  "vd",
  "sb",
  "sense",
  "sen",
  "pseq",
  "dt",
  "un",
  "uns",
  "related-to",
  "syn",
  "synonym-discussion",
  "illustrations",
  "table-section",
  "etymology",
  "prs",
  "prt-a",
  "vg-ins",
  "headword-row",
  "ex-sent-group",
];

export const KNOWN_TAGS: readonly string[] = [
  "mean",
  "mwu",
  "h1",
  "h2",
  "p",
  "div",
  "span",
  "sup",
  "em",
  "strong",
  "b",
  "a",
  "br",
  "img",
  "ul",
  "ol",
  "li",
  "link",
  "script",
];

// Derived from the unit rows: every unit with Ignore=true. The inspector
// reports these as notNeeded.
export const IGNORED_UNITS: readonly string[] = CATALOG_UNITS.filter(
  (unit: CatalogUnit): boolean => unit.ignore,
).map((unit: CatalogUnit): string => unit.unit);
