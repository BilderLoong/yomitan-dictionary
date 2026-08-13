import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type {
  StructuredContent,
  StructuredContentData,
} from "yomichan-dict-builder/dist/types/yomitan/termbank";

import type { CanonicalEntryPlan } from "../level1/types";
import type { Result } from "../shared/result";
import type {
  ConversionError,
  ConversionFinding,
  RenderedCanonicalContent,
} from "./types";

interface RenderResult {
  readonly nodes: readonly StructuredContent[];
  readonly findings: readonly ConversionFinding[];
  readonly visibleText: string;
}

interface MarkerSegment {
  readonly level: 3 | 4 | 5;
  readonly marker: string;
}

interface SenseObservation {
  readonly markers: readonly MarkerSegment[];
  readonly content: readonly StructuredContent[];
  readonly findings: readonly ConversionFinding[];
}

interface SenseRecord {
  readonly markerPath: readonly MarkerSegment[];
  readonly content: readonly StructuredContent[];
  readonly findings: readonly ConversionFinding[];
}

interface NodeOptions {
  readonly data?: StructuredContentData;
  readonly title?: string;
  readonly open?: boolean;
}

interface DataOptions {
  readonly level?: number;
  readonly sourceMarker?: string;
  readonly unit?: string;
  readonly relation?: string;
  readonly category?: string;
  readonly sourceUnit?: string;
}

interface InlineOptions {
  readonly stripLeadingArrow?: boolean;
  readonly skipClasses?: readonly string[];
  readonly plainLinks?: boolean;
}

const knownTags = [
  "a",
  "b",
  "br",
  "cxl-ref",
  "div",
  "dl",
  "dt",
  "em",
  "h1",
  "h2",
  "i",
  "li",
  "mean",
  "ol",
  "p",
  "page-content",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "tr",
  "ul",
  "un",
  "uns",
  "dx-jump",
  "dro",
] as const;

const ignoredClasses = [
  "addPunct",
  "audio-icon",
  "entry-status",
  "first-slash",
  "last-slash",
  "play-pron",
  "search-toolbar",
  "sound",
  "toggle-icon",
] as const;

const blockTags = [
  "div",
  "dl",
  "dt",
  "h1",
  "h2",
  "li",
  "ol",
  "p",
  "table",
  "tbody",
  "td",
  "tr",
  "ul",
] as const;

const unitData = (
  content: string,
  options: DataOptions = {},
): StructuredContentData => ({
  content,
  ...(options.level === undefined ? {} : { level: String(options.level) }),
  ...(options.sourceMarker === undefined
    ? {}
    : { sourceMarker: options.sourceMarker }),
  ...(options.unit === undefined ? {} : { unit: options.unit }),
  ...(options.relation === undefined ? {} : { relation: options.relation }),
  ...(options.category === undefined ? {} : { category: options.category }),
  ...(options.sourceUnit === undefined
    ? {}
    : { sourceUnit: options.sourceUnit }),
});

const container = (
  tag: "span" | "div" | "ol" | "ul" | "li" | "details" | "summary",
  content: StructuredContent | readonly StructuredContent[],
  options: NodeOptions = {},
): StructuredContent => {
  const normalizedContent: StructuredContent = Array.isArray(content)
    ? (content.slice() as StructuredContent)
    : (content as StructuredContent);
  return {
    tag,
    content: normalizedContent,
    ...(options.data === undefined ? {} : { data: options.data }),
    ...(options.title === undefined ? {} : { title: options.title }),
    ...(options.open === undefined ? {} : { open: options.open }),
  };
};

const emptyResult = (): RenderResult => ({
  nodes: [],
  findings: [],
  visibleText: "",
});

const normalizeWhitespace = (text: string): string =>
  text.replace(/\s+/gu, " ");

const normalizeBlockText = (text: string): string =>
  normalizeWhitespace(text).trim();

const nodeVisibleText = (node: StructuredContent): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(nodeVisibleText).join("");
  return "content" in node && node.content !== undefined
    ? nodeVisibleText(node.content)
    : "";
};

const renderResult = (
  nodes: readonly StructuredContent[],
  findings: readonly ConversionFinding[] = [],
): RenderResult => ({
  nodes,
  findings,
  visibleText: nodes.map(nodeVisibleText).join(""),
});

const combineResults = (results: readonly RenderResult[]): RenderResult =>
  renderResult(
    results.flatMap(
      ({ nodes }: RenderResult): readonly StructuredContent[] => nodes,
    ),
    results.flatMap(
      ({ findings }: RenderResult): readonly ConversionFinding[] => findings,
    ),
  );

const classNames = (
  root: cheerio.CheerioAPI,
  element: Element,
): readonly string[] =>
  (root(element).attr("class") ?? "")
    .split(/\s+/u)
    .map((name: string): string => name.trim())
    .filter((name: string): boolean => name.length > 0);

const hasClass = (
  root: cheerio.CheerioAPI,
  element: Element,
  className: string,
): boolean => classNames(root, element).includes(className);

const hasAnyClass = (
  root: cheerio.CheerioAPI,
  element: Element,
  classList: readonly string[],
): boolean =>
  classNames(root, element).some((name: string): boolean =>
    classList.includes(name),
  );

const sourcePosition = (path: readonly number[]): number =>
  path.reduce(
    (position: number, part: number): number => position * 1000 + part,
    0,
  );

const elementText = (root: cheerio.CheerioAPI, element: Element): string =>
  normalizeBlockText(root(element).text());

const textWithoutElements = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
  excludedTags: readonly string[],
): string => {
  if (node.type === "text") return node.data;
  if (node.type !== "tag") return "";
  if (excludedTags.includes(node.tagName)) return "";

  return root(node)
    .contents()
    .toArray()
    .map((child: AnyNode): string =>
      textWithoutElements(root, child, excludedTags),
    )
    .join("");
};

const isVisible = (text: string): boolean =>
  normalizeBlockText(text).length > 0;

const isKnownTag = (tagName: string): boolean =>
  knownTags.some((knownTag: string): boolean => knownTag === tagName);

const isBlockTag = (tagName: string): boolean =>
  blockTags.some((blockTag: string): boolean => blockTag === tagName);

const formatPronunciation = (raw: string): string => {
  const cleaned = normalizeBlockText(raw)
    .replace(/^[\\/]+|[\\/]+$/gu, "")
    .replaceAll("\u200b", "")
    .replaceAll("¦", "ˈ");
  return cleaned.length === 0 ? "" : `/${cleaned}/`;
};

const formatFormPronunciation = (raw: string): string => {
  const cleaned = normalizeBlockText(raw)
    .replace(/^[\\/]+|[\\/]+$/gu, "")
    .replaceAll("\u200b", "")
    .replaceAll("¦", "ˈ");
  return cleaned.length === 0 ? "" : `/${cleaned}/`;
};

const POS_SPECIAL: Readonly<Record<string, string>> = {
  "geographical name": "geo",
  "biographical name": "bio",
  "proper noun": "prop n",
  trademark: "trademark",
  "service mark": "trademark",
  "certification mark": "trademark",
  idiom: "phrase",
  "phrasal verb": "phrase",
  "idiomatic phrase": "phrase",
  contraction: "contraction",
  "auxiliary verb": "aux",
  "verbal auxiliary": "aux",
  "indefinite article": "art",
  "definite article": "art",
  article: "art",
  affix: "affix",
  "past participle": "v",
  "honorific title": "title",
  "script annotation": "annotation",
  "pronunciation spelling": "pron spelling",
  "transitive verb": "v",
  "intransitive verb": "v",
  "imperative verb": "v",
  "impersonal verb": "v",
  "Latin verb": "v",
  "Greek verb": "v",
  "Italian and Spanish verb": "v",
  "intransitive + transitive verb": "v",
  "noun phrase": "phrase",
  "adverb phrase": "phrase",
  "Latin phrase": "phrase",
  "French phrase": "phrase",
  "Latin noun phrase": "phrase",
  "French noun phrase": "phrase",
  "Italian noun phrase": "phrase",
  "German noun phrase": "phrase",
  "Latin quotation from": "phrase",
  "French quotation from": "phrase",
  "French quotation attributed to": "phrase",
  "phrase transliterated from Arabic": "phrase",
  "communications code word": "abbr",
  "communications signal": "abbr",
  "communications code abbreviation": "abbr",
  "Latin abbreviation": "abbr",
  "noun suffix": "suffix",
  "noun combining form": "comb",
  "verb suffix": "suffix",
  "adjective suffix": "suffix",
  "adverb suffix": "suffix",
  "interjection suffix": "suffix",
  "plural noun suffix": "suffix",
  "noun plural suffix": "suffix",
  "verb suffix or adjective suffix": "suffix",
  "adjective suffix or adverb suffix": "suffix",
  "noun suffix or pronoun suffix": "suffix",
  "noun combining form or adjective combining form": "comb",
  "adjective combining form or noun combining form": "comb",
  "noun plural combining form": "comb",
  "verb combining form": "comb",
  "adverb combining form": "comb",
  "adjective combining form": "comb",
};

const POS_TOKEN: Readonly<Record<string, string>> = {
  noun: "n",
  adjective: "adj",
  verb: "v",
  adverb: "adv",
  pronoun: "pron",
  preposition: "prep",
  conjunction: "conj",
  interjection: "interj",
  abbreviation: "abbr",
  symbol: "symbol",
  prefix: "prefix",
  suffix: "suffix",
  "combining form": "comb",
  plural: "pl",
};

