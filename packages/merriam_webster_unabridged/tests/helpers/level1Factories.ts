import type {
  AlternativeSpellingCanonicalEntryPlan,
  DrpPhraseCanonicalEntryPlan,
  LinkEvidence,
  MainCanonicalEntryPlan,
  OwnershipDecision,
  OwnershipRule,
  SoftLinkEntryPlan,
  SoftLinkEntryRelationship,
} from "../../src/level1/types";
import type {
  SourceIndex,
  SourceRow,
  SourceRowSummary,
} from "../../src/source/rows";
import { buildSourceIndex } from "../../src/source/rows";
import { alternate, definition, mean, phrase } from "./mwuHtml";

export const sourceRow = (
  id: number,
  decodedKey: string,
  html: string,
): SourceRow => ({
  id,
  encodedKey: encodeURIComponent(decodedKey),
  decodedKey,
  html,
});

export const sourceIndex = (rows: readonly SourceRowSummary[]): SourceIndex =>
  buildSourceIndex(rows);

export const decision = (
  searchableHeadword: string,
  rule: OwnershipRule,
  dedicatedRowId: number | null,
  meanIndex = 0,
): OwnershipDecision => ({
  rowId: 1,
  rowKey: "o",
  meanIndex,
  searchableHeadword,
  rule,
  dedicatedRowId,
});

export const mainCanonicalEntryPlan = (input: {
  readonly term: string;
  readonly ownerHtml?: string;
  readonly rowId?: number;
  readonly rowKey?: string;
}): MainCanonicalEntryPlan => ({
  kind: "main-canonical-entry",
  term: input.term,
  displayHeadword: input.term,
  source: {
    rowId: input.rowId ?? 1,
    rowKey: input.rowKey ?? input.term,
    meanIndex: 0,
    phraseIndex: null,
    ownerHtml:
      input.ownerHtml ??
      mean(input.term, definition(`${input.term} definition`)),
  },
});

export const canonicalMean = (
  term: string,
  body: string,
): AlternativeSpellingCanonicalEntryPlan => ({
  kind: "alternative-spelling-canonical-entry",
  term,
  displayHeadword: term,
  source: {
    rowId: 1,
    rowKey: term,
    meanIndex: 0,
    phraseIndex: null,
    ownerHtml: mean(term, body),
  },
});

export const drpPhraseCanonicalEntryPlan = (
  term: string,
  alternateTerm: string,
  qualifier: string,
): DrpPhraseCanonicalEntryPlan => ({
  kind: "drp-phrase-canonical-entry",
  term,
  parentTerm: "take",
  source: {
    rowId: 10,
    rowKey: "take",
    meanIndex: 0,
    phraseIndex: 0,
    ownerHtml: phrase(
      term,
      alternate(alternateTerm, qualifier, "") + definition("phrase meaning"),
    ),
  },
});

export const softLinkEntryPlan = (
  lookup: string,
  target: string,
  rules: readonly string[],
  relationship: SoftLinkEntryRelationship,
  evidence: readonly LinkEvidence[] = [],
): SoftLinkEntryPlan => ({
  kind: "soft-link-entry",
  relationship,
  lookup,
  target,
  rules: [...rules],
  evidence: [...evidence],
});

export const linkEvidence = (selector: string): LinkEvidence => ({
  rowId: 1,
  rowKey: "in",
  meanIndex: 0,
  phraseIndex: null,
  selector,
  qualifier: null,
  localText: selector,
});
