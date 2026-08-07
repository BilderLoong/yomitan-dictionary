import Database from "bun:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

export interface SgramEvidence {
  text: string;
  ownerClass: string;
  sourceMarker: string;
}

export interface SeeInAdditionEvidence {
  text: string;
  ownerClass: string;
  insideSynonymDiscussion: boolean;
}

export interface SuperscriptEvidence {
  text: string;
  ownerClass: string;
}

export interface LineBreakEvidence {
  kind: "br" | "breakpoint" | "breakpoints";
  text: string;
  ownerClass: string;
}

export interface PhraseAlternativeEvidence {
  kind: "defined-phrase" | "phrase-alternative";
  text: string;
  term: string;
  qualifier?: string;
  ownerClass: string;
}

export interface HtmlEvidence {
  classCounts: Record<string, number>;
  sgram: SgramEvidence[];
  seeInAddition: SeeInAdditionEvidence[];
  superscripts: SuperscriptEvidence[];
  lineBreakMarkers: LineBreakEvidence[];
  phraseAlternatives: PhraseAlternativeEvidence[];
}

export interface WordHtmlEvidence extends HtmlEvidence {
  id: number;
  lookup: string;
  sourceKey: string;
  htmlLength: number;
}

export type FindingSection = "interesting" | "not-needed" | "not-yet-noticed";

export interface SurveyFinding {
  word: string;
  informationName: string;
  unitLevel: string;
  boundTo: string;
  sourceSelectorOrTag: string;
  ownerPath: string;
  parserStatus: "recognized" | "partially-recognized" | "unrecognized";
  findingSection: FindingSection;
  notes: string;
}

export interface ClassInventoryItem {
  name: string;
  rowCount: number;
  sampleLookupWords: string[];
}

export interface SurveyReport {
  scanMode: "selected" | "all-candidate-rows";
  selectedLookups: string[];
  rows: WordHtmlEvidence[];
  inventories: {
    sgram: Inventory;
    seeInAddition: Inventory;
    superscripts: Inventory;
    lineBreakMarkers: Inventory;
    phraseAlternatives: Inventory;
    classNames: ClassInventoryItem[];
  };
  seeInAdditionOwnership: {
    insideSynonymDiscussion: Inventory;
    outsideSynonymDiscussion: Inventory;
  };
  findings: {
    interesting: SurveyFinding[];
    notNeeded: SurveyFinding[];
    notYetNoticed: SurveyFinding[];
  };
}

interface WordRow {
  id: number;
  w: string;
  m: string;
}

interface Inventory {
  rowCount: number;
  lookupWords: string[];
  values: string[];
  samples: Array<{
    id: number;
    lookup: string;
    sourceKey: string;
    values: string[];
  }>;
}

const sourceDatabasePath = path.resolve(
  import.meta.dirname,
  "../assets/MWU.db",
);
const defaultLookups = [
  "what",
  "turn",
  "take",
  "run",
  "process",
  "have",
  "set",
  "hand",
  "give",
  "in",
  "o",
];

const cleanText = (value: string): string => value.replace(/\s+/g, " ").trim();

const directChildText = (
  $: cheerio.CheerioAPI,
  element: cheerio.Element,
): string =>
  $(element)
    .contents()
    .toArray()
    .map((child) => $(child).text())
    .filter((text) => cleanText(text).length > 0)
    .map(cleanText)
    .join(" ");

const className = (element: cheerio.Element): string =>
  cleanText(element.attribs.class ?? "");

const closestClass = (
  $: cheerio.CheerioAPI,
  element: cheerio.Element,
  selector: string,
): string => {
  const owner = $(element).closest(selector).get(0);
  return owner === undefined ? "" : className(owner);
};

const senseMarker = (
  $: cheerio.CheerioAPI,
  element: cheerio.Element,
): string => {
  const marker = $(element).closest(".sense").find(".sn").first().text();
  return cleanText(marker);
};

const extractClassCounts = ($: cheerio.CheerioAPI): Record<string, number> =>
  Object.fromEntries(
    $("[class]")
      .toArray()
      .flatMap((element) => (element.attribs.class ?? "").split(/\s+/))
      .filter(Boolean)
      .reduce(
        (counts: Map<string, number>, name: string) =>
          counts.set(name, (counts.get(name) ?? 0) + 1),
        new Map<string, number>(),
      ),
  );