const definitionTag = (raw: string): string | null => {
  const normalized = normalizeBlockText(raw);
  if (normalized.length === 0) return null;
  const special = POS_SPECIAL[normalized];
  if (special !== undefined) return special;
  const token = POS_TOKEN[normalized];
  if (token !== undefined) return token;

  if (
    /^noun(?:,| plural)/u.test(normalized) &&
    /in construction/u.test(normalized)
  ) {
    return "n";
  }
  if (/^plural noun/u.test(normalized)) return "n pl";
  if (/^plural pronoun/u.test(normalized)) return "pron";

  const stripped = normalized
    .replace(/\(or [^)]+\)/gu, "")
    .replace(
      /\b(?:transitive|intransitive)\s*\+\s*(?:transitive|intransitive)\b/gu,
      "",
    )
    .replace(/,\s*$/u, "")
    .trim();
  const parts = stripped
    .split(/\s+or\s+/u)
    .map((part: string): string => part.trim());
  const mapped = parts.map(
    (part: string): string => POS_SPECIAL[part] ?? POS_TOKEN[part] ?? part,
  );
  return mapped.join(" or ");
};

const renderUnsupported = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const visibleText = elementText(root, element);
  if (!isVisible(visibleText)) return emptyResult();

  return renderResult(
    [container("div", visibleText)],
    [
      {
        kind: "unsupported-visible-subtree",
        rowId: plan.source.rowId,
        term: plan.term,
        tagName: element.tagName,
        classes: classNames(root, element),
        sourcePosition: sourcePosition(path),
        preview: root(element).toString().slice(0, 240),
      },
    ],
  );
};

const renderTextNode = (
  node: AnyNode,
  stripLeadingArrow: boolean,
): RenderResult => {
  if (node.type !== "text") return emptyResult();

  const text = normalizeWhitespace(
    stripLeadingArrow ? node.data.replace(/^\s*→\s*/u, "") : node.data,
  );
  return text.length === 0 ? emptyResult() : renderResult([text]);
};

/**
 * Confirmed reference anchors are the source-known cxl target class and the
 * cross-reference classes. A leading homograph <sup> direct child is target
 * identity metadata, not part of the visible label.
 */
const isReferenceAnchor = (
  root: cheerio.CheerioAPI,
  element: Element,
): boolean =>
  hasAnyClass(root, element, [
    "cxt",
    "mw_t_mat",
    "mw_t_et_link",
    "mw_t_sx",
    "mw_t_sc",
    "mw_t_dxt",
  ]);

const renderReferenceAnchorChildren = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  options: InlineOptions,
): RenderResult => {
  const contents = root(element).contents().toArray();
  const firstVisible = contents.findIndex(
    (node: AnyNode): boolean =>
      !(node.type === "text" && node.data.trim().length === 0),
  );
  const leadingHomographSup =
    firstVisible >= 0 &&
    contents[firstVisible].type === "tag" &&
    contents[firstVisible].tagName === "sup";
  return combineResults(
    contents.flatMap(
      (child: AnyNode, index: number): readonly RenderResult[] =>
        leadingHomographSup && index === firstVisible
          ? []
          : [renderInlineNode(root, child, [...path, index], plan, options)],
    ),
  );
};

const renderInlineNode = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  options: InlineOptions = {},
): RenderResult => {
  if (node.type === "text") {
    return renderTextNode(node, options.stripLeadingArrow ?? false);
  }
  if (node.type !== "tag") return emptyResult();

  const element = node;
  const classes = classNames(root, element);
  if (
    hasAnyClass(root, element, ignoredClasses) ||
    (options.skipClasses ?? []).some((className: string): boolean =>
      classes.includes(className),
    )
  ) {
    return emptyResult();
  }

  if (element.tagName === "br") return renderResult([{ tag: "br" }]);
  if (!isKnownTag(element.tagName)) {
    return renderUnsupported(root, element, path, plan);
  }

  if (hasClass(root, element, "vis")) {
    const groups = root(element)
      .find(".ex-sent-group")
      .toArray()
      .filter(
        (group: Element): boolean =>
          root(group).parents(".ex-sent-group").length === 0,
      );
    if (groups.length > 0) {
      return renderExampleGroups(root, groups, path, plan);
    }
  }
  if (hasClass(root, element, "ex-sent-group")) {
    return renderExampleGroup(root, element, path, plan);
  }
  if (hasClass(root, element, "vr")) {
    const parts = alternateFormParts(root, element);
    return parts.length === 0
      ? emptyResult()
      : renderResult([
          container("span", parts, {
            data: unitData("alternate-form", { level: 1 }),
          }),
        ]);
  }
  if (hasClass(root, element, "uns")) {
    return renderUsageNotes(root, element, path, plan);
  }
  if (hasClass(root, element, "sdsense")) {
    return renderScopedDefinition(root, element, path, plan);
  }
  if (hasClass(root, element, "ca")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("called-also", { level: 6 }),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "dx-jump")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("comparison-reference", { level: 6 }),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "cxl-ref")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    const relationSpan = root(element).find(".cxl").toArray()[0];
    const relation =
      relationSpan === undefined ? undefined : elementText(root, relationSpan);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("relation-reference", {
            level: 6,
            ...(relation === undefined ? {} : { relation }),
          }),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "see-in-addition")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [container("div", child.nodes, { data: unitData("see-in-addition") })],
      child.findings,
    );
  }
  if (hasClass(root, element, "urefs") || hasClass(root, element, "ur")) {
    return renderUsageDiscussionReference(root, element, path, plan);
  }
  if (hasClass(root, element, "mw_t_wi")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("target-highlight"),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "mw_t_it")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [container("span", child.nodes, { data: unitData("emphasis") })],
      child.findings,
    );
  }
  if (element.tagName === "em") {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [container("span", child.nodes, { data: unitData("emphasis") })],
      child.findings,
    );
  }
  if (hasClass(root, element, "sl")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("tag", {
            category: "usage",
            sourceUnit: "sense-label",
            level: 5,
          }),
          title: elementText(root, element),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "lb")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("tag", {
            category: "definition",
            sourceUnit: "definition-label",
            level: 5,
          }),
          title: elementText(root, element),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "spl")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("tag", {
            category: "grammar",
            sourceUnit: "grammar-label",
            level: 5,
          }),
          title: elementText(root, element),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "sls")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("div", child.nodes, {
          data: unitData("source-block-boundary", {
            level: 5,
            sourceUnit: "sls",
          }),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "sgram")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("grammar-label"),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "sd")) {
    return renderInlineChildren(root, element, path, plan, options);
  }
  if (hasClass(root, element, "source") || hasClass(root, element, "auth")) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("example-source-inline"),
        }),
      ],
      child.findings,
    );
  }
  if (element.tagName === "a") {
    const child = isReferenceAnchor(root, element)
      ? renderReferenceAnchorChildren(root, element, path, plan, options)
      : renderInlineChildren(root, element, path, plan, options);
    if (options.plainLinks === true) {
      return child;
    }
    const relation = hasClass(root, element, "mw_t_mat")
      ? "origin"
      : hasClass(root, element, "mw_t_et_link")
        ? "origin"
        : hasClass(root, element, "mw_t_sx")
          ? "see"
          : hasClass(root, element, "mw_t_sc")
            ? "related"
            : hasClass(root, element, "mw_t_dxt")
              ? "compare"
              : undefined;
    return renderResult(
      [
        container("span", child.nodes, {
          data:
            relation === undefined
              ? unitData("cross-reference")
              : unitData("cross-reference", { relation }),
        }),
      ],
      child.findings,
    );
  }
  if (
    hasClass(root, element, "text-lowercase") &&
    root(element).prev().is("a") &&
    /^\d[a-z]?(?:\(\d+\))?$/u.test(elementText(root, element))
  ) {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("superscript-reference", {
            sourceUnit: "text-lowercase",
          }),
        }),
      ],
      child.findings,
    );
  }
  if (element.tagName === "sup") {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("superscript-reference"),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "mw_t_bc")) {
    return renderInlineChildren(root, element, path, plan, options);
  }
  if (element.tagName === "strong" || element.tagName === "b") {
    const child = renderInlineChildren(root, element, path, plan, options);
    return renderResult(
      [container("span", child.nodes, { data: unitData("strong") })],
      child.findings,
    );
  }

  return renderInlineChildren(root, element, path, plan, options);
};

const renderInlineChildren = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  options: InlineOptions = {},
): RenderResult =>
  combineResults(
    root(element)
      .contents()
      .toArray()
      .map(
        (child: AnyNode, index: number): RenderResult =>
          renderInlineNode(root, child, [...path, index], plan, {
            ...options,
            stripLeadingArrow:
              options.stripLeadingArrow === true && index === 0,
          }),
      ),
  );

const renderUsageDiscussionReference = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const target = hasClass(root, element, "ur")
    ? element
    : root(element).find(".ur").first().get(0);
  if (target === undefined) return emptyResult();
  const content = renderInlineChildren(root, target, path, plan, {
    plainLinks: true,
  });
  return renderResult(
    [
      container(element.tagName === "span" ? "span" : "div", content.nodes, {
        data: unitData("usage-discussion-reference", {
          level: 6,
          relation: "usage-discussion",
          sourceUnit: "ur",
        }),
      }),
    ],
    content.findings,
  );
};

