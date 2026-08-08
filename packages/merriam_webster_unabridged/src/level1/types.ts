import type { SourceKeyFinding } from "../source/rows";

export interface CanonicalSource {
  readonly rowId: number;
  readonly rowKey: string;
  readonly meanIndex: number;
  readonly phraseIndex: number | null;
  readonly ownerHtml: string;
}

export type Level1Finding =
  | SourceKeyFinding
  | {
      readonly kind: "headword-markup";
      readonly rowId: number;
      readonly meanIndex: number;
      readonly preview: string;
    }
  | {
      readonly kind: "unresolved-mean";
      readonly rowId: number;
      readonly meanIndex: number;
      readonly preview: string;
    }
  | {
      readonly kind: "definition-free-mean";
      readonly rowId: number;
      readonly meanIndex: number;
      readonly preview: string;
    }
  | {
      readonly kind: "soft-link-target-not-emitted";
      readonly lookup: string;
      readonly target: string;
    };

export interface MainCanonicalEntryPlan {
  readonly kind: "main-canonical-entry";
  readonly term: string;
  readonly displayHeadword: string;
  readonly source: CanonicalSource;
}

export interface AlternativeSpellingCanonicalEntryPlan {
  readonly kind: "alternative-spelling-canonical-entry";
  readonly term: string;
  readonly displayHeadword: string;
  readonly source: CanonicalSource;
}

export interface DrpPhraseCanonicalEntryPlan {
  readonly kind: "drp-phrase-canonical-entry";
  readonly term: string;
  readonly parentTerm: string;
  readonly source: CanonicalSource;
}

export type CanonicalEntryPlan =
  | MainCanonicalEntryPlan
  | AlternativeSpellingCanonicalEntryPlan
  | DrpPhraseCanonicalEntryPlan;

export type OwnershipRule =
  | "main-canonical-entry"
  | "alternative-spelling-canonical-entry";

export interface OwnershipDecision {
  readonly rowId: number;
  readonly rowKey: string;
  readonly meanIndex: number;
  readonly searchableHeadword: string;
  readonly rule: OwnershipRule;
  readonly dedicatedRowId: number | null;
}

export interface CanonicalPlanningResult {
  readonly canonicalEntries: readonly CanonicalEntryPlan[];
  readonly decisions: readonly OwnershipDecision[];
  readonly requiredDependencyIds: readonly number[];
  readonly findings: readonly Level1Finding[];
}