const extractClassNames = (html: string): string[] =>
  [...html.matchAll(/\bclass\s*=\s*(["'])(.*?)\1/gi)]
    .flatMap(([, , value]) => (value ?? "").split(/\s+/))
    .filter(Boolean);

const extractSgram = ($: cheerio.CheerioAPI): SgramEvidence[] =>
  $(".sgram")
    .toArray()
    .map((element) => ({
      text: cleanText($(element).text()),
      ownerClass: closestClass($, element, ".sense, .sen"),
      sourceMarker: senseMarker($, element),
    }));

const extractSeeInAddition = ($: cheerio.CheerioAPI): SeeInAdditionEvidence[] =>
  $(".see-in-addition")
    .toArray()
    .map((element) => ({
      text: cleanText($(element).text()),
      ownerClass: closestClass(
        $,
        element,
        ".synonym-discussion, .usage-notes, .usage, .sense, .mean",
      ),
      insideSynonymDiscussion:
        $(element).closest(".synonym-discussion").length > 0,
    }));

const extractSuperscripts = ($: cheerio.CheerioAPI): SuperscriptEvidence[] =>
  $("sup")
    .toArray()
    .map((element) => ({
      text: cleanText($(element).text()),
      ownerClass: closestClass($, element, "[class]"),
    }));

const extractLineBreakMarkers = ($: cheerio.CheerioAPI): LineBreakEvidence[] =>
  $("br, .breakpoint, .breakpoints")
    .toArray()
    .map((element) => {
      const classes = className(element).split(/\s+/);
      const kind =
        element.name === "br"
          ? "br"
          : classes.includes("breakpoints")
            ? "breakpoints"
            : "breakpoint";
      return {
        kind,
        text: cleanText($(element).text()),
        ownerClass: closestClass($, element, ".hword, .mean, .sense"),
      };
    });

const extractPhraseAlternatives = (
  $: cheerio.CheerioAPI,
): PhraseAlternativeEvidence[] =>
  $(".drp, .vr")
    .toArray()
    .flatMap((element) => {
      if ($(element).is(".drp")) {
        const term = directChildText($, element);
        return [
          {
            kind: "defined-phrase" as const,
            text: term,
            term,
            ownerClass: className(element),
          },
        ];
      }

      if (!$(element).prev().is(".drp")) return [];

      const term = cleanText($(element).find(".va").first().text());
      const qualifier = cleanText($(element).find(".vl").first().text());
      return [
        {
          kind: "phrase-alternative" as const,
          text: directChildText($, element),
          term,
          ...(qualifier.length > 0 ? { qualifier } : {}),
          ownerClass: className(element),
        },
      ];
    });

export const extractHtmlEvidence = (html: string): HtmlEvidence => {
  const $ = cheerio.load(html, {}, false);
  return {
    classCounts: extractClassCounts($),
    sgram: extractSgram($),
    seeInAddition: extractSeeInAddition($),
    superscripts: extractSuperscripts($),
    lineBreakMarkers: extractLineBreakMarkers($),
    phraseAlternatives: extractPhraseAlternatives($),
  };
};

const sourceKeyCandidates = (lookup: string): string[] => [
  lookup,
  encodeURIComponent(lookup),
  lookup.replaceAll(" ", "%20"),
];

const queryRows = (
  database: Database,
  selectedLookups: string[],
): WordRow[] => {
  const sourceKeys = selectedLookups.flatMap(sourceKeyCandidates);
  const placeholders = sourceKeys.map(() => "?").join(",");
  const rows = database
    .query<WordRow, string[]>(
      `SELECT id, w, m FROM word WHERE w IN (${placeholders}) ORDER BY id`,
    )
    .all(...sourceKeys);
  return rows;
};

const lookupForRow = (row: WordRow): string => decodeURIComponent(row.w);

const toWordEvidence = (row: WordRow): WordHtmlEvidence => ({
  id: row.id,
  lookup: lookupForRow(row),
  sourceKey: row.w,
  htmlLength: row.m.length,
  ...extractHtmlEvidence(row.m),
});

const uniqueSorted = (values: string[]): string[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const inventoryFor = (
  rows: WordHtmlEvidence[],
  select: (row: WordHtmlEvidence) => string[],
): Inventory => ({
  rowCount: rows.filter((row) => select(row).length > 0).length,
  lookupWords: uniqueSorted(
    rows.flatMap((row) => (select(row).length > 0 ? [row.lookup] : [])),
  ),
  values: uniqueSorted(rows.flatMap(select)),
  samples: rows
    .map((row) => ({
      id: row.id,
      lookup: row.lookup,
      sourceKey: row.sourceKey,
      values: uniqueSorted(select(row)),
    }))
    .filter(({ values }) => values.length > 0)
    .slice(0, 20),
});

const emptyInventory = (): Inventory => ({
  rowCount: 0,
  lookupWords: [],
  values: [],
  samples: [],
});

const addInventoryRow = (
  inventory: Inventory,
  row: WordRow,
  values: string[],
): Inventory => {
  const uniqueValues = uniqueSorted(values);
  if (uniqueValues.length === 0) return inventory;

  return {
    rowCount: inventory.rowCount + 1,
    lookupWords: [...inventory.lookupWords, lookupForRow(row)],
    values: [...inventory.values, ...uniqueValues],
    samples:
      inventory.samples.length >= 20
        ? inventory.samples
        : [
            ...inventory.samples,
            {
              id: row.id,
              lookup: lookupForRow(row),
              sourceKey: row.w,
              values: uniqueValues,
            },
          ],
  };
};

const finishInventory = (inventory: Inventory): Inventory => ({
  ...inventory,
  lookupWords: uniqueSorted(inventory.lookupWords),
  values: uniqueSorted(inventory.values),
});

interface FindingDefinition {
  className?: string;
  informationName: string;
  unitLevel: string;
  boundTo: string;
  selectorOrTag: string;
  section: FindingSection;
  parserStatus: SurveyFinding["parserStatus"];
  notes: string;
}

const findingDefinitions: readonly FindingDefinition[] = [
  {
    className: "sgram",
    informationName: "grammar-label",
    unitLevel: "Level 3-5",
    boundTo: "nearest sense or sense group",
    selectorOrTag: ".sgram",
    section: "interesting",
    parserStatus: "recognized",
    notes: "Keep the label scoped inline until its tag-bank scope is stable.",
  },
  {
    className: "see-in-addition",
    informationName: "see-in-addition",
    unitLevel: "Level 1 or Level 6",
    boundTo: "synonym discussion, usage-notes section, or local usage block",
    selectorOrTag: ".see-in-addition",
    section: "interesting",
    parserStatus: "recognized",
    notes:
      "The same line binds to Level 1 synonym discussion or to the nearest Level 6 usage owner.",
  },
  {
    className: "drp",
    informationName: "phrase",
    unitLevel: "Level 1 relation",
    boundTo: "parent lexical entry and independent phrase entry",
    selectorOrTag: ".drp",
    section: "interesting",
    parserStatus: "recognized",
    notes:
      "A definition-bearing phrase remains in the parent and gets its own searchable record.",
  },
  {
    className: "vr",
    informationName: "alternate-form",
    unitLevel: "nearest phrase or sense owner",
    boundTo: "the expression introduced by the local variant relation",
    selectorOrTag: ".vr/.va",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "Phrase-local alternatives use a dictionary-deinflection soft link with rule alternative.",
  },
  {
    className: "vd",
    informationName: "verb-subtype",
    unitLevel: "Level 1.5",
    boundTo: "the owning verb Level 1 entry",
    selectorOrTag: ".vd",
    section: "interesting",
    parserStatus: "recognized",
    notes:
      "Convert transitive/intransitive verb blocks to integer-indexed Level 1.5 groups.",
  },
  {
    className: "sls",
    informationName: "source-block-boundary",
    unitLevel: "nearest owning level",
    boundTo: "the following definition flow",
    selectorOrTag: ".sls",
    section: "interesting",
    parserStatus: "recognized",
    notes:
      "Block-scoped labels such as slang render on their own line; ordinary inline labels do not.",
  },
  {
    className: "lbs",
    informationName: "entry-qualifier",
    unitLevel: "Level 1",
    boundTo: "entry header",
    selectorOrTag: ".lbs/.lb",
    section: "interesting",
    parserStatus: "recognized",
    notes:
      "Keep header qualifiers such as often capitalized beside the entry metadata.",
  },
  {
    className: "cxl-ref",
    informationName: "variant-reference",
    unitLevel: "Level 1",
    boundTo: "the local mean headword",
    selectorOrTag: ".cxl-ref/.cxl/.cxt",
    section: "interesting",
    parserStatus: "recognized",
    notes:
      "This is a source relation such as variant spelling of oh; preserve the visible relation while discarding navigation targets.",
  },
  {
    className: "cxn",
    informationName: "cross-reference-number",
    unitLevel: "Level 1 relation",
    boundTo: "the local variant or taxonomy reference",
    selectorOrTag: ".cxl-ref/.cxn",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "A normal-text reference number such as taxonomic synonym of sipunculoidea 2 stays beside its visible relation; it is not a new sense number.",
  },
  {
    className: "catref",
    informationName: "called-also-reference",
    unitLevel: "Level 6",
    boundTo: "the called-also item that precedes it",
    selectorOrTag: ".ca/.cat/.catref",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "A reference such as conk:3 qualifies one called-also term; keep it beside that term rather than moving it to the parent definition.",
  },
  {
    className: "dxnls",
    informationName: "see-also-reference",
    unitLevel: "Level 1 relation",
    boundTo: "the local lexical entry outside its definition list",
    selectorOrTag: ".dxnls/.mw_t_dxt",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "A line such as see also arcadian 2 is entry-level related information and keeps its visible reference number.",
  },
  {
    className: "urefs",
    informationName: "usage-discussion-reference",
    unitLevel: "nearest owning definition",
    boundTo: "the definition containing the usage reference",
    selectorOrTag: ".urefs/.ur",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "Keep the visible See Usage Discussion at ... line at its local definition; its dedicated related-section rendering is deferred.",
  },
  {
    className: "uns",
    informationName: "usage-note",
    unitLevel: "Level 6",
    boundTo: "nearest definition",
    selectorOrTag: ".uns/.un",
    section: "interesting",
    parserStatus: "recognized",
    notes: "Preserve nested usage notes and their local examples.",
  },
  {
    className: "ex-sent-group",
    informationName: "example-sentence",
    unitLevel: "Level 6",
    boundTo: "nearest definition, usage note, phrase, or related section",
    selectorOrTag: ".ex-sent-group",
    section: "interesting",
    parserStatus: "recognized",
    notes: "Show one example by default and collapse the remaining examples.",
  },
  {
    className: "mw_t_wi",
    informationName: "target-highlight",
    unitLevel: "Level 6",
    boundTo: "owning example sentence",
    selectorOrTag: ".mw_t_wi",
    section: "interesting",
    parserStatus: "recognized",
    notes:
      "Retain the target span for visual highlighting and interposed-object evidence.",
  },
  {
    className: "mw_t_phrase",
    informationName: "example-phrase",
    unitLevel: "Level 6",
    boundTo: "the owning example sentence",
    selectorOrTag: ".mw_t_phrase",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "A phrase inside an example, such as in abundance, remains inside the example; it is not a new dictionary entry.",
  },
  {
    className: "mw_t_gloss",
    informationName: "example-gloss",
    unitLevel: "Level 6",
    boundTo: "the immediately preceding example phrase",
    selectorOrTag: ".mw_t_gloss",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "Bracketed explanatory text such as [=where many good restaurants can be found] is an example gloss and should remain below its example phrase.",
  },
  {
    className: "psl",
    informationName: "example-label",
    unitLevel: "Level 6",
    boundTo: "the example sentence containing the label",
    selectorOrTag: ".psl",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "Labels such as figurative or US inside an example are local example metadata, not entry-wide tags.",
  },
  {
    className: "ri",
    informationName: "related-inline-item",
    unitLevel: "Level 6",
    boundTo: "the definition containing the related item",
    selectorOrTag: ".ri/.riw/.rie",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "Nested related-item markup such as Aberdeen City stays in the definition text; the wrapper classes do not create another entry.",
  },
  {
    className: "subsource",
    informationName: "example-subsource",
    unitLevel: "Level 6",
    boundTo: "the example attribution containing it",
    selectorOrTag: ".subsource/.source/.aqdate",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "A nested citation such as quoted in The Ultimate Baseball Book, 1984 remains part of the example attribution.",
  },
  {
    className: "utxt",
    informationName: "usage-text-block",
    unitLevel: "Level 6",
    boundTo: "the usage-notes or run-on owner containing it",
    selectorOrTag: ".utxt",
    section: "interesting",
    parserStatus: "partially-recognized",
    notes:
      "A usage text block can contain several examples and local highlighted targets; preserve it as one owner subtree until its exact run-on variants are implemented.",
  },
  {
    className: "entry-status",
    informationName: "entry-status-image",
    unitLevel: "Level 1 presentation",
    boundTo: "entry header",
    selectorOrTag: ".entry-status",
    section: "not-needed",
    parserStatus: "recognized",
    notes:
      "Status artwork is not dictionary meaning and is excluded from the design ZIP.",
  },
  {
    className: "play-pron",
    informationName: "pronunciation-audio",
    unitLevel: "Level 1 presentation",
    boundTo: "pronunciation owner",
    selectorOrTag: ".play-pron/.hw-play-pron",
    section: "not-needed",
    parserStatus: "recognized",
    notes:
      "Audio extraction is a later phase and audio files are not included here.",
  },
];

const knownClassNames = new Set([
  "a",
  "aq",
  "aqdate",
  "audio-icon",
  "auth",
  "breakpoint",
  "breakpoints",
  "addPunct",
  "ca",
  "cat",
  "col",
  "col-12",
  "col-xl-12",
  "content-body",
  "custom-accordion",
  "def-accordion-sections",
  "def-wrapper",
  "definition-body",
  "dt",
  "dx-jump",
  "entry-attr",
  "entry-header",
  "entry-status",
  "et",
  "etymology",
  "ex-sent",
  "ex-sent-group",
  "first-child",
  "first-slash",
  "fl",
  "hword",
  "if",
  "il",
  "ix",
  "last-slash",
  "firstVd",
  "headword-row",
  "intro",
  "left-content",
  "letter",
  "lb",
  "mw",
  "mw_t_bc",
  "mw_t_d_link",
  "mw_t_dxt",
  "mw_t_it",
  "mw_t_mat",
  "mw_t_sc",
  "mw_t_sp",
  "mw_t_sx",
  "mw_t_wi",
  "num",
  "page-content",
  "pr",
  "play-pron",
  "pseq",
  "prs",
  "prt-a",
  "row",
  "sa-link",
  "sb",
  "sb-0",
  "sb-1",
  "sb-2",
  "sb-3",
  "sb-4",
  "sd",
  "sdsense",
  "section",
  "sense",
  "sents",
  "sents-block",
  "sents-inline",
  "sep-semicolon",
  "sl",
  "sls",
  "sn",
  "source",
  "sr",
  "srefs",
  "sen",
  "sub-num",
  "sub-well",
  "syn",
  "synonym-discussion",
  "syns_discussion",
  "t",
  "text",
  "text-lowercase",
  "text-uppercase",
  "toggle",
  "toggle-icon",
  "un",
  "unText",
  "uns",
  "usage",
  "usages",
  "usage-notes",
  "va",
  "vd",
  "vg",
  "vg-ins",
  "vi",
  "vis",
  "vl",
  "vr",
  "vrs",
  "well",
  "widget",
  "wordclick",
  "wordclick",
  "sgram",
  "see-in-addition",
  "drp",
  "dro",
  "related-to",
  "uro",
  "ure",
  "mw_t_et_link",
  "mw_t_wi",
  "has-aq",
  "has-num",
  "has-num-only",
  "has-let",
  "has-sn",
  "has-subnum",
  "no-aq",
  "no-sn",
  "no-subnum",
  "noSemicolon",
  "sense-a",
  "sense-b",
  "sense-c",
  "sense-d",
  "sense-e",
  "sense-1",
  "sense-2",
  "sense-3",
  "sense-4",
  "sense-5",
  "sense-6",
  "sense-7",
  "sense-8",
  "sense-9",
  "sense-10",
  "sense-11",
  "sense-12",
  "sense-13",
  "sense-14",
  "sense-15",
  "sense-16",
  "sense-17",
  "sense-18",
  "sense-19",
  "sense-20",
  "sense-21",
  "sense-22",
  "sense-23",
  "sense-24",
  "sense-25",
  "sense-26",
  "sense-27",
  "sense-28",
  "sense-29",
  "sense-30",
  "sense-31",
  "sense-32",
  "sense-33",
  "sense-34",
  "sense-35",
  "sense-36",
  "sense-37",
  "sense-38",
  "sense-39",
  "sense-40",
  "sense-41",
  "sense-42",
  "sense-43",
  "sense-44",
  "sense-45",
  "sense-46",
  "sense-47",
  "sense-48",
  "sense-49",
  "sense-50",
  "sense-(1)",
  "sense-(2)",
  "sense-(3)",
  "(1)",
  "mw_t_d_link",
  "section-content",
  "search-toolbar",
  "tabs",
  "selected",
  "unselected",
  "plural",
  "spl",
  "pseq",
  "sa-link",
  "snote",
  "note-txt",
  "mdash",
  "vis",
  "cxt",
  "cxl",
  "cxl-ref",
  "lbs",
  "urefs",
  "ur",
  "sc",
  "t-colon",
  "pun",
  "syns-module-anchor",
  "also-found-in",
  "hasSdSense",
  "hw-play-pron",
  "cxt",
  "cxl",
  "ure",
  "urefs",
  "intro",
  "addPunct",
  "dialectal",
  "substandard",
  "chiefly",
  "archaic",
  "nonstandard",
  "British",
  "Scottish",
  "but",
  "construction",
  "in",
  "or",
  "also",
  "participle",
  "past",
  "present",
  "singular",
  "1st",
  "2d",
  "3d",
  "with",
  "(with",
  "{ldquo}thou{rdquo}",
  "{ldquo}thou{rdquo})",
  "catref",
  "cxn",
  "dxnls",
  "mw_t_phrase",
  "mw_t_gloss",
  "psl",
  "ri",
  "rie",
  "riw",
  "subsource",
  "utxt",
  "ua-link",
  "ucat",
  "virs",
  "no-hyphen",
  "letter-only",
  "parenthesis",
  "MW_T_IT",
  "ambages",
  "adjectival",
  "all",
  "and",
  "bid",
  "bided",
  "commonly",
  "comparative",
  "dialect",
  "dialectal,",
  "especially",
  "except",
  "flexion",
  "form",
  "hoses",
  "intransitive",
  "less",
  "noun",
  "now",
  "numbered",
  "obsolete",
  "often",
  "ot",
  "person",
  "persons",
  "plural,",
  "second",
  "see",
  "senses",
  "sing",
  "singular,",
  "sometimes",
  "subjunctive",
  "superlative",
  "tense",
  "third",
  "transitive",
  "use",
  "usually",
  "verb",
  "vt",
  "US",
  "Midland",
  "South",
  "&amp;",
  "(see",
  "{ldquo}you{rdquo})",
]);

const isKnownClassName = (name: string): boolean =>
  knownClassNames.has(name) ||
  /^\d/.test(name) ||
  name.startsWith("(") ||
  name.startsWith("{") ||
  name.startsWith("&") ||
  /^sb-\d+$/.test(name) ||
  /^sense-[a-z]$/.test(name) ||
  /^sense-[a-z]\(.+\)$/.test(name) ||
  /^sense-\(\d+\)$/.test(name) ||
  /^sense-\d+$/.test(name);

const findingForDefinition = (
  row: WordHtmlEvidence,
  definition: FindingDefinition,
  observedCount: number,
): SurveyFinding => ({
  word: row.lookup,
  informationName: definition.informationName,
  unitLevel: definition.unitLevel,
  boundTo: definition.boundTo,
  sourceSelectorOrTag: definition.selectorOrTag,
  ownerPath: `.${definition.className} (${observedCount} observed node${observedCount === 1 ? "" : "s"})`,
  parserStatus: definition.parserStatus,
  findingSection: definition.section,
  notes: definition.notes,
});

const findingForClassInventory = (
  item: ClassInventoryItem,
  definition: FindingDefinition,
): SurveyFinding => ({
  word: item.sampleLookupWords[0] ?? "<all candidate rows>",
  informationName: definition.informationName,
  unitLevel: definition.unitLevel,
  boundTo: definition.boundTo,
  sourceSelectorOrTag: definition.selectorOrTag,
  ownerPath: `.${item.name} (${item.rowCount} source rows; samples: ${item.sampleLookupWords.join(", ") || "none"})`,
  parserStatus: definition.parserStatus,
  findingSection: definition.section,
  notes: definition.notes,
});

const findingForUnknownClass = (item: ClassInventoryItem): SurveyFinding => ({
  word: item.sampleLookupWords[0] ?? "<all candidate rows>",
  informationName: "unrecognized-html-class",
  unitLevel: "unknown",
  boundTo: "unknown; inspect the nearest semantic container",
  sourceSelectorOrTag: `.${item.name}`,
  ownerPath: `class inventory (${item.rowCount} source rows)`,
  parserStatus: "unrecognized",
  findingSection: "not-yet-noticed",
  notes: `Samples: ${item.sampleLookupWords.join(", ") || "none"}. This may be presentation-only or a new information unit; inspect before parser implementation.`,
});

const findingForBroadInventory = (
  inventory: Inventory,
  informationName: string,
  unitLevel: string,
  boundTo: string,
  sourceSelectorOrTag: string,
  notes: string,
): SurveyFinding => ({
  word: inventory.lookupWords[0] ?? "<all candidate rows>",
  informationName,
  unitLevel,
  boundTo,
  sourceSelectorOrTag,
  ownerPath: `${inventory.rowCount} source rows; samples: ${inventory.lookupWords.slice(0, 8).join(", ") || "none"}`,
  parserStatus: "partially-recognized",
  findingSection: "interesting",
  notes,
});

export const buildBroadSurveyFindings = (
  classNames: readonly ClassInventoryItem[],
  markerInventories: Pick<
    SurveyReport["inventories"],
    "superscripts" | "lineBreakMarkers"
  > = {
    superscripts: emptyInventory(),
    lineBreakMarkers: emptyInventory(),
  },
): SurveyReport["findings"] => {
  const definitionsByClassName = new Map(
    findingDefinitions
      .filter(({ className }) => className !== undefined)
      .map((definition) => [definition.className as string, definition]),
  );
  const findings = classNames
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((item) => {
      const definition = definitionsByClassName.get(item.name);
      if (definition !== undefined)
        return [findingForClassInventory(item, definition)];
      return isKnownClassName(item.name) ? [] : [findingForUnknownClass(item)];
    });
  const markerFindings = [
    ...(markerInventories.superscripts.rowCount > 0
      ? [
          findingForBroadInventory(
            markerInventories.superscripts,
            "superscript",
            "nearest owning level",
            "headword, sense marker, or cross-reference",
            "<sup>",
            "Homograph numbers and cross-reference numbers are separate units; preserve both visibly.",
          ),
        ]
      : []),
    ...(markerInventories.lineBreakMarkers.rowCount > 0
      ? [
          findingForBroadInventory(
            markerInventories.lineBreakMarkers,
            "source-block-boundary",
            "nearest owning level",
            "responsive text chunk or sibling definition block",
            "<br>/.breakpoint/.breakpoints",
            "Only source block boundaries that carry semantic layout should become visible line breaks.",
          ),
        ]
      : []),
  ];

  return {
    interesting: [
      ...findings.filter(
        ({ findingSection }) => findingSection === "interesting",
      ),
      ...markerFindings,
    ],
    notNeeded: findings.filter(
      ({ findingSection }) => findingSection === "not-needed",
    ),
    notYetNoticed: findings.filter(
      ({ findingSection }) => findingSection === "not-yet-noticed",
    ),
  };
};

export const buildSurveyFindings = (
  rows: readonly WordHtmlEvidence[],
): SurveyReport["findings"] => {
  const findings = rows.flatMap((row) => {
    const known = findingDefinitions.flatMap((definition) => {
      const observedCount =
        definition.className === undefined
          ? 0
          : (row.classCounts[definition.className] ?? 0);
      return observedCount > 0
        ? [findingForDefinition(row, definition, observedCount)]
        : [];
    });

    const special = [
      ...(row.superscripts.length > 0
        ? [
            {
              word: row.lookup,
              informationName: "superscript",
              unitLevel: "nearest owning level",
              boundTo: "headword, sense marker, or cross-reference",
              sourceSelectorOrTag: "<sup>",
              ownerPath: `${row.superscripts.length} observed node${row.superscripts.length === 1 ? "" : "s"}`,
              parserStatus: "partially-recognized" as const,
              findingSection: "interesting" as const,
              notes:
                "Homograph numbers and cross-reference numbers are separate units; preserve both visibly.",
            },
          ]
        : []),
      ...(row.lineBreakMarkers.length > 0
        ? [
            {
              word: row.lookup,
              informationName: "source-block-boundary",
              unitLevel: "nearest owning level",
              boundTo: "responsive text chunk or sibling definition block",
              sourceSelectorOrTag: "<br>/.breakpoint/.breakpoints",
              ownerPath: `${row.lineBreakMarkers.length} observed marker${row.lineBreakMarkers.length === 1 ? "" : "s"}`,
              parserStatus: "partially-recognized" as const,
              findingSection: "interesting" as const,
              notes:
                "Only source block boundaries that carry semantic layout should become visible line breaks.",
            },
          ]
        : []),
    ];

    const unknownClasses = Object.keys(row.classCounts)
      .filter((name) => !isKnownClassName(name))
      .sort();
    const unknown =
      unknownClasses.length === 0
        ? []
        : [
            {
              word: row.lookup,
              informationName: "unrecognized-html-class",
              unitLevel: "unknown",
              boundTo: "unknown; inspect the nearest semantic container",
              sourceSelectorOrTag: unknownClasses
                .map((name) => `.${name}`)
                .join(", "),
              ownerPath: "class inventory; source DOM path not yet recorded",
              parserStatus: "unrecognized" as const,
              findingSection: "not-yet-noticed" as const,
              notes:
                "This may be presentation-only or a new information unit; inspect before parser implementation.",
            },
          ];

    return [...known, ...special, ...unknown];
  });

  return {
    interesting: findings.filter(
      ({ findingSection }) => findingSection === "interesting",
    ),
    notNeeded: findings.filter(
      ({ findingSection }) => findingSection === "not-needed",
    ),
    notYetNoticed: findings.filter(
      ({ findingSection }) => findingSection === "not-yet-noticed",
    ),
  };
};

const scanRowsForFeature = (
  database: Database,
  marker: string | string[],
  extract: (html: string) => string[],
): Inventory => {
  const markers = typeof marker === "string" ? [marker] : marker;
  const markerPredicates = markers.map(() => "instr(m, ?) > 0").join(" OR ");
  const rows = database
    .query<WordRow, string[]>(
      `SELECT id, w, m FROM word
       WHERE w NOT LIKE "collegiate_%"
         AND w NOT LIKE "medical_%"
         AND w NOT LIKE "thesaurus_%"
         AND (${markerPredicates})
       ORDER BY id`,
    )
    .iterate(...markers);

  let inventory = emptyInventory();
  for (const row of rows) {
    inventory = addInventoryRow(inventory, row, extract(row.m));
  }
  return finishInventory(inventory);
};

const stripTags = (value: string): string =>
  cleanText(value.replace(/<[^>]+>/g, " "));

const extractSuperscriptTexts = (html: string): string[] =>
  [...html.matchAll(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi)].map((match) =>
    stripTags(match[1] ?? ""),
  );

const extractLineBreakKinds = (html: string): string[] =>
  [...html.matchAll(/<br\b[^>]*>/gi)]
    .map(() => "br")
    .concat(
      [
        ...html.matchAll(/class\s*=\s*["'][^"']*\bbreakpoint\b[^"']*["']/gi),
      ].map(() => "breakpoint"),
      [
        ...html.matchAll(/class\s*=\s*["'][^"']*\bbreakpoints\b[^"']*["']/gi),
      ].map(() => "breakpoints"),
    );

const classInventoryForRows = (
  rows: readonly WordHtmlEvidence[],
): ClassInventoryItem[] => {
  const items = new Map<string, ClassInventoryItem>();
  rows.forEach((row) => {
    Object.keys(row.classCounts)
      .sort()
      .forEach((name) => {
        const current = items.get(name);
        items.set(
          name,
          current === undefined
            ? { name, rowCount: 1, sampleLookupWords: [row.lookup] }
            : {
                ...current,
                rowCount: current.rowCount + 1,
                sampleLookupWords:
                  current.sampleLookupWords.length >= 8
                    ? current.sampleLookupWords
                    : [...current.sampleLookupWords, row.lookup],
              },
        );
      });
  });
  return [...items.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};

const scanAllClassNames = (database: Database): ClassInventoryItem[] => {
  const rows = database
    .query<WordRow, []>(
      `SELECT id, w, m FROM word
       WHERE w NOT LIKE "collegiate_%"
         AND w NOT LIKE "medical_%"
         AND w NOT LIKE "thesaurus_%"
       ORDER BY id`,
    )
    .iterate();
  const items = new Map<string, ClassInventoryItem>();
  for (const row of rows) {
    uniqueSorted(extractClassNames(row.m)).forEach((name) => {
      const current = items.get(name);
      items.set(
        name,
        current === undefined
          ? { name, rowCount: 1, sampleLookupWords: [lookupForRow(row)] }
          : {
              ...current,
              rowCount: current.rowCount + 1,
              sampleLookupWords:
                current.sampleLookupWords.length >= 8
                  ? current.sampleLookupWords
                  : [...current.sampleLookupWords, lookupForRow(row)],
            },
      );
    });
  }
  return [...items.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};

const scanAllInventories = (
  database: Database,
): SurveyReport["inventories"] => ({
  sgram: scanRowsForFeature(database, "sgram", (html) =>
    extractHtmlEvidence(html).sgram.map(({ text }) => text),
  ),
  seeInAddition: scanRowsForFeature(database, "see-in-addition", (html) =>
    extractHtmlEvidence(html).seeInAddition.map(({ text }) => text),
  ),
  superscripts: scanRowsForFeature(database, "<sup", extractSuperscriptTexts),
  lineBreakMarkers: scanRowsForFeature(
    database,
    ["breakpoint", "<br"],
    extractLineBreakKinds,
  ),
  phraseAlternatives: scanRowsForFeature(database, 'class="drp"', (html) =>
    extractHtmlEvidence(html).phraseAlternatives.map(({ text }) => text),
  ),
  classNames: scanAllClassNames(database),
});

const seeInAdditionOwnershipForRows = (
  rows: WordHtmlEvidence[],
): SurveyReport["seeInAdditionOwnership"] => ({
  insideSynonymDiscussion: inventoryFor(rows, (row) =>
    row.seeInAddition
      .filter(({ insideSynonymDiscussion }) => insideSynonymDiscussion)
      .map(({ text }) => text),
  ),
  outsideSynonymDiscussion: inventoryFor(rows, (row) =>
    row.seeInAddition
      .filter(({ insideSynonymDiscussion }) => !insideSynonymDiscussion)
      .map(({ text }) => text),
  ),
});

const scanAllSeeInAdditionOwnership = (
  database: Database,
): SurveyReport["seeInAdditionOwnership"] => ({
  insideSynonymDiscussion: scanRowsForFeature(
    database,
    "see-in-addition",
    (html) =>
      extractHtmlEvidence(html)
        .seeInAddition.filter(
          ({ insideSynonymDiscussion }) => insideSynonymDiscussion,
        )
        .map(({ text }) => text),
  ),
  outsideSynonymDiscussion: scanRowsForFeature(
    database,
    "see-in-addition",
    (html) =>
      extractHtmlEvidence(html)
        .seeInAddition.filter(
          ({ insideSynonymDiscussion }) => !insideSynonymDiscussion,
        )
        .map(({ text }) => text),
  ),
});

export const buildSurveyReport = (
  database: Database,
  selectedLookups: string[],
  scanAllCandidateRows = false,
): SurveyReport => {
  const rows = queryRows(database, selectedLookups).map(toWordEvidence);
  const allCandidateInventories = scanAllCandidateRows
    ? scanAllInventories(database)
    : null;
  return {
    scanMode: scanAllCandidateRows ? "all-candidate-rows" : "selected",
    selectedLookups,
    rows,
    inventories: allCandidateInventories ?? {
      sgram: inventoryFor(rows, (row) => row.sgram.map(({ text }) => text)),
      seeInAddition: inventoryFor(rows, (row) =>
        row.seeInAddition.map(({ text }) => text),
      ),
      superscripts: inventoryFor(rows, (row) =>
        row.superscripts.map(({ text }) => text),
      ),
      lineBreakMarkers: inventoryFor(rows, (row) =>
        row.lineBreakMarkers.map(({ kind }) => kind),
      ),
      phraseAlternatives: inventoryFor(rows, (row) =>
        row.phraseAlternatives.map(({ text }) => text),
      ),
      classNames: classInventoryForRows(rows),
    },
    seeInAdditionOwnership:
      allCandidateInventories === null
        ? seeInAdditionOwnershipForRows(rows)
        : scanAllSeeInAdditionOwnership(database),
    findings:
      allCandidateInventories === null
        ? buildSurveyFindings(rows)
        : buildBroadSurveyFindings(allCandidateInventories.classNames, {
            superscripts: allCandidateInventories.superscripts,
            lineBreakMarkers: allCandidateInventories.lineBreakMarkers,
          }),
  };
};

const parseArguments = (
  args: string[],
): {
  scanAllCandidateRows: boolean;
  lookups: string[];
  outputPath: string;
} => {
  const scanAllCandidateRows = args.includes("--all");
  const outputIndex = args.indexOf("--output");
  const outputPath =
    outputIndex >= 0
      ? args[outputIndex + 1]
      : path.resolve(
          import.meta.dirname,
          "../build/design-what/mwu-html-evidence.json",
        );
  const lookups = args
    .filter(
      (argument, index) =>
        argument !== "--output" &&
        argument !== "--all" &&
        index !== outputIndex + 1,
    )
    .filter((argument) => !argument.startsWith("--"));
  return {
    scanAllCandidateRows,
    lookups: lookups.length > 0 ? lookups : defaultLookups,
    outputPath,
  };
};

const main = async (): Promise<void> => {
  const { scanAllCandidateRows, lookups, outputPath } = parseArguments(
    Bun.argv.slice(2),
  );
  const database = new Database(sourceDatabasePath, { readonly: true });
  const report = buildSurveyReport(database, lookups, scanAllCandidateRows);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
};

if (import.meta.main) {
  await main();
}