const renderFormPronunciation = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  level = 1,
): RenderResult => {
  const content = combineResults(
    root(element)
      .contents()
      .toArray()
      .map((node: AnyNode, index: number): RenderResult => {
        if (node.type === "text") return renderTextNode(node, false);
        if (node.type !== "tag") return emptyResult();
        if (
          hasClass(root, node, "first-slash") ||
          hasClass(root, node, "last-slash")
        ) {
          return emptyResult();
        }
        if (hasClass(root, node, "mw")) {
          const reading = formatFormPronunciation(elementText(root, node));
          return reading.length === 0
            ? emptyResult()
            : renderResult([
                container("span", reading, {
                  data: unitData("pronunciation-reading", {
                    level,
                    sourceUnit: "mw",
                  }),
                }),
              ]);
        }
        return renderInlineNode(root, node, [...path, index], plan);
      }),
  );
  return renderResult(
    [
      container("span", content.nodes, {
        data: unitData("form-pronunciation", { level }),
      }),
    ],
    content.findings,
  );
};

const renderAttribution = (
  root: cheerio.CheerioAPI,
  element: Element,
): StructuredContent | null => {
  const text = elementText(root, element);
  return isVisible(text)
    ? container("span", text, {
        data: unitData("example-source", { level: 6 }),
      })
    : null;
};

const nextExampleAttribution = (
  root: cheerio.CheerioAPI,
  sentence: Element,
): StructuredContent | null => {
  const parent = root(sentence).parent().get(0);
  if (parent === undefined) return null;
  const siblings = root(parent).contents().toArray();
  const sentenceIndex = siblings.indexOf(sentence);
  if (sentenceIndex < 0) return null;
  const nextMeaningful = siblings
    .slice(sentenceIndex + 1)
    .find(
      (node: AnyNode): boolean =>
        node.type !== "text" || node.data.trim().length > 0,
    );
  return nextMeaningful?.type === "tag" &&
    hasClass(root, nextMeaningful, "ex-sent") &&
    hasClass(root, nextMeaningful, "aq")
    ? renderAttribution(root, nextMeaningful)
    : null;
};

const renderExampleSentence = (
  root: cheerio.CheerioAPI,
  sentence: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  source: StructuredContent | null,
): RenderResult => {
  const content = renderInlineChildren(root, sentence, path, plan, {
    skipClasses: ["ex-sent"],
    stripLeadingArrow: true,
  });
  return renderResult(
    [
      container(
        "div",
        source === null ? content.nodes : [...content.nodes, source],
        {
          data: unitData("example-sentence", { level: 6 }),
        },
      ),
    ],
    content.findings,
  );
};

const collapseExampleResults = (
  examples: readonly RenderResult[],
): RenderResult => {
  const first = examples[0];
  if (first === undefined) return emptyResult();
  const remaining = examples.slice(1);
  const extra =
    remaining.length === 0
      ? []
      : [
          container(
            "details",
            [
              container(
                "summary",
                `${remaining.length} more ${remaining.length === 1 ? "example" : "examples"}`,
              ),
              ...remaining.flatMap(
                ({ nodes }: RenderResult): readonly StructuredContent[] =>
                  nodes,
              ),
            ],
            { data: unitData("extra-examples"), open: false },
          ),
        ];
  return renderResult(
    [...first.nodes, ...extra],
    [
      ...first.findings,
      ...remaining.flatMap(
        ({ findings }: RenderResult): readonly ConversionFinding[] => findings,
      ),
    ],
  );
};

const renderExampleGroups = (
  root: cheerio.CheerioAPI,
  groups: readonly Element[],
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const sentences = groups.flatMap((group: Element): Element[] =>
    root(group)
      .find(".ex-sent")
      .toArray()
      .filter((sentence: Element): boolean => !hasClass(root, sentence, "aq")),
  );

  const examples = sentences.map(
    (sentence: Element, index: number): RenderResult => {
      return renderExampleSentence(
        root,
        sentence,
        [...path, index],
        plan,
        nextExampleAttribution(root, sentence),
      );
    },
  );
  return collapseExampleResults(examples);
};

const renderExampleGroup = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => renderExampleGroups(root, [element], path, plan);

const isExampleGroup = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
): node is Element =>
  node.type === "tag" && hasClass(root, node, "ex-sent-group");

/**
 * Partitions sibling nodes into maximal homogeneous runs of consecutive
 * ex-sent-group elements. Sources emit a sense's example block either as a
 * single `.vis` wrapper or as several bare sibling `.ex-sent-group`s (e.g.
 * turn 1a); batching the siblings through collapseExampleResults makes both
 * shapes render as one inline example plus "N more examples".
 */
const partitionExampleRuns = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
): readonly (readonly AnyNode[])[] => {
  const runs: (readonly AnyNode[])[] = [];
  let current: AnyNode[] = [];
  let previousGroup = false;
  for (const node of nodes) {
    const isGroup = isExampleGroup(root, node);
    if (current.length > 0 && isGroup !== previousGroup) {
      runs.push(current);
      current = [];
    }
    current.push(node);
    previousGroup = isGroup;
  }
  if (current.length > 0) runs.push(current);
  return runs;
};

/**
 * Renders sibling nodes, collapsing each maximal run of consecutive
 * ex-sent-group elements into a single example block and dispatching every
 * other node through `dispatch`.
 */
const renderNodeRuns = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
  path: readonly number[],
  plan: CanonicalEntryPlan,
  dispatch: (node: AnyNode, index: number) => RenderResult,
): readonly RenderResult[] => {
  const results: RenderResult[] = [];
  for (const run of partitionExampleRuns(root, nodes)) {
    if (run.every((node: AnyNode): boolean => isExampleGroup(root, node))) {
      const groups = run.filter((node: AnyNode): node is Element =>
        isExampleGroup(root, node),
      );
      results.push(renderExampleGroups(root, groups, path, plan));
      continue;
    }
    for (const node of run) {
      results.push(dispatch(node, results.length));
    }
  }
  return results;
};

const collectUsageNotes = (
  root: cheerio.CheerioAPI,
  element: Element,
): Element[] => root(element).find(".un").toArray();

const collectStandaloneUsageExamples = (
  root: cheerio.CheerioAPI,
  element: Element,
): Element[] =>
  root(element)
    .children()
    .toArray()
    .filter(
      (child: AnyNode): child is Element =>
        child.type === "tag" &&
        hasAnyClass(root, child, ["vi", "vis", "ex-sent-group"]),
    );

const renderUsageNotes = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const usageNodes = collectUsageNotes(root, element).map(
    (usage: Element, index: number): RenderResult => {
      const textParts = root(usage)
        .children()
        .toArray()
        .map(
          (child: AnyNode, childIndex: number): RenderResult =>
            renderInlineNode(root, child, [...path, index, childIndex], plan, {
              skipClasses: ["vis", "un", "uns"],
            }),
        );
      const examples = root(usage)
        .find(".vis")
        .toArray()
        .filter(
          (vis: Element): boolean => root(vis).closest(".un").get(0) === usage,
        )
        .map(
          (vis: Element, exampleIndex: number): RenderResult =>
            renderInlineNode(root, vis, [...path, index, exampleIndex], plan),
        );
      const text = combineResults(textParts);
      const exampleResults = combineResults(examples);
      const spacedText: readonly StructuredContent[] = text.nodes.map(
        (content: StructuredContent): StructuredContent =>
          content === "—" ? "— " : content,
      );
      const textSpan: readonly StructuredContent[] =
        spacedText.length === 0
          ? []
          : [
              container("span", spacedText, {
                data: unitData("usage-note-text", { level: 6 }),
              }),
            ];
      return renderResult(
        [
          container("div", [...textSpan, ...exampleResults.nodes], {
            data: unitData("usage-note", { level: 6 }),
          }),
        ],
        [...text.findings, ...exampleResults.findings],
      );
    },
  );
  const standaloneExamples = combineResults(
    collectStandaloneUsageExamples(root, element).map(
      (example: Element, index: number): RenderResult =>
        renderInlineNode(root, example, [...path, 100 + index], plan),
    ),
  );
  const standaloneResult =
    standaloneExamples.nodes.length === 0
      ? emptyResult()
      : renderResult(
          [
            container("div", standaloneExamples.nodes, {
              data: unitData("usage-note", { level: 6 }),
            }),
          ],
          standaloneExamples.findings,
        );
  return combineResults([...usageNodes, standaloneResult]);
};

const renderScopedDefinition = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const content = renderInlineChildren(root, element, path, plan);
  return renderResult(
    [
      container("div", content.nodes, {
        data: unitData("definition", { level: 3 }),
      }),
    ],
    content.findings,
  );
};

const renderDefinitionFlow = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  level = 5,
  leadingNodes: readonly AnyNode[] = [],
): RenderResult => {
  const sourceNodes = [...leadingNodes, ...root(element).contents().toArray()];
  const results = renderNodeRuns(
    root,
    sourceNodes,
    path,
    plan,
    (child: AnyNode, index: number): RenderResult => {
      if (child.type === "tag" && hasClass(root, child, "uns")) {
        return renderUsageNotes(root, child, [...path, index], plan);
      }
      if (child.type === "tag" && hasClass(root, child, "sdsense")) {
        return renderScopedDefinition(root, child, [...path, index], plan);
      }
      return renderInlineNode(root, child, [...path, index], plan);
    },
  );
  const combined = combineResults(results);
  return renderResult(
    [
      container("div", combined.nodes, {
        data: unitData("definition", { level }),
      }),
    ],
    combined.findings,
  );
};

