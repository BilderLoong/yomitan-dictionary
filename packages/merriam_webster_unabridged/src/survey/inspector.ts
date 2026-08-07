import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

import {
  CLASS_TO_UNIT,
  IGNORED_UNITS,
  KNOWN_TAGS,
  PRESENTATION_CLASSES,
  SEMANTIC_CONTAINERS,
  type UnitMapping,
} from "./catalog-data";

export type SurveySection = "interesting" | "notNeeded" | "notYetNoticed";

export type ParserStatus =
  | "recognized"
  | "partially-recognized"
  | "unrecognized";

export interface SurveyFinding {
  readonly word: string;
  readonly informationName: string;
  readonly unitLevel: number | null;
  readonly boundTo: string;
  readonly sourceSelectorOrTag: string;
  readonly ownerPath: string;
  readonly parserStatus: ParserStatus;
  readonly findingSection: SurveySection;
  readonly notes: string;
}

export interface WordSurvey {
  readonly word: string;
  readonly rowId: number | null;
  readonly findings: readonly SurveyFinding[];
}

export interface InventoryEntry {
  readonly selector: string;
  readonly unit: string | null;
  readonly status: ParserStatus;
  readonly section: SurveySection;
  readonly rowCount: number;
  readonly exampleWords: readonly string[];
}

export interface SurveyInventory {
  readonly wordCount: number;
  readonly entries: readonly InventoryEntry[];
  readonly unknownSelectors: readonly {
    readonly selector: string;
    readonly words: readonly string[];
  }[];
}

const elementSelector = (element: Element): string => {
  const classes = (element.attribs?.class ?? "").trim().replace(/\s+/gu, ".");
  return classes.length === 0
    ? element.tagName
    : `${element.tagName}.${classes}`;
};

const ownerPathOf = (_root: cheerio.CheerioAPI, element: Element): string => {
  const segments: string[] = [];
  let current: AnyNode | null = element;
  while (current !== null && current.type === "tag" && segments.length < 12) {
    segments.unshift(elementSelector(current));
    const parent = (current as Element).parent;
    if (parent === null) break;
    const parentElement = parent.type === "tag" ? parent : null;
    if (
      parentElement !== null &&
      (parentElement.tagName === "mean" ||
        SEMANTIC_CONTAINERS.includes(
          parentElement.attribs?.class?.split(" ")[0] ?? "",
        ))
    ) {
      segments.unshift(elementSelector(parentElement));
      break;
    }
    current = parentElement;
  }
  return segments.join(" > ");
};

const nearestSemanticOwner = (
  root: cheerio.CheerioAPI,
  element: Element,
): string => {
  const container = root(element)
    .parents()
    .toArray()
    .find((ancestor: Element): boolean => {
      const cls = ancestor.attribs?.class?.split(" ")[0] ?? "";
      return SEMANTIC_CONTAINERS.includes(cls) || ancestor.tagName === "mean";
    });
  return container === undefined ? "entry" : elementSelector(container);
};

const boundLevel = (
  root: cheerio.CheerioAPI,
  element: Element,
): number | null => {
  const owner = root(element).closest(
    "mean, .dro, .vg, .vd, .sb, .sense, .sen, .pseq, .dt, .un, .uns, .prs, .vg-ins, .headword-row, .related-to, .syn, .etymology, .illustrations, .ex-sent-group",
  );
  if (owner.length === 0) return null;
  const tag = owner.get(0)?.tagName ?? "";
  const cls = owner.attr("class")?.split(" ")[0] ?? "";
  if (
    tag === "mean" ||
    cls === "dro" ||
    cls === "prs" ||
    cls === "vg-ins" ||
    cls === "headword-row" ||
    cls === "related-to" ||
    cls === "syn" ||
    cls === "etymology" ||
    cls === "illustrations"
  )
    return 1;
  if (cls === "vd") return 2;
  if (cls === "vg" || cls === "sense" || cls === "sen" || cls === "pseq")
    return 3;
  if (cls === "sb") return 4;
  if (cls === "dt") return 5;
  if (cls === "un" || cls === "uns" || cls === "ex-sent-group") return 6;
  return null;
};

