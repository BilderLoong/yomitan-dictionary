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
    .replaceAll("¦", "ˈ");
  return cleaned.length === 0 ? "" : `/${cleaned}/`;
};

const formatFormPronunciation = (raw: string): string => {
  const cleaned = normalizeBlockText(raw)
    .replace(/^[\\/]+|[\\/]+$/gu, "")
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
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("variant-reference", { level: 6 }),
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
    const child = renderInlineChildren(root, element, path, plan, options);
    const relation = hasClass(root, element, "mw_t_mat")
      ? "origin"
      : hasClass(root, element, "mw_t_sx")
        ? "see"
        : hasClass(root, element, "mw_t_sc")
          ? "related"
          : hasClass(root, element, "mw_t_dxt")
            ? "compare"
            : hasClass(root, element, "cxt")
              ? "variant"
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

const renderAttribution = (
  root: cheerio.CheerioAPI,
  element: Element,
): StructuredContent | null => {
  const text = elementText(root, element);
  return isVisible(text)
    ? container("div", text, {
        data: unitData("example-source", { level: 6 }),
      })
    : null;
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
      .filter(
        (sentence: Element): boolean =>
          !hasClass(root, sentence, "aq") &&
          root(sentence).closest(".ex-sent-group").get(0) === group,
      ),
  );
  const attributions = groups.map(
    (group: Element): StructuredContent | null => {
      const aq = root(group)
        .find(".aq")
        .toArray()
        .find(
          (candidate: Element): boolean =>
            root(candidate).parents(".aq").length === 0,
        );
      return aq === undefined ? null : renderAttribution(root, aq);
    },
  );

  const examples = sentences.map(
    (sentence: Element, index: number): RenderResult => {
      const content = renderInlineChildren(
        root,
        sentence,
        [...path, index],
        plan,
        {
          stripLeadingArrow: true,
        },
      );
      const group = root(sentence).closest(".ex-sent-group").get(0);
      const source =
        group === undefined
          ? undefined
          : (attributions[groups.indexOf(group)] ?? undefined);
      return renderResult(
        [
          container(
            "div",
            source === undefined ? content.nodes : [...content.nodes, source],
            {
              data: unitData("example-sentence", { level: 6 }),
            },
          ),
        ],
        content.findings,
      );
    },
  );

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

const renderExampleGroup = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => renderExampleGroups(root, [element], path, plan);

const collectUsageNotes = (
  root: cheerio.CheerioAPI,
  element: Element,
): Element[] => root(element).find(".un").toArray();

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
      return renderResult(
        [
          container("div", [...spacedText, ...exampleResults.nodes], {
            data: unitData("usage-note", { level: 6 }),
          }),
        ],
        [...text.findings, ...exampleResults.findings],
      );
    },
  );
  return combineResults(usageNodes);
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
): RenderResult => {
  const results = root(element)
    .contents()
    .toArray()
    .map((child: AnyNode, index: number): RenderResult => {
      if (child.type === "tag" && hasClass(root, child, "ex-sent-group")) {
        return renderExampleGroup(root, child, [...path, index], plan);
      }
      if (child.type === "tag" && hasClass(root, child, "uns")) {
        return renderUsageNotes(root, child, [...path, index], plan);
      }
      if (child.type === "tag" && hasClass(root, child, "sdsense")) {
        return renderScopedDefinition(root, child, [...path, index], plan);
      }
      return renderInlineNode(root, child, [...path, index], plan);
    });
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
  const results = root(element)
    .contents()
    .toArray()
    .filter(
      (child: AnyNode): boolean =>
        child.type !== "tag" || !hasClass(root, child, "sn"),
    )
    .map((child: AnyNode, index: number): RenderResult => {
      if (child.type === "tag" && hasClass(root, child, "dt")) {
        return renderDefinitionFlow(root, child, [...path, index], plan);
      }
      if (child.type === "tag" && hasClass(root, child, "uns")) {
        return renderUsageNotes(root, child, [...path, index], plan);
      }
      if (child.type === "tag" && hasClass(root, child, "ex-sent-group")) {
        return renderExampleGroup(root, child, [...path, index], plan);
      }
      if (child.type === "tag" && hasClass(root, child, "sdsense")) {
        return renderScopedDefinition(root, child, [...path, index], plan);
      }
      return renderInlineNode(root, child, [...path, index], plan);
    });
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
  if (/^First Known Use:/u.test(elementText(root, node))) return emptyResult();
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
  const renderedBody =
    body === undefined
      ? renderLooseChildren(root, section, path, plan, ["toggle"])
      : renderLooseChildren(root, body, path, plan, ["toggle"]);
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

const renderPhraseSection = (
  root: cheerio.CheerioAPI,
  title: Element,
  bodyChildren: readonly AnyNode[],
  path: readonly number[],
  plan: CanonicalEntryPlan,
  embedded: boolean,
): RenderResult => {
  const bodyResults = bodyChildren.map(
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
      if (child.type === "tag" && hasClass(root, child, "ex-sent-group")) {
        return renderExampleGroup(root, child, [...path, index], plan);
      }
      if (child.type === "tag" && hasClass(root, child, "vr")) {
        return renderAlternateForm(root, child);
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
  return renderResult(
    [
      container(
        "details",
        [
          container("summary", container("span", elementText(root, title))),
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
    const readings = root(element)
      .find(".mw")
      .toArray()
      .map((reading: Element): string =>
        formatFormPronunciation(elementText(root, reading)),
      )
      .filter((reading: string): boolean => reading.length > 0);
    return renderResult([
      container("span", readings.join(", "), {
        data: unitData("form-pronunciation", { level: 1 }),
      }),
    ]);
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
  const pronunciationText =
    prs === undefined
      ? ""
      : (() => {
          const pronunciationScope = (): readonly AnyNode[] => {
            const contents = root(prs).contents().toArray();
            if (root(prs).find(".last-slash").length > 0) return contents;
            // MWU sometimes leaves the header prs unterminated (no last
            // slash) and continues the pronunciation as loose siblings of
            // the prs in the same container, ending with the last slash.
            const parent = root(prs).parent().get(0);
            if (parent === undefined) return contents;
            const siblings = root(parent).contents().toArray();
            return siblings.slice(siblings.indexOf(prs));
          };
          let closed = false;
          const pronunciationPart = (child: AnyNode): string => {
            if (closed) return "";
            if (child.type === "text") {
              return child.data.trim().length === 0 ? "" : child.data;
            }
            if (child.type !== "tag") return "";
            if (hasClass(root, child, "first-slash")) return "";
            if (hasClass(root, child, "last-slash")) {
              closed = true;
              return "";
            }
            if (
              child.type === "tag" &&
              hasAnyClass(root, child, ignoredClasses) &&
              !hasClass(root, child, "addPunct")
            ) {
              return "";
            }
            if (hasClass(root, child, "prs")) {
              return root(child)
                .contents()
                .toArray()
                .map(pronunciationPart)
                .join("");
            }
            if (hasClass(root, child, "pr")) {
              const text = root(child).text();
              const annotated =
                root(child).find(".mw_t_it").length > 0 ||
                root(child).parents(".mw_t_it").length > 0;
              return annotated ? text : formatPronunciation(text);
            }
            return root(child).text();
          };
          return normalizeWhitespace(
            pronunciationScope()
              .map(pronunciationPart)
              .join("")
              .replace(/\/(?=\/)/gu, "/ "),
          ).trim();
        })();
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
    ...(pronunciationText.length === 0
      ? []
      : [
          container("span", pronunciationText, {
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
        : renderResult([
            container("div", headerNodes, {
              data: unitData("mwu-header", { level: 1 }),
            }),
          ]),
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
  if (
    element.tagName === "p" &&
    /^First Known Use:/u.test(elementText(root, element))
  ) {
    return emptyResult();
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
    return renderResult(
      [
        container("span", child.nodes, {
          data: unitData("variant-reference", { level: 6 }),
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
  const semanticNodes = [
    ...header.result.nodes,
    ...definition.nodes,
    ...origin.nodes,
    ...related.nodes,
    ...phrases.nodes,
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