const renderSense = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const children = root(element)
    .contents()
    .toArray()
    .filter(
      (child: AnyNode): boolean =>
        child.type !== "tag" || !hasClass(root, child, "sn"),
    );
  const definitionIndex = children.findIndex(
    (child: AnyNode): boolean =>
      child.type === "tag" && hasClass(root, child, "dt"),
  );
  const leadingFormNodes =
    definitionIndex < 0
      ? []
      : children
          .slice(0, definitionIndex)
          .filter(
            (child: AnyNode): boolean =>
              child.type === "tag" && hasAnyClass(root, child, ["if", "spl"]),
          );
  const results = renderNodeRuns(
    root,
    children.filter(
      (child: AnyNode): boolean => !leadingFormNodes.includes(child),
    ),
    path,
    plan,
    (child: AnyNode, index: number): RenderResult => {
      if (child.type === "tag" && hasClass(root, child, "dt")) {
        return renderDefinitionFlow(
          root,
          child,
          [...path, index],
          plan,
          5,
          leadingFormNodes,
        );
      }
      if (child.type === "tag" && hasClass(root, child, "uns")) {
        return renderUsageNotes(root, child, [...path, index], plan);
      }
      if (child.type === "tag" && hasClass(root, child, "sdsense")) {
        return renderScopedDefinition(root, child, [...path, index], plan);
      }
      return renderInlineNode(root, child, [...path, index], plan);
    },
  );
  return combineResults(results);
};

const markerObservation = (
  root: cheerio.CheerioAPI,
  element: Element,
  content: readonly StructuredContent[],
  findings: readonly ConversionFinding[],
): SenseObservation => {
  const marker = root(element).find(".sn").first();
  const firstMarkerText = (selector: string): string | null => {
    const markerElement = marker.find(selector).first().get(0);
    return markerElement === undefined
      ? null
      : elementText(root, markerElement);
  };
  const number = firstMarkerText(".num");
  const letter = firstMarkerText(".letter");
  const subNumber = firstMarkerText(".sub-num");
  const markerSegment = (level: 3 | 4 | 5, marker: string): MarkerSegment => ({
    level,
    marker,
  });
  const markers: readonly MarkerSegment[] = [
    ...(number === null ? [] : [markerSegment(3, number)]),
    ...(letter === null ? [] : [markerSegment(4, letter)]),
    ...(subNumber === null ? [] : [markerSegment(5, subNumber)]),
  ];
  return { markers, content, findings };
};

const updateMarkerPath = (
  current: readonly MarkerSegment[],
  markers: readonly MarkerSegment[],
): readonly MarkerSegment[] =>
  markers.reduce(
    (
      path: readonly MarkerSegment[],
      marker: MarkerSegment,
    ): readonly MarkerSegment[] => [
      ...path.filter(
        ({ level }: MarkerSegment): boolean => level < marker.level,
      ),
      marker,
    ],
    current,
  );

const assignMarkerPaths = (
  observations: readonly SenseObservation[],
): readonly SenseRecord[] =>
  observations.reduce(
    (
      state: {
        readonly current: readonly MarkerSegment[];
        readonly records: readonly SenseRecord[];
      },
      observation: SenseObservation,
    ) => {
      const nextPath = updateMarkerPath(state.current, observation.markers);
      return {
        current: nextPath,
        records: [
          ...state.records,
          {
            markerPath: nextPath,
            content: observation.content,
            findings: observation.findings,
          },
        ],
      };
    },
    { current: [], records: [] },
  ).records;

const samePath = (
  left: readonly MarkerSegment[],
  right: readonly MarkerSegment[],
): boolean =>
  left.length === right.length &&
  left.every(
    ({ level, marker }: MarkerSegment, index: number): boolean =>
      right[index]?.level === level && right[index]?.marker === marker,
  );

const isPathPrefix = (
  prefix: readonly MarkerSegment[],
  path: readonly MarkerSegment[],
): boolean =>
  prefix.length <= path.length &&
  prefix.every(
    ({ level, marker }: MarkerSegment, index: number): boolean =>
      path[index]?.level === level && path[index]?.marker === marker,
  );

const uniquePaths = (
  paths: readonly (readonly MarkerSegment[])[],
): readonly (readonly MarkerSegment[])[] =>
  paths.reduce(
    (
      unique: readonly (readonly MarkerSegment[])[],
      path: readonly MarkerSegment[],
    ): readonly (readonly MarkerSegment[])[] =>
      unique.some((candidate: readonly MarkerSegment[]): boolean =>
        samePath(candidate, path),
      )
        ? unique
        : unique.concat([path]),
    [],
  );

const markerUnit = (level: 3 | 4 | 5): string => {
  if (level === 3) return "sense-number";
  if (level === 4) return "subsense-letter";
  return "definition-number";
};

const renderSenseList = (
  records: readonly SenseRecord[],
  parentPath: readonly MarkerSegment[],
): StructuredContent | null => {
  const nextPaths = uniquePaths(
    records
      .map(({ markerPath }: SenseRecord): readonly MarkerSegment[] =>
        markerPath.slice(0, parentPath.length + 1),
      )
      .filter(
        (path: readonly MarkerSegment[]): boolean =>
          path.length === parentPath.length + 1 &&
          isPathPrefix(parentPath, path),
      ),
  );
  if (nextPaths.length === 0) return null;

  const items = nextPaths.map(
    (path: readonly MarkerSegment[]): StructuredContent => {
      const last = path[path.length - 1];
      if (last === undefined) return container("li", []);

      const ownContent = records
        .filter(({ markerPath }: SenseRecord): boolean =>
          samePath(markerPath, path),
        )
        .flatMap(({ content }: SenseRecord): readonly StructuredContent[] => [
          ...content,
        ]);
      const childList = renderSenseList(records, path);
      const content =
        childList === null ? ownContent : [...ownContent, childList];
      return container("li", content, {
        data: unitData(markerUnit(last.level), {
          level: last.level,
          sourceMarker: last.marker,
        }),
      });
    },
  );
  const listLevel = nextPaths[0]?.[nextPaths[0].length - 1]?.level ?? 3;
  return container("ol", items, {
    data: unitData("mwu-level", { level: listLevel }),
  });
};

const renderSenseRecords = (records: readonly SenseRecord[]): RenderResult => {
  const unmarked = records
    .filter(({ markerPath }: SenseRecord): boolean => markerPath.length === 0)
    .flatMap(({ content }: SenseRecord): readonly StructuredContent[] => [
      ...content,
    ]);
  const list = renderSenseList(
    records.filter(
      ({ markerPath }: SenseRecord): boolean => markerPath.length > 0,
    ),
    [],
  );
  const nodes = list === null ? unmarked : [...unmarked, list];
  return renderResult(
    nodes,
    records.flatMap(
      ({ findings }: SenseRecord): readonly ConversionFinding[] => findings,
    ),
  );
};

const collectSenseRecords = (
  root: cheerio.CheerioAPI,
  scope: Element,
  plan: CanonicalEntryPlan,
): RenderResult => {
  const senses = root(scope)
    .find(".sense, .sen")
    .toArray()
    .filter(
      (sense: Element): boolean =>
        root(sense).parents(".sense, .sen").length === 0,
    );
  const observations = senses.map(
    (sense: Element, index: number): SenseObservation => {
      const rendered = renderSense(root, sense, [index], plan);
      return markerObservation(root, sense, rendered.nodes, rendered.findings);
    },
  );
  return renderSenseRecords(assignMarkerPaths(observations));
};

const renderVerbSubtypeList = (
  root: cheerio.CheerioAPI,
  group: Element,
  labels: readonly Element[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const children = root(group).children().toArray();
  const items = labels.map(
    (label: Element, labelIndex: number): RenderResult => {
      const labelPosition = children.indexOf(label);
      const nextLabelPosition = children.findIndex(
        (child: AnyNode, index: number): boolean =>
          index > labelPosition &&
          child.type === "tag" &&
          hasClass(root, child, "vd"),
      );
      const bodyChildren = children.slice(
        labelPosition + 1,
        nextLabelPosition < 0 ? children.length : nextLabelPosition,
      );
      const body = combineResults(
        bodyChildren.map((child: AnyNode, childIndex: number): RenderResult => {
          if (
            child.type === "tag" &&
            hasAnyClass(root, child, ["sb", "sen", "sense"])
          ) {
            return collectSenseRecords(root, child, plan);
          }
          return renderLooseNode(root, child, [labelIndex, childIndex], plan, [
            "vd",
          ]);
        }),
      );
      const labelText = elementText(root, label);
      const labelNode = container("span", labelText, {
        data: unitData("verb-subtype", { level: 2 }),
      });
      return renderResult(
        [
          container("li", [labelNode, ...body.nodes], {
            data: unitData("verb-subtype", {
              level: 2,
              sourceMarker: String(labelIndex + 1),
            }),
          }),
        ],
        body.findings,
      );
    },
  );
  const renderedItems = combineResults(items);
  return renderResult(
    [
      container("ol", renderedItems.nodes, {
        data: unitData("mwu-level", { level: 2 }),
      }),
    ],
    renderedItems.findings,
  );
};

const renderDefinitionGroup = (
  root: cheerio.CheerioAPI,
  group: Element,
  plan: CanonicalEntryPlan,
): RenderResult => {
  const labels = root(group)
    .children()
    .toArray()
    .filter(
      (child: AnyNode): child is Element =>
        child.type === "tag" && hasClass(root, child, "vd"),
    );
  if (labels.length > 0) {
    return renderVerbSubtypeList(root, group, labels, plan);
  }

  const senses = collectSenseRecords(root, group, plan);
  const loose = renderLooseChildren(root, group, [0], plan, ["sb", "vd"]);
  return combineResults([...(loose.nodes.length === 0 ? [] : [loose]), senses]);
};

const renderDefinitionSection = (
  root: cheerio.CheerioAPI,
  owner: Element,
  plan: CanonicalEntryPlan,
): RenderResult => {
  const definition = root(owner).find('[data-id="definition"]').first().get(0);
  if (definition === undefined) return emptyResult();

  const groups = root(definition)
    .find(".vg")
    .toArray()
    .filter(
      (group: Element): boolean =>
        root(group).parents(".vg").length === 0 &&
        root(group).closest(".dro").length === 0,
    );
  if (groups.length === 0) {
    const senses = collectSenseRecords(root, definition, plan);
    return senses.nodes.length === 0
      ? renderLooseChildren(root, definition, [0], plan)
      : senses;
  }

  return combineResults(
    groups.map(
      (group: Element): RenderResult =>
        renderDefinitionGroup(root, group, plan),
    ),
  );
};

const renderOriginNode = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  if (node.type === "text") return renderTextNode(node, false);
  if (node.type !== "tag") return emptyResult();
  const originNodeText = elementText(root, node);
  if (/^First Known Use:/u.test(originNodeText)) {
    return renderResult([
      container("div", [originNodeText], {
        data: unitData("first-known-use", { level: 1 }),
      }),
    ]);
  }
  if (!isBlockTag(node.tagName)) {
    return renderInlineNode(root, node, path, plan);
  }

  const children = combineResults(
    root(node)
      .contents()
      .toArray()
      .map(
        (child: AnyNode, index: number): RenderResult =>
          renderOriginNode(root, child, [...path, index], plan),
      ),
  );
  return children.nodes.length === 0
    ? emptyResult()
    : renderResult([container("div", children.nodes)], children.findings);
};

