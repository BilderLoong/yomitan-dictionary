import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

import {
  findSourceRows,
  type IndexedSourceRow,
  type SourceIndex,
  type SourceRow,
} from "../source/rows";
import type {
  CanonicalLexicalPlan,
  CanonicalPhrasePlan,
  CanonicalPlan,
  CanonicalPlanningResult,
  Level1Finding,
  OwnershipDecision,
  OwnershipRule,
} from "./types";

interface HeadwordIdentity {
  readonly kind: "headword-identity";
  readonly searchableHeadword: string;
  readonly displayHeadword: string;
  readonly preview: string;
  readonly hasUnrecognizedMarkup: boolean;
}

interface MissingHeadwordIdentity {
  readonly kind: "missing-headword-identity";
  readonly preview: string;
}

type HeadwordInspection = HeadwordIdentity | MissingHeadwordIdentity;

interface MeanPlanningResult {
  readonly canonical: readonly CanonicalPlan[];
  readonly decisions: readonly OwnershipDecision[];
  readonly requiredDependencyIds: readonly number[];
  readonly findings: readonly Level1Finding[];
}

const isKnownHeadwordMarkup = (
  root: cheerio.CheerioAPI,
  element: Element,
): boolean => {
  if (element.tagName === "sup" || root(element).parents("sup").length > 0) {
    return true;
  }

  if (element.tagName !== "span") return false;

  return (
    root(element).hasClass("breakpoints") ||
    root(element).hasClass("breakpoint")
  );
};

const textWithoutHomographMarkup = (
  root: cheerio.CheerioAPI,
  node: AnyNode,
): string => {
  const current = root(node);
  if (current.is("sup")) return "";

  const children = current.contents().toArray();
  if (children.length === 0) return current.text();

  return children
    .map((child: AnyNode): string => textWithoutHomographMarkup(root, child))
    .join("");
};

const inspectHeadword = (headwordHtml: string): HeadwordInspection => {
  const root = cheerio.load(headwordHtml, null, false);
  const headword = root(".hword").first();
  const preview = headword.prop("outerHTML") ?? headwordHtml;

  if (headword.length === 0) {
    return { kind: "missing-headword-identity", preview };
  }

  const visibleWithoutHomograph = headword
    .contents()
    .toArray()
    .map((node: AnyNode): string => textWithoutHomographMarkup(root, node))
    .join("");
  const hasUnrecognizedMarkup = headword
    .find("*")
    .toArray()
    .some((element: Element): boolean => !isKnownHeadwordMarkup(root, element));

  const searchableHeadword = visibleWithoutHomograph
    .replaceAll("\u00b7", "")
    .trim();

  if (searchableHeadword.length === 0) {
    return { kind: "missing-headword-identity", preview };
  }

  return {
    kind: "headword-identity",
    searchableHeadword,
    displayHeadword: headword.text().trim(),
    preview,
    hasUnrecognizedMarkup,
  };
};

export const extractSearchableHeadword = (headwordHtml: string): string => {
  const inspection = inspectHeadword(headwordHtml);
  return inspection.kind === "headword-identity"
    ? inspection.searchableHeadword
    : "";
};

const ownershipRule = (
  searchableHeadword: string,
  row: SourceRow,
  dedicatedRows: readonly IndexedSourceRow[],
): OwnershipRule => {
  if (searchableHeadword === row.decodedKey) return "case-1-current-row";
  if (dedicatedRows.length > 0) return "case-3-dedicated-row";
  return "case-2-embedded";
};

const lexicalPlan = (
  row: SourceRow,
  meanIndex: number,
  ownerHtml: string,
  identity: HeadwordIdentity,
): CanonicalLexicalPlan => ({
  kind: "canonical-lexical",
  term: identity.searchableHeadword,
  displayHeadword: identity.displayHeadword,
  source: {
    rowId: row.id,
    rowKey: row.decodedKey,
    meanIndex,
    phraseIndex: null,
    ownerHtml,
  },
});

const headwordFinding = (
  row: SourceRow,
  meanIndex: number,
  preview: string,
): Level1Finding => ({
  kind: "headword-markup",
  rowId: row.id,
  meanIndex,
  preview,
});

const unresolvedOwnershipDecision = (
  row: SourceRow,
  meanIndex: number,
): OwnershipDecision => ({
  rowId: row.id,
  rowKey: row.decodedKey,
  meanIndex,
  searchableHeadword: null,
  rule: "unresolved-headword",
  dedicatedRowId: null,
});

const phraseOwnerElements = (
  root: cheerio.CheerioAPI,
  phrase: Element,
): readonly Element[] => [phrase, ...root(phrase).nextUntil(".drp").toArray()];

