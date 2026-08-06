import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

import {
  findSourceRows,
  type IndexedSourceRow,
  type SourceIndex,
  type SourceRow,
} from "../source/rows";
import {
  type CxlRefPlanningResult,
  planCxlRefVariantSoftLinks,
} from "./planLinks";
import type {
  AlternativeSpellingCanonicalEntryPlan,
  CanonicalEntryPlan,
  CanonicalPlanningResult,
  DrpPhraseCanonicalEntryPlan,
  Level1Finding,
  MainCanonicalEntryPlan,
  OwnershipDecision,
  OwnershipRule,
  SoftLinkEntryPlan,
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
  readonly canonicalEntries: readonly CanonicalEntryPlan[];
  readonly decisions: readonly OwnershipDecision[];
  readonly requiredDependencyIds: readonly number[];
  readonly softLinkEntries: readonly SoftLinkEntryPlan[];
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
): OwnershipRule => {
  if (searchableHeadword === row.decodedKey) return "main-canonical-entry";
  return "alternative-spelling-canonical-entry";
};

const lexicalPlan = (
  row: SourceRow,
  meanIndex: number,
  ownerHtml: string,
  identity: HeadwordIdentity,
  kind:
    | MainCanonicalEntryPlan["kind"]
    | AlternativeSpellingCanonicalEntryPlan["kind"],
): MainCanonicalEntryPlan | AlternativeSpellingCanonicalEntryPlan => ({
  kind,
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

const unresolvedMeanFinding = (
  row: SourceRow,
  meanIndex: number,
  preview: string,
): Level1Finding => ({
  kind: "unresolved-mean",
  rowId: row.id,
  meanIndex,
  preview,
});

const definitionFreeMeanFinding = (
  row: SourceRow,
  meanIndex: number,
  preview: string,
): Level1Finding => ({
  kind: "definition-free-mean",
  rowId: row.id,
  meanIndex,
  preview,
});

const phraseOwnerElements = (
  root: cheerio.CheerioAPI,
  phrase: Element,
): readonly AnyNode[] => {
  const parentNodes = root(phrase).parent().contents().toArray();
  const phraseIndex = parentNodes.indexOf(phrase);
  if (phraseIndex < 0) return [phrase];

  const nextPhraseOffset = parentNodes
    .slice(phraseIndex + 1)
    .findIndex((node: AnyNode): boolean => root(node).is(".drp"));
  const endIndex =
    nextPhraseOffset < 0
      ? parentNodes.length
      : phraseIndex + 1 + nextPhraseOffset;

  return parentNodes.slice(phraseIndex, endIndex);
};

const phraseOwnerHtml = (root: cheerio.CheerioAPI, phrase: Element): string => {
  const parent = root(phrase).parent();
  const parentElement = parent.get(0);
  const parentHtml = parent.prop("outerHTML") ?? "";
  const parentInnerHtml = parent.html() ?? "";
  const ownedHtml = phraseOwnerElements(root, phrase)
    .map((node: AnyNode): string => root(node).toString())
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
  phraseOwnerElements(root, phrase).some((node: AnyNode): boolean => {
    const localElement = root(node);
    return localElement.is(".dt") || localElement.find(".dt").length > 0;
  });

const hasLocalMeanDefinition = (
  root: cheerio.CheerioAPI,
  mean: Element,
): boolean =>
  root(mean)
    .find(".dt")
    .toArray()
    .some(
      (definition: Element): boolean =>
        root(definition).closest(".dro").length === 0,
    );

const planPhrases = (
  root: cheerio.CheerioAPI,
  mean: Element,
  meanIndex: number,
  row: SourceRow,
  parentTerm: string,
): readonly DrpPhraseCanonicalEntryPlan[] =>
  root(mean)
    .find(".dro > .drp")
    .toArray()
    .flatMap(
      (
        phrase: Element,
        phraseIndex: number,
      ): readonly DrpPhraseCanonicalEntryPlan[] => {
        const term = root(phrase).text().trim();
        if (term.length === 0 || !hasLocalDefinition(root, phrase)) return [];

        return [
          {
            kind: "drp-phrase-canonical-entry",
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
      canonicalEntries: [],
      decisions: [],
      requiredDependencyIds: [],
      softLinkEntries: [],
      findings: [
        unresolvedMeanFinding(
          row,
          meanIndex,
          identity.preview.length === 0 ? ownerHtml : identity.preview,
        ),
      ],
    };
  }

  const phrases = planPhrases(
    root,
    mean,
    meanIndex,
    row,
    identity.searchableHeadword,
  );
  const hasMeanDefinition = hasLocalMeanDefinition(root, mean);
  const dedicatedRows = findSourceRows(index, identity.searchableHeadword);
  const rule = ownershipRule(identity.searchableHeadword, row);
  const dedicatedRow = dedicatedRows[0];
  const decision: OwnershipDecision = {
    rowId: row.id,
    rowKey: row.decodedKey,
    meanIndex,
    searchableHeadword: identity.searchableHeadword,
    rule,
    dedicatedRowId:
      rule === "alternative-spelling-canonical-entry" &&
      dedicatedRow !== undefined
        ? dedicatedRow.id
        : null,
  };
  const findings = identity.hasUnrecognizedMarkup
    ? [headwordFinding(row, meanIndex, identity.preview)]
    : [];
  const meanFindings = hasMeanDefinition
    ? findings
    : [...findings, definitionFreeMeanFinding(row, meanIndex, ownerHtml)];

  if (
    rule === "alternative-spelling-canonical-entry" &&
    dedicatedRows.length > 0
  ) {
    return {
      canonicalEntries: [],
      decisions: hasMeanDefinition ? [decision] : [],
      requiredDependencyIds: dedicatedRows.map(
        ({ id }: IndexedSourceRow): number => id,
      ),
      softLinkEntries: [],
      findings: meanFindings,
    };
  }

  if (!hasMeanDefinition) {
    const cxlRefResult: CxlRefPlanningResult = planCxlRefVariantSoftLinks({
      root,
      mean,
      meanIndex,
      lookup: identity.searchableHeadword,
      row,
      index,
    });
    const hasCxlRef = root(mean).find(".cxl-ref").length > 0;

    return {
      canonicalEntries: phrases,
      decisions: [],
      requiredDependencyIds: cxlRefResult.requiredDependencyIds,
      softLinkEntries: cxlRefResult.links,
      findings: hasCxlRef
        ? [...findings, ...cxlRefResult.findings]
        : meanFindings,
    };
  }

  return {
    canonicalEntries: [
      lexicalPlan(row, meanIndex, ownerHtml, identity, rule),
      ...phrases,
    ],
    decisions: [decision],
    requiredDependencyIds: [],
    softLinkEntries: [],
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
    canonicalEntries: plannedMeans.flatMap(
      ({
        canonicalEntries,
      }: MeanPlanningResult): readonly CanonicalEntryPlan[] => canonicalEntries,
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
    softLinkEntries: plannedMeans.flatMap(
      ({ softLinkEntries }: MeanPlanningResult): readonly SoftLinkEntryPlan[] =>
        softLinkEntries,
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