const renderOrigin = (
  root: cheerio.CheerioAPI,
  owner: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const section = root(owner).find('[data-id="origin"]').first().get(0);
  if (section === undefined) return emptyResult();

  const title = root(section).find(".toggle .text").first().get(0);
  const summaryText = title === undefined ? "Origin" : elementText(root, title);
  const body = root(section).find(".section-content").first().get(0);
  if (body === undefined) return emptyResult();

  const renderedBody = combineResults(
    root(body)
      .contents()
      .toArray()
      .map(
        (child: AnyNode, index: number): RenderResult =>
          renderOriginNode(root, child, [...path, index], plan),
      ),
  );
  return renderResult(
    [
      container(
        "details",
        [
          container("summary", summaryText, {
            data: unitData("origin-section-title", { level: 1 }),
          }),
          container("div", renderedBody.nodes, {
            data: unitData("origin-text", { level: 1 }),
          }),
        ],
        { data: unitData("origin", { level: 1 }), open: false },
      ),
    ],
    renderedBody.findings,
  );
};

const synonymNodeText = (root: cheerio.CheerioAPI, node: AnyNode): string =>
  node.type === "text"
    ? node.data
    : node.type === "tag"
      ? elementText(root, node)
      : "";

const isSynonymTerm = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
): node is Element =>
  node.type === "tag" &&
  node.tagName === "a" &&
  hasClass(root, node, "mw_t_sc");

const synonymTermName = (root: cheerio.CheerioAPI, node: Element): string =>
  elementText(root, node).toLocaleLowerCase();

const isSynonymTermSeparator = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
): boolean =>
  /^[\s,;&]*(?:(?:and|or)\s*)?[\s,;&]*$/iu.test(
    nodes.map((node: AnyNode): string => synonymNodeText(root, node)).join(""),
  );

const findSynonymTermGroupIndexes = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
): readonly number[] => {
  const firstIndex = nodes.findIndex((node: AnyNode): boolean =>
    isSynonymTerm(root, node),
  );
  if (firstIndex < 0) return [];

  return nodes.slice(firstIndex + 1).reduce(
    (
      indexes: readonly number[],
      node: AnyNode,
      offset: number,
    ): readonly number[] => {
      if (!isSynonymTerm(root, node)) return indexes;
      const candidateIndex = firstIndex + offset + 1;
      const previousIndex = indexes[indexes.length - 1];
      return previousIndex !== undefined &&
        isSynonymTermSeparator(
          root,
          nodes.slice(previousIndex + 1, candidateIndex),
        )
        ? indexes.concat(candidateIndex)
        : indexes;
    },
    [firstIndex],
  );
};

const renderSynonymTerm = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const content = renderInlineChildren(root, element, path, plan, {
    plainLinks: true,
  });
  return renderResult(
    [
      container("span", content.nodes, {
        data: unitData("synonym-term", {
          level: 1,
          relation: "synonym",
          sourceMarker: elementText(root, element),
          sourceUnit: "mw_t_sc",
        }),
      }),
    ],
    content.findings,
  );
};

const renderSynonymInlineNodes = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult =>
  combineResults(
    nodes.map(
      (node: AnyNode, index: number): RenderResult =>
        renderInlineNode(root, node, [...path, index], plan),
    ),
  );

const isStandaloneSynonymExample = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
): node is Element =>
  node.type === "tag" &&
  hasClass(root, node, "ex-sent") &&
  !hasClass(root, node, "aq");

const isSynonymAttribution = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
): node is Element =>
  node.type === "tag" &&
  hasClass(root, node, "ex-sent") &&
  hasClass(root, node, "aq");

const nextSynonymAttribution = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
  index: number,
): Element | undefined => {
  const nextMeaningful = nodes
    .slice(index + 1)
    .find(
      (node: AnyNode): boolean =>
        node.type !== "text" || node.data.trim().length > 0,
    );
  return nextMeaningful !== undefined &&
    isSynonymAttribution(root, nextMeaningful)
    ? nextMeaningful
    : undefined;
};

const renderSynonymExamples = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult =>
  collapseExampleResults(
    nodes.flatMap((node: AnyNode, index: number): readonly RenderResult[] => {
      if (!isStandaloneSynonymExample(root, node)) return [];
      const sibling = nextSynonymAttribution(root, nodes, index);
      const siblingSource =
        sibling === undefined ? null : renderAttribution(root, sibling);
      const nestedAttribution = root(node).find(".aq").first().get(0);
      const source =
        siblingSource ??
        (nestedAttribution === undefined
          ? null
          : renderAttribution(root, nestedAttribution));
      return [
        renderExampleSentence(root, node, [...path, index], plan, source),
      ];
    }),
  );

const isSeeInAddition = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
): node is Element =>
  node.type === "tag" && hasClass(root, node, "see-in-addition");

const isSynonymExampleNode = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
): boolean =>
  isStandaloneSynonymExample(root, node) || isSynonymAttribution(root, node);

const lastMeaningfulSynonymNode = (
  nodes: readonly AnyNode[],
): AnyNode | undefined =>
  nodes.reduce(
    (last: AnyNode | undefined, node: AnyNode): AnyNode | undefined =>
      node.type !== "text" || node.data.trim().length > 0 ? node : last,
    undefined,
  );

const synonymTextEndsSentence = (text: string): boolean =>
  /[.!?](?:["'”’)\]]*)$/u.test(text.trim());

const isSynonymEntryBoundary = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
  previousIndex: number,
  currentIndex: number,
): boolean => {
  const previousTerm = nodes[previousIndex];
  const currentTerm = nodes[currentIndex];
  if (!isSynonymTerm(root, previousTerm) || !isSynonymTerm(root, currentTerm)) {
    return false;
  }

  // MWU stores entry starts as adjacent links; examples and sentence endings
  // are the source boundaries that distinguish them from inline references.
  const between = nodes.slice(previousIndex + 1, currentIndex);
  const lastExampleOffset = between.reduce(
    (last: number, node: AnyNode, index: number): number =>
      isSynonymExampleNode(root, node) ? index : last,
    -1,
  );
  const trailingText = between
    .slice(lastExampleOffset + 1)
    .map((node: AnyNode): string => synonymNodeText(root, node))
    .join("")
    .trim();
  const lastMeaningful = lastMeaningfulSynonymNode(between);
  const hasTrailingExample =
    lastMeaningful !== undefined && isSynonymExampleNode(root, lastMeaningful);
  const hasExampleBeforeTrailingText = lastExampleOffset >= 0;
  const repeatedTerm =
    synonymTermName(root, previousTerm) === synonymTermName(root, currentTerm);

  return (
    hasTrailingExample ||
    synonymTextEndsSentence(trailingText) ||
    (hasExampleBeforeTrailingText && !repeatedTerm && trailingText.length > 0)
  );
};

const findSynonymEntryIndexes = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
  groupTermEnd: number,
  groupIndexes: readonly number[],
): readonly number[] => {
  const groupTerms = groupIndexes.map((index: number): string =>
    synonymTermName(root, nodes[index] as Element),
  );
  const bodyIndexes = nodes
    .map((node: AnyNode, index: number): number | null =>
      index > groupTermEnd && isSynonymTerm(root, node) ? index : null,
    )
    .filter((index: number | null): index is number => index !== null);
  const firstBodyIndex = bodyIndexes[0];
  if (firstBodyIndex === undefined) return [];

  const initialEntries = groupTerms.includes(
    synonymTermName(root, nodes[firstBodyIndex] as Element),
  )
    ? [firstBodyIndex]
    : [];

  return bodyIndexes
    .slice(1)
    .reduce(
      (
        entryIndexes: readonly number[],
        currentIndex: number,
        offset: number,
      ): readonly number[] => {
        const previousIndex = bodyIndexes[offset];
        return previousIndex !== undefined &&
          isSynonymEntryBoundary(root, nodes, previousIndex, currentIndex)
          ? entryIndexes.concat(currentIndex)
          : entryIndexes;
      },
      initialEntries,
    );
};