const classifyElement = (
  word: string,
  root: cheerio.CheerioAPI,
  element: Element,
): SurveyFinding | null => {
  const classes = (element.attribs?.class ?? "")
    .trim()
    .split(/\s+/u)
    .filter((c) => c.length > 0);
  const selector = elementSelector(element);
  const mapping = classes
    .map(
      (className: string): UnitMapping | undefined => CLASS_TO_UNIT[className],
    )
    .find((mapping: UnitMapping | undefined): boolean => mapping !== undefined);
  const tagKnown = KNOWN_TAGS.includes(element.tagName);
  const owner = nearestSemanticOwner(root, element);
  const level = boundLevel(root, element);

  if (mapping !== undefined) {
    const section: SurveySection = IGNORED_UNITS.includes(mapping.unit)
      ? "notNeeded"
      : "interesting";
    return {
      word,
      informationName: mapping.unit,
      unitLevel: mapping.level,
      boundTo: owner,
      sourceSelectorOrTag: selector,
      ownerPath: ownerPathOf(root, element),
      parserStatus: "recognized",
      findingSection: section,
      notes: "",
    };
  }

  const isPresentation = classes.some((className: string): boolean =>
    PRESENTATION_CLASSES.includes(className),
  );
  if (isPresentation) {
    return {
      word,
      informationName: "presentation",
      unitLevel: level,
      boundTo: owner,
      sourceSelectorOrTag: selector,
      ownerPath: ownerPathOf(root, element),
      parserStatus: "recognized",
      findingSection: "notNeeded",
      notes: "presentation or boundary wrapper",
    };
  }

  if (!tagKnown && element.tagName !== "text") {
    return {
      word,
      informationName: "unclassified-visible-content",
      unitLevel: level,
      boundTo: owner,
      sourceSelectorOrTag: selector,
      ownerPath: ownerPathOf(root, element),
      parserStatus: "unrecognized",
      findingSection: "notYetNoticed",
      notes: `unknown tag <${element.tagName}>`,
    };
  }

  return null;
};

const walkElements = (root: cheerio.CheerioAPI): readonly Element[] => {
  const elements: Element[] = [];
  const walk = (node: AnyNode): void => {
    if (node.type !== "tag") return;
    elements.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  for (const child of root.root().children().toArray()) walk(child);
  return elements;
};

export const inspectWordHtml = (
  word: string,
  rowId: number | null,
  html: string,
): WordSurvey => {
  const root = cheerio.load(html, null, false);
  const findings = walkElements(root)
    .map((element: Element): SurveyFinding | null =>
      classifyElement(word, root, element),
    )
    .filter(
      (finding: SurveyFinding | null): finding is SurveyFinding =>
        finding !== null,
    );

  return { word, rowId, findings };
};

const sortEntries = (
  entries: readonly InventoryEntry[],
): readonly InventoryEntry[] =>
  [...entries].sort((left: InventoryEntry, right: InventoryEntry): number => {
    if (left.selector < right.selector) return -1;
    if (left.selector > right.selector) return 1;
    return 0;
  });

export const buildInventory = (
  surveys: readonly WordSurvey[],
): SurveyInventory => {
  const bySelector = new Map<string, InventoryEntry>();
  for (const survey of surveys) {
    for (const finding of survey.findings) {
      const existing = bySelector.get(finding.sourceSelectorOrTag);
      const exampleWords = existing?.exampleWords ?? [];
      if (existing === undefined) {
        bySelector.set(finding.sourceSelectorOrTag, {
          selector: finding.sourceSelectorOrTag,
          unit: finding.informationName,
          status: finding.parserStatus,
          section: finding.findingSection,
          rowCount: 1,
          exampleWords: [...exampleWords, survey.word],
        });
      } else {
        bySelector.set(finding.sourceSelectorOrTag, {
          ...existing,
          rowCount: existing.rowCount + 1,
          exampleWords: existing.exampleWords.includes(survey.word)
            ? existing.exampleWords
            : [...existing.exampleWords, survey.word],
        });
      }
    }
  }

  const unknownSelectors = [...bySelector.values()]
    .filter((entry: InventoryEntry): boolean => entry.status === "unrecognized")
    .map((entry: InventoryEntry) => ({
      selector: entry.selector,
      words: entry.exampleWords,
    }));

  return {
    wordCount: surveys.length,
    entries: sortEntries([...bySelector.values()]),
    unknownSelectors,
  };
};