const phraseOwnerHtml = (root: cheerio.CheerioAPI, phrase: Element): string => {
  const parent = root(phrase).parent();
  const parentElement = parent.get(0);
  const parentHtml = parent.prop("outerHTML") ?? "";
  const parentInnerHtml = parent.html() ?? "";
  const ownedHtml = phraseOwnerElements(root, phrase)
    .map((element: Element): string => root(element).prop("outerHTML") ?? "")
    .join("");

  if (parentElement === undefined) return ownedHtml;

  const closingHtml = `</${parentElement.tagName}>`;
  const openingLength =
    parentHtml.length - parentInnerHtml.length - closingHtml.length;

  if (openingLength < 0) return ownedHtml;

  return parentHtml.slice(0, openingLength) + ownedHtml + closingHtml;
};

const hasLocalDefinition = (
  root: cheerio.CheerioAPI,
  phrase: Element,
): boolean =>
  phraseOwnerElements(root, phrase).some((element: Element): boolean => {
    const localElement = root(element);
    return localElement.is(".dt") || localElement.find(".dt").length > 0;
  });

const planPhrases = (
  root: cheerio.CheerioAPI,
  mean: Element,
  meanIndex: number,
  row: SourceRow,
  parentTerm: string,
): readonly CanonicalPhrasePlan[] =>
  root(mean)
    .find(".dro > .drp")
    .toArray()
    .flatMap(
      (
        phrase: Element,
        phraseIndex: number,
      ): readonly CanonicalPhrasePlan[] => {
        const term = root(phrase).text().trim();
        if (term.length === 0 || !hasLocalDefinition(root, phrase)) return [];

        return [
          {
            kind: "canonical-phrase",
            term,
            parentTerm,
            source: {
              rowId: row.id,
              rowKey: row.decodedKey,
              meanIndex,
              phraseIndex,
              ownerHtml: phraseOwnerHtml(root, phrase),
            },
          },
        ];
      },
    );

const planMean = (
  root: cheerio.CheerioAPI,
  mean: Element,
  meanIndex: number,
  row: SourceRow,
  index: SourceIndex,
): MeanPlanningResult => {
  const owner = root(mean);
  const ownerHtml = owner.prop("outerHTML") ?? "";
  const headwordHtml = owner.find(".hword").first().prop("outerHTML") ?? "";
  const identity = inspectHeadword(headwordHtml);

  if (identity.kind === "missing-headword-identity") {
    return {
      canonical: [],
      decisions: [unresolvedOwnershipDecision(row, meanIndex)],
      requiredDependencyIds: [],
      findings: [
        headwordFinding(
          row,
          meanIndex,
          identity.preview.length === 0 ? ownerHtml : identity.preview,
        ),
      ],
    };
  }

  const dedicatedRows = findSourceRows(index, identity.searchableHeadword);
  const rule = ownershipRule(identity.searchableHeadword, row, dedicatedRows);
  const dedicatedRow = dedicatedRows[0];
  const decision: OwnershipDecision = {
    rowId: row.id,
    rowKey: row.decodedKey,
    meanIndex,
    searchableHeadword: identity.searchableHeadword,
    rule,
    dedicatedRowId:
      rule === "case-3-dedicated-row" && dedicatedRow !== undefined
        ? dedicatedRow.id
        : null,
  };
  const findings = identity.hasUnrecognizedMarkup
    ? [headwordFinding(row, meanIndex, identity.preview)]
    : [];

  if (rule === "case-3-dedicated-row") {
    return {
      canonical: [],
      decisions: [decision],
      requiredDependencyIds: dedicatedRows.map(
        ({ id }: IndexedSourceRow): number => id,
      ),
      findings,
    };
  }

  const phrases = planPhrases(
    root,
    mean,
    meanIndex,
    row,
    identity.searchableHeadword,
  );

  return {
    canonical: [lexicalPlan(row, meanIndex, ownerHtml, identity), ...phrases],
    decisions: [decision],
    requiredDependencyIds: [],
    findings,
  };
};

const uniqueIds = (ids: readonly number[]): readonly number[] =>
  ids.filter(
    (id: number, position: number, allIds: readonly number[]): boolean =>
      allIds.indexOf(id) === position,
  );

export const planCanonicalOwners = (
  row: SourceRow,
  index: SourceIndex,
): CanonicalPlanningResult => {
  const root = cheerio.load(row.html, null, false);
  const plannedMeans = root("mean")
    .toArray()
    .map(
      (mean: Element, meanIndex: number): MeanPlanningResult =>
        planMean(root, mean, meanIndex, row, index),
    );

  return {
    canonical: plannedMeans.flatMap(
      ({ canonical }: MeanPlanningResult): readonly CanonicalPlan[] =>
        canonical,
    ),
    decisions: plannedMeans.flatMap(
      ({ decisions }: MeanPlanningResult): readonly OwnershipDecision[] =>
        decisions,
    ),
    requiredDependencyIds: uniqueIds(
      plannedMeans.flatMap(
        ({ requiredDependencyIds }: MeanPlanningResult): readonly number[] =>
          requiredDependencyIds,
      ),
    ),
    findings: [
      ...index.findings,
      ...plannedMeans.flatMap(
        ({ findings }: MeanPlanningResult): readonly Level1Finding[] =>
          findings,
      ),
    ],
  };
};