const renderSynonymGroup = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
  indexes: readonly number[],
  displayEnd: number,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const firstIndex = indexes[0];
  if (firstIndex === undefined) return emptyResult();

  const groupResults = nodes
    .slice(firstIndex, displayEnd + 1)
    .map((node: AnyNode, offset: number): RenderResult => {
      const sourceIndex = firstIndex + offset;
      return isSynonymTerm(root, node) && indexes.includes(sourceIndex)
        ? renderSynonymTerm(root, node, [...path, sourceIndex], plan)
        : renderInlineNode(root, node, [...path, sourceIndex], plan);
    });
  const group = combineResults(groupResults);
  return renderResult(
    [
      container("div", group.nodes, {
        data: unitData("synonym-term-group", {
          level: 1,
          relation: "synonym",
        }),
      }),
    ],
    group.findings,
  );
};

const synonymGroupDisplayEnd = (
  nodes: readonly AnyNode[],
  termEnd: number,
): number => {
  const firstMeaningfulOffset = nodes
    .slice(termEnd + 1)
    .findIndex(
      (node: AnyNode): boolean =>
        node.type !== "text" || node.data.trim().length > 0,
    );
  if (firstMeaningfulOffset < 0) return termEnd;
  const firstMeaningful = nodes[termEnd + 1 + firstMeaningfulOffset];
  return firstMeaningful?.type === "text" &&
    /^:\s*$/u.test(firstMeaningful.data.trim())
    ? termEnd + 1 + firstMeaningfulOffset
    : termEnd;
};

const renderSynonymIntroduction = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const prose = nodes.filter(
    (node: AnyNode): boolean =>
      !isStandaloneSynonymExample(root, node) &&
      !isSynonymAttribution(root, node) &&
      !isSeeInAddition(root, node),
  );
  const proseResult = renderSynonymInlineNodes(root, prose, path, plan);
  const exampleResult = renderSynonymExamples(root, nodes, path, plan);
  const content = combineResults([proseResult, exampleResult]);
  return content.nodes.length === 0
    ? emptyResult()
    : renderResult(
        [
          container("div", content.nodes, {
            data: unitData("synonym-introduction", {
              level: 1,
              relation: "synonym",
            }),
          }),
        ],
        content.findings,
      );
};

const renderSynonymEntry = (
  root: cheerio.CheerioAPI,
  nodes: readonly AnyNode[],
  start: number,
  end: number,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const term = nodes[start];
  if (term === undefined || !isSynonymTerm(root, term)) return emptyResult();

  const body = nodes.slice(start + 1, end);
  const prose = body.filter(
    (node: AnyNode): boolean =>
      !isStandaloneSynonymExample(root, node) &&
      !isSynonymAttribution(root, node) &&
      !isSeeInAddition(root, node),
  );
  const termResult = renderSynonymTerm(root, term, [...path, start], plan);
  const proseResult = renderSynonymInlineNodes(root, prose, path, plan);
  const exampleResult = renderSynonymExamples(root, body, path, plan);
  const explanation = container(
    "span",
    [...termResult.nodes, ...proseResult.nodes],
    {
      data: unitData("synonym-explanation", {
        level: 1,
        relation: "synonym",
        sourceMarker: elementText(root, term),
      }),
    },
  );
  const content = [termResult, proseResult, exampleResult];
  const findings = combineResults(content).findings;
  return renderResult(
    [
      container("div", [explanation, ...exampleResult.nodes], {
        data: unitData("synonym-entry", {
          level: 1,
          relation: "synonym",
          sourceMarker: elementText(root, term),
        }),
      }),
    ],
    findings,
  );
};

const renderSynonymDiscussion = (
  root: cheerio.CheerioAPI,
  discussion: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const paragraph = root(discussion)
    .find("p.syn, .syn")
    .toArray()
    .find(
      (candidate: Element): boolean =>
        !hasClass(root, candidate, "synonym-discussion") &&
        root(candidate).parents("p.syn").length === 0,
    );
  if (paragraph === undefined) {
    return renderLooseChildren(root, discussion, path, plan);
  }

  const rawNodes = root(paragraph).contents().toArray();
  const titleIndex = rawNodes.findIndex(
    (node: AnyNode): boolean =>
      node.type === "tag" &&
      (node.tagName === "strong" || node.tagName === "b") &&
      /^synonym discussion$/iu.test(elementText(root, node)),
  );
  const nodes = titleIndex < 0 ? rawNodes : rawNodes.slice(titleIndex + 1);
  const groupIndexes = findSynonymTermGroupIndexes(root, nodes);
  const groupTermEnd = groupIndexes[groupIndexes.length - 1];
  if (groupTermEnd === undefined) {
    return renderLooseChildren(root, discussion, path, plan);
  }
  const groupDisplayEnd = synonymGroupDisplayEnd(nodes, groupTermEnd);

  const entryIndexes = findSynonymEntryIndexes(
    root,
    nodes,
    groupTermEnd,
    groupIndexes,
  );
  const introductionEnd = entryIndexes[0] ?? nodes.length;
  const group = renderSynonymGroup(
    root,
    nodes,
    groupIndexes,
    groupDisplayEnd,
    path,
    plan,
  );
  const introduction = renderSynonymIntroduction(
    root,
    nodes.slice(groupDisplayEnd + 1, introductionEnd),
    [...path, introductionEnd],
    plan,
  );
  const entries = entryIndexes.map(
    (start: number, index: number): RenderResult =>
      renderSynonymEntry(
        root,
        nodes,
        start,
        entryIndexes[index + 1] ?? nodes.length,
        [...path, index],
        plan,
      ),
  );
  const seeInAddition = root(discussion)
    .find(".see-in-addition")
    .toArray()
    .map(
      (element: Element, index: number): RenderResult =>
        renderLooseNode(root, element, [...path, 100 + index], plan),
    );
  return combineResults([group, introduction, ...entries, ...seeInAddition]);
};

const renderRelated = (
  root: cheerio.CheerioAPI,
  owner: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const section = root(owner).find('[data-id="related-to"]').first().get(0);
  if (section === undefined) return emptyResult();

  const strong = root(section).find("strong").first().get(0);
  const toggle = root(section).find(".toggle .text").first().get(0);
  const summaryText =
    strong !== undefined
      ? elementText(root, strong)
      : toggle !== undefined
        ? elementText(root, toggle)
        : "Related";

  const body = root(section).find(".section-content").first().get(0);
  const discussion = root(section).find(".synonym-discussion").first().get(0);
  const renderedBody =
    discussion === undefined
      ? body === undefined
        ? renderLooseChildren(root, section, path, plan, ["toggle"])
        : renderLooseChildren(root, body, path, plan, ["toggle"])
      : renderSynonymDiscussion(root, discussion, path, plan);
  return renderResult(
    [
      container(
        "details",
        [
          container("summary", summaryText),
          container("div", renderedBody.nodes, {
            data: unitData("synonym-discussion", { level: 1 }),
          }),
        ],
        { data: unitData("related-item", { level: 1 }), open: false },
      ),
    ],
    renderedBody.findings,
  );
};

const renderUndefinedRunOnNode = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  if (node.type === "text") return renderTextNode(node, false);
  if (node.type !== "tag") return emptyResult();
  const element = node;
  if (hasAnyClass(root, element, ["first-slash", "last-slash"])) {
    return emptyResult();
  }
  if (hasClass(root, element, "ure")) {
    const content = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [
        container("span", content.nodes, {
          data: unitData("run-on-form", {
            level: 1,
            sourceUnit: "ure",
          }),
        }),
      ],
      content.findings,
    );
  }
  if (hasClass(root, element, "prt-a")) {
    return renderFormPronunciation(root, element, path, plan, 1);
  }
  if (hasClass(root, element, "fl")) {
    const content = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [
        container("span", content.nodes, {
          data: unitData("part-of-speech", {
            level: 1,
            sourceUnit: "fl",
          }),
        }),
      ],
      content.findings,
    );
  }
  if (hasClass(root, element, "il")) {
    const content = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [
        container("span", content.nodes, {
          data: unitData("inflection-label", {
            level: 1,
            sourceUnit: "il",
          }),
        }),
      ],
      content.findings,
    );
  }
  if (hasClass(root, element, "ix")) {
    const content = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [
        container("span", content.nodes, {
          data: unitData("inflection-marker", {
            level: 1,
            sourceUnit: "ix",
          }),
        }),
      ],
      content.findings,
    );
  }
  return renderInlineNode(root, element, path, plan);
};

const renderUndefinedRunOn = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const content = combineResults(
    root(element)
      .contents()
      .toArray()
      .map(
        (node: AnyNode, index: number): RenderResult =>
          renderUndefinedRunOnNode(root, node, [...path, index], plan),
      ),
  );
  return renderResult(
    [
      container("div", content.nodes, {
        data: unitData("undefined-run-on", {
          level: 1,
          relation: "parent-only",
          sourceUnit: "uro",
        }),
      }),
    ],
    content.findings,
  );
};

