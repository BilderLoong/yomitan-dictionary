import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";
import type { CanonicalEntryPlan } from "../level1/types";
import type { Result } from "../shared/result";

export interface ConversionFinding {
  readonly kind: "unsupported-visible-subtree";
  readonly rowId: number;
  readonly term: string;
  readonly tagName: string;
  readonly classes: readonly string[];
  readonly sourcePosition: number;
  readonly preview: string;
}

export interface ConvertedCanonical {
  readonly plan: CanonicalEntryPlan;
  readonly content: StructuredContent;
  readonly findings: readonly ConversionFinding[];
}

export type ConversionError = {
  readonly kind: "empty-canonical-definition";
  readonly rowId: number;
  readonly term: string;
};

interface RenderResult {
  readonly nodes: readonly StructuredContent[];
  readonly findings: readonly ConversionFinding[];
  readonly visibleText: string;
}

const supportedTags = [
  "a",
  "br",
  "cxl-ref",
  "div",
  "dl",
  "dt",
  "em",
  "h1",
  "li",
  "mean",
  "ol",
  "p",
  "sb",
  "sen",
  "sense",
  "span",
  "strong",
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
  "audio-icon",
  "entry-header",
  "fl",
  "headword-row",
  "hword",
  "lbs",
  "play-pron",
  "prs",
  "search-toolbar",
  "sound",
  "uro",
  "vg-ins",
  "vr",
] as const;

const normalizeVisibleText = (text: string): string =>
  text.replace(/\s+/gu, " ").trim();

const classNames = (
  root: cheerio.CheerioAPI,
  element: Element,
): readonly string[] =>
  (root(element).attr("class") ?? "")
    .split(/\s+/u)
    .map((name: string): string => name.trim())
    .filter((name: string): boolean => name.length > 0);

const sourcePosition = (path: readonly number[]): number =>
  path.reduce(
    (position: number, part: number): number => position * 1000 + part,
    0,
  );

const asBlock = (
  tag: "div" | "br",
  content: readonly StructuredContent[],
): StructuredContent =>
  tag === "br" ? { tag: "br" } : { tag: "div", content: [...content] };

const renderText = (root: cheerio.CheerioAPI, node: AnyNode): RenderResult => {
  const text = normalizeVisibleText(root(node).text());
  return text.length === 0
    ? { nodes: [], findings: [], visibleText: "" }
    : { nodes: [text], findings: [], visibleText: text };
};

const renderUnsupported = (
  root: cheerio.CheerioAPI,
  element: Element,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  const visibleText = normalizeVisibleText(root(element).text());
  if (visibleText.length === 0) {
    return { nodes: [], findings: [], visibleText: "" };
  }

  return {
    nodes: [asBlock("div", [visibleText])],
    findings: [
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
    visibleText,
  };
};

const renderNode = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
  path: readonly number[],
  plan: CanonicalEntryPlan,
): RenderResult => {
  if (node.type === "text") return renderText(root, node);
  if (node.type !== "tag") {
    return { nodes: [], findings: [], visibleText: "" };
  }

  const element = node;
  const classes = classNames(root, element);
  if (
    classes.some((name: string): boolean =>
      ignoredClasses.some((ignored: string): boolean => ignored === name),
    )
  ) {
    return { nodes: [], findings: [], visibleText: "" };
  }

  if (
    !supportedTags.some(
      (supported: string): boolean => supported === element.tagName,
    )
  ) {
    return renderUnsupported(root, element, path, plan);
  }

  if (element.tagName === "br") {
    return { nodes: [asBlock("br", [])], findings: [], visibleText: " " };
  }

  const children = root(element)
    .contents()
    .toArray()
    .map(
      (child: AnyNode, index: number): RenderResult =>
        renderNode(root, child, [...path, index], plan),
    );
  const nodes = children.flatMap(
    ({ nodes: childNodes }: RenderResult): readonly StructuredContent[] =>
      childNodes,
  );
  const findings = children.flatMap(
    ({ findings: childFindings }: RenderResult): readonly ConversionFinding[] =>
      childFindings,
  );
  const visibleText = normalizeVisibleText(
    children
      .map(({ visibleText: childText }: RenderResult): string => childText)
      .filter((childText: string): boolean => childText.length > 0)
      .join(" "),
  );
  const isBlock = [
    "div",
    "dl",
    "dt",
    "dro",
    "li",
    "mean",
    "ol",
    "p",
    "sb",
    "sen",
    "sense",
    "table",
    "tbody",
    "td",
    "tr",
    "ul",
    "un",
    "uns",
  ].includes(element.tagName);

  return {
    nodes: isBlock && nodes.length > 0 ? [asBlock("div", nodes)] : nodes,
    findings,
    visibleText,
  };
};

export const convertCanonical = (
  plan: CanonicalEntryPlan,
): Result<ConvertedCanonical, ConversionError> => {
  const root = cheerio.load(plan.source.ownerHtml, null, false);
  const rendered = root
    .root()
    .contents()
    .toArray()
    .map(
      (node: AnyNode, index: number): RenderResult =>
        renderNode(root, node, [index], plan),
    );
  const nodes = rendered.flatMap(
    ({ nodes: childNodes }: RenderResult): readonly StructuredContent[] =>
      childNodes,
  );
  const findings = rendered.flatMap(
    ({ findings: childFindings }: RenderResult): readonly ConversionFinding[] =>
      childFindings,
  );
  const visibleText = rendered
    .map(({ visibleText: childText }: RenderResult): string => childText)
    .filter((childText: string): boolean => childText.length > 0)
    .join(" ");

  if (normalizeVisibleText(visibleText).length === 0) {
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
      plan,
      content: asBlock("div", nodes),
      findings,
    },
  };
};