const renderUndefinedRunOns = (
  root: cheerio.CheerioAPI,
  owner: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult =>
  combineResults(
    root(owner)
      .find(".uro")
      .toArray()
      .filter(
        (runOn: Element): boolean => root(runOn).parents(".drp").length === 0,
      )
      .map(
        (runOn: Element, index: number): RenderResult =>
          renderUndefinedRunOn(root, runOn, [...path, index], plan),
      ),
  );

const renderPhraseSection = (
  root: cheerio.CheerioAPI,
  title: Element,
  bodyChildren: readonly AnyNode[],
  path: readonly number[],
  plan: CanonicalEntryPlan,
  embedded: boolean,
): RenderResult => {
  const bodyResults = renderNodeRuns(
    root,
    bodyChildren,
    path,
    plan,
    (child: AnyNode, index: number): RenderResult => {
      if (child.type === "tag" && hasClass(root, child, "vg")) {
        return renderDefinitionGroup(root, child, plan);
      }
      if (child.type === "tag" && hasClass(root, child, "sls")) {
        return renderInlineChildren(root, child, [...path, index], plan);
      }
      if (child.type === "tag" && hasClass(root, child, "dt")) {
        return renderDefinitionFlow(root, child, [...path, index], plan, 3);
      }
      if (child.type === "tag" && hasClass(root, child, "vr")) {
        // In a titled section the alternate spellings live in the summary
        // line; only the embedded (summary-less) flow keeps them inline.
        return embedded ? renderAlternateForm(root, child) : emptyResult();
      }
      return renderLooseNode(root, child, [...path, index], plan, ["drp"]);
    },
  );
  const body = combineResults(bodyResults);
  if (embedded) {
    return renderResult(
      [
        container("div", body.nodes, {
          data: unitData("definition-flow", { level: 3 }),
        }),
      ],
      body.findings,
    );
  }
  const alternateGroups = bodyChildren
    .filter(
      (child: AnyNode): child is Element =>
        child.type === "tag" && hasClass(root, child, "vr"),
    )
    .map((child: Element): readonly StructuredContent[] =>
      alternateFormParts(root, child),
    );
  const alternates = alternateGroups.flatMap(
    (parts: readonly StructuredContent[]): readonly StructuredContent[] =>
      parts.length === 0 ? [] : [" ", ...parts],
  );
  return renderResult(
    [
      container(
        "details",
        [
          container("summary", [
            container("span", elementText(root, title)),
            ...alternates,
          ]),
          container("div", body.nodes, {
            data: unitData("definition-flow", { level: 3 }),
          }),
        ],
        { data: unitData("phrase", { level: 1 }), open: false },
      ),
    ],
    body.findings,
  );
};

const renderPhrase = (
  root: cheerio.CheerioAPI,
  phrase: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  embedded: boolean,
): RenderResult => {
  const title = root(phrase).find(".drp").first().get(0);
  if (title === undefined) return emptyResult();
  const bodyChildren = root(phrase)
    .contents()
    .toArray()
    .filter(
      (child: AnyNode): boolean =>
        child.type !== "tag" || !hasClass(root, child, "drp"),
    );
  return renderPhraseSection(root, title, bodyChildren, path, plan, embedded);
};

const renderDroPhrases = (
  root: cheerio.CheerioAPI,
  dro: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  embedded: boolean,
): RenderResult => {
  const children = root(dro).children().toArray();
  const titles = children.filter(
    (child: AnyNode): child is Element =>
      child.type === "tag" && hasClass(root, child, "drp"),
  );
  if (titles.length <= 1) return renderPhrase(root, dro, path, plan, embedded);

  return combineResults(
    titles.map((title: Element, index: number): RenderResult => {
      const titlePosition = children.indexOf(title);
      const nextTitlePosition = children.findIndex(
        (child: AnyNode, childIndex: number): boolean =>
          childIndex > titlePosition &&
          child.type === "tag" &&
          hasClass(root, child, "drp"),
      );
      return renderPhraseSection(
        root,
        title,
        children.slice(
          titlePosition + 1,
          nextTitlePosition < 0 ? children.length : nextTitlePosition,
        ),
        [...path, index],
        plan,
        embedded,
      );
    }),
  );
};

const renderPhrases = (
  root: cheerio.CheerioAPI,
  owner: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const embedded =
    root(owner).is(".dro") || root(owner).closest(".dro").length > 0;
  const phrases = [
    ...(root(owner).is(".dro") ? [owner] : []),
    ...root(owner)
      .find(".dro")
      .toArray()
      .filter((phrase: Element): boolean => phrase !== owner),
  ].filter((phrase: Element): boolean => root(phrase).find(".drp").length > 0);
  return combineResults(
    phrases.map(
      (phrase: Element, index: number): RenderResult =>
        renderDroPhrases(root, phrase, [...path, index], plan, embedded),
    ),
  );
};

const renderInflectionNode = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  if (node.type === "text") return renderTextNode(node, false);
  if (node.type !== "tag") return emptyResult();
  const element = node;
  if (hasAnyClass(root, element, ignoredClasses)) return emptyResult();
  if (hasClass(root, element, "if") || hasClass(root, element, "ix")) {
    const child = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("inflection-marker", { level: 1 }),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "il")) {
    const child = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("inflection-label", { level: 1 }),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "prt-a")) {
    return renderFormPronunciation(root, element, path, plan, 1);
  }
  return renderInlineNode(root, element, path, plan);
};

const renderInflectionGroup = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const content = combineResults(
    root(element)
      .contents()
      .toArray()
      .map(
        (node: AnyNode, index: number): RenderResult =>
          renderInflectionNode(root, node, [...path, index], plan),
      ),
  );
  return renderResult(
    [
      container("div", content.nodes, {
        data: unitData("inflection-group", { level: 1 }),
      }),
    ],
    content.findings,
  );
};

const alternateFormParts = (
  root: cheerio.CheerioAPI,
  element: Element,
): StructuredContent[] => {
  const qualifier = root(element).children(".vl").first().get(0);
  const alternate = root(element).children(".va").first().get(0);
  const parts: StructuredContent[] = [];
  if (qualifier !== undefined) {
    const text = elementText(root, qualifier);
    if (isVisible(text)) {
      parts.push(
        container("span", text, {
          data: unitData("variant-qualifier", { level: 1 }),
        }),
        " ",
      );
    }
  }
  if (alternate !== undefined) {
    const text = elementText(root, alternate);
    if (isVisible(text)) {
      parts.push(
        container("span", text, {
          data: unitData("alternate-form", { level: 1 }),
        }),
      );
    }
  }
  return parts;
};

const renderAlternateForm = (
  root: cheerio.CheerioAPI,
  element: Element,
): RenderResult => {
  const parts = alternateFormParts(root, element);
  return parts.length === 0
    ? emptyResult()
    : renderResult([
        container("div", parts, {
          data: unitData("alternate-form", { level: 1 }),
        }),
      ]);
};

const renderPronunciationChildren = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult =>
  combineResults(
    root(element)
      .contents()
      .toArray()
      .map(
        (child: AnyNode, index: number): RenderResult =>
          renderPronunciationNode(root, child, [...path, index], plan),
      ),
  );

const renderPronunciationNode = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  if (node.type === "text") return renderTextNode(node, false);
  if (node.type !== "tag") return emptyResult();

  const element = node;
  if (
    hasClass(root, element, "first-slash") ||
    hasClass(root, element, "last-slash")
  ) {
    return emptyResult();
  }
  if (
    hasAnyClass(root, element, ignoredClasses) &&
    !hasClass(root, element, "addPunct") &&
    !hasClass(root, element, "pun")
  ) {
    return emptyResult();
  }
  if (hasClass(root, element, "addPunct") || hasClass(root, element, "pun")) {
    return renderInlineChildren(root, element, path, plan);
  }
  if (hasClass(root, element, "prs")) {
    return renderPronunciationChildren(root, element, path, plan);
  }
  if (hasClass(root, element, "pr")) {
    const isNote =
      root(element).find(".mw_t_it").length > 0 ||
      root(element).parents(".mw_t_it").length > 0;
    if (isNote) {
      const note = renderPronunciationChildren(root, element, path, plan);
      return renderResult(
        [
          container("span", note.nodes, {
            data: unitData("pronunciation-note", { level: 1 }),
          }),
        ],
        note.findings,
      );
    }
    const reading = formatPronunciation(elementText(root, element));
    return reading.length === 0
      ? emptyResult()
      : renderResult([
          container("span", reading, {
            data: unitData("pronunciation-reading", { level: 1 }),
          }),
        ]);
  }
  return renderInlineNode(root, element, path, plan);
};

const renderPronunciation = (
  root: cheerio.CheerioAPI,
  prs: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const contents = root(prs).contents().toArray();
  const scope =
    root(prs).find(".last-slash").length > 0
      ? contents
      : (() => {
          const parent = root(prs).parent().get(0);
          if (parent === undefined) return contents;
          const siblings = root(parent).contents().toArray();
          const start = siblings.indexOf(prs);
          return start < 0 ? contents : siblings.slice(start);
        })();
  const end = scope.findIndex(
    (node: AnyNode): boolean =>
      node.type === "tag" && hasClass(root, node, "last-slash"),
  );
  const boundedScope = end < 0 ? scope : scope.slice(0, end + 1);
  return combineResults(
    boundedScope.map(
      (node: AnyNode, index: number): RenderResult =>
        renderPronunciationNode(root, node, [...path, index], plan),
    ),
  );
};

const renderHeader = (
  root: cheerio.CheerioAPI,
  owner: Element,
  plan: CanonicalEntryPlan,
): {
  readonly result: RenderResult;
  readonly definitionTags: string | null;
} => {
  const hword = root(owner).find(".hword").first().get(0);
  const header = root(owner).find(".entry-header").first().get(0);
  const partOfSpeech = root(owner).find(".fl").first().get(0);
  const definitionTags =
    partOfSpeech === undefined
      ? null
      : definitionTag(elementText(root, partOfSpeech));
  const homograph =
    hword === undefined
      ? ""
      : normalizeBlockText(root(hword).find("sup").first().text());
  const displayHeadword =
    hword === undefined
      ? "displayHeadword" in plan
        ? plan.displayHeadword
        : ""
      : normalizeBlockText(
          root(hword)
            .contents()
            .toArray()
            .map((node: AnyNode): string =>
              textWithoutElements(root, node, ["sup"]),
            )
            .join(""),
        );
  const prs = root(header ?? owner)
    .find(".prs")
    .first()
    .get(0);
  const pronunciation =
    prs === undefined
      ? emptyResult()
      : renderPronunciation(root, prs, [0], plan);
  const inflection =
    root(owner).find(".headword-row .vg-ins").first().get(0) ??
    root(owner).find(".vg-ins").first().get(0);
  const qualifier = root(owner).find(".lbs").first().get(0);
  const qualifierLabel =
    qualifier === undefined
      ? undefined
      : (root(qualifier).find(".lb").first().get(0) ?? qualifier);
  const alternates = root(owner)
    .find(".entry-attr.vrs > .vr")
    .toArray()
    .flatMap(
      (vr: Element): readonly StructuredContent[] =>
        renderAlternateForm(root, vr).nodes,
    );
  const headerNodes: readonly StructuredContent[] = [
    ...(homograph.length === 0
      ? []
      : [
          container("span", homograph, {
            data: unitData("homograph-number", { level: 1 }),
          }),
          " ",
        ]),
    ...(displayHeadword !== plan.term && displayHeadword.length > 0
      ? [
          container("div", displayHeadword, {
            data: unitData("headword-display", { level: 1 }),
          }),
        ]
      : []),
    ...(qualifierLabel === undefined
      ? []
      : [
          container(
            "span",
            renderInlineChildren(root, qualifierLabel, [0], plan).nodes,
            {
              data: unitData("entry-qualifier", { level: 1 }),
            },
          ),
        ]),
    ...(pronunciation.nodes.length === 0
      ? []
      : [
          container("span", pronunciation.nodes, {
            data: unitData("pronunciation", { level: 1 }),
          }),
        ]),
    ...(inflection === undefined
      ? []
      : renderInflectionGroup(root, inflection, [1], plan).nodes),
    ...alternates,
  ];
  return {
    result:
      headerNodes.length === 0
        ? emptyResult()
        : renderResult(
            [
              container("div", headerNodes, {
                data: unitData("mwu-header", { level: 1 }),
              }),
            ],
            pronunciation.findings,
          ),
    definitionTags,
  };
};

const renderLooseNode = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  skipClasses: readonly string[] = [],
): RenderResult => {
  if (node.type === "text") return renderTextNode(node, false);
  if (node.type !== "tag") return emptyResult();
  const element = node;
  if (
    root(element).is(
      '[data-id="definition"], [data-id="origin"], [data-id="related-to"]',
    )
  ) {
    return emptyResult();
  }
  if (
    hasClass(root, element, "entry-header") ||
    hasClass(root, element, "headword-row") ||
    hasClass(root, element, "hword") ||
    hasClass(root, element, "fl")
  ) {
    return emptyResult();
  }
  if (element.tagName === "p") {
    const looseNodeText = elementText(root, element);
    if (/^First Known Use:/u.test(looseNodeText)) {
      return renderResult([
        container("div", [looseNodeText], {
          data: unitData("first-known-use", { level: 1 }),
        }),
      ]);
    }
  }
  if (
    hasAnyClass(root, element, ignoredClasses) ||
    skipClasses.some((className: string): boolean =>
      hasClass(root, element, className),
    )
  ) {
    return emptyResult();
  }
  if (hasClass(root, element, "dt")) {
    return renderDefinitionFlow(root, element, path, plan);
  }
  if (hasClass(root, element, "ex-sent-group")) {
    return renderExampleGroup(root, element, path, plan);
  }
  if (hasClass(root, element, "uns")) {
    return renderUsageNotes(root, element, path, plan);
  }
  if (hasClass(root, element, "ca")) {
    const child = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("called-also", { level: 6 }),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "cxl-ref")) {
    const child = renderInlineChildren(root, element, path, plan);
    const relationSpan = root(element).find(".cxl").toArray()[0];
    const relation =
      relationSpan === undefined ? undefined : elementText(root, relationSpan);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("relation-reference", {
            level: 6,
            ...(relation === undefined ? {} : { relation }),
          }),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "see-in-addition")) {
    const child = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [container("div", child.nodes, { data: unitData("see-in-addition") })],
      child.findings,
    );
  }
  if (hasClass(root, element, "urefs") || hasClass(root, element, "ur")) {
    return renderUsageDiscussionReference(root, element, path, plan);
  }
  if (hasClass(root, element, "sls")) {
    const child = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [
        container("div", child.nodes, {
          data: unitData("source-block-boundary", {
            level: 5,
            sourceUnit: "sls",
          }),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "sl")) {
    const child = renderInlineChildren(root, element, path, plan);
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("tag", {
            category: "usage",
            sourceUnit: "sense-label",
            level: 5,
          }),
          title: elementText(root, element),
        }),
      ],
      child.findings,
    );
  }
  if (hasClass(root, element, "lb") || hasClass(root, element, "spl")) {
    return renderInlineNode(root, element, path, plan);
  }
  if (hasClass(root, element, "vg-ins")) {
    return renderInflectionGroup(root, element, path, plan);
  }
  if (hasClass(root, element, "vr")) {
    return renderAlternateForm(root, element);
  }
  if (!isKnownTag(element.tagName)) {
    return renderUnsupported(root, element, path, plan);
  }

  const childResults = root(element)
    .contents()
    .toArray()
    .map(
      (child: AnyNode, index: number): RenderResult =>
        renderLooseNode(root, child, [...path, index], plan, skipClasses),
    );
  const children = combineResults(childResults);
  const visibleChildren = children.nodes.filter(
    (content: StructuredContent): boolean =>
      !(typeof content === "string" && content.trim().length === 0),
  );
  if (visibleChildren.length === 0) return emptyResult();
  return isBlockTag(element.tagName)
    ? renderResult([container("div", visibleChildren)], children.findings)
    : renderResult(visibleChildren, children.findings);
};

const renderLooseChildren = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
  skipClasses: readonly string[] = [],
): RenderResult =>
  combineResults(
    root(element)
      .contents()
      .toArray()
      .map(
        (node: AnyNode, index: number): RenderResult =>
          renderLooseNode(root, node, [...path, index], plan, skipClasses),
      ),
  );

const ownerElement = (root: cheerio.CheerioAPI): Element | undefined => {
  const mean = root("mean").first().get(0);
  if (mean !== undefined) return mean;
  const phrase = root(".dro").first().get(0);
  if (phrase !== undefined) return phrase;
  const rootNode = root.root().children().first().get(0);
  return rootNode === undefined ? undefined : rootNode;
};

export const renderCanonicalContent = (
  plan: CanonicalEntryPlan,
): Result<RenderedCanonicalContent, ConversionError> => {
  const root = cheerio.load(plan.source.ownerHtml, null, false);
  const owner = ownerElement(root);
  if (owner === undefined) {
    return {
      ok: false,
      error: {
        kind: "empty-canonical-definition",
        rowId: plan.source.rowId,
        term: plan.term,
      },
    };
  }

  const header = renderHeader(root, owner, plan);
  const definition = renderDefinitionSection(root, owner, plan);
  const origin = renderOrigin(root, owner, [2], plan);
  const related = renderRelated(root, owner, [3], plan);
  const phrases = renderPhrases(root, owner, [4], plan);
  const runOns = renderUndefinedRunOns(root, owner, [5], plan);
  const semanticNodes = [
    ...header.result.nodes,
    ...definition.nodes,
    ...origin.nodes,
    ...related.nodes,
    ...phrases.nodes,
    ...runOns.nodes,
  ];
  const handledSections = (element: Element): boolean =>
    root(element).is(
      '[data-id="definition"], [data-id="origin"], [data-id="related-to"]',
    ) ||
    hasClass(root, element, "dro") ||
    hasClass(root, element, "entry-header") ||
    hasClass(root, element, "headword-row");
  const loose = root(owner).is(".dro")
    ? emptyResult()
    : combineResults(
        root(owner)
          .children()
          .toArray()
          .filter((child: AnyNode): child is Element => child.type === "tag")
          .filter((child: Element): boolean => !handledSections(child))
          .map(
            (child: Element, index: number): RenderResult =>
              renderLooseNode(root, child, [index], plan),
          ),
      );
  const allNodes = [...semanticNodes, ...loose.nodes];
  const findings = [
    ...header.result.findings,
    ...definition.findings,
    ...origin.findings,
    ...related.findings,
    ...phrases.findings,
    ...runOns.findings,
    ...loose.findings,
  ];
  const content = container("div", allNodes, {
    data: unitData("mwu-entry", { level: 1, unit: "lexical-entry" }),
  });
  const visibleText = normalizeBlockText(nodeVisibleText(content));
  if (!isVisible(visibleText)) {
    return {
      ok: false,
      error: {
        kind: "empty-canonical-definition",
        rowId: plan.source.rowId,
        term: plan.term,
      },
    };
  }

  return {
    ok: true,
    value: {
      content,
      definitionTags: header.definitionTags,
      findings,
      visibleText,
    },
  };
};
