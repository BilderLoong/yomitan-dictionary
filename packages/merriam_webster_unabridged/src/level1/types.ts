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
    };

export interface CanonicalLexicalPlan {
  readonly kind: "canonical-lexical";
  readonly term: string;
  readonly displayHeadword: string;
  readonly source: CanonicalSource;
}

export interface CanonicalPhrasePlan {
  readonly kind: "canonical-phrase";
  readonly term: string;
  readonly parentTerm: string;
  readonly source: CanonicalSource;
}

export type CanonicalPlan = CanonicalLexicalPlan | CanonicalPhrasePlan;

export type OwnershipRule =
  | "case-1-current-row"
  | "case-2-embedded"
  | "case-3-dedicated-row";

export interface OwnershipDecision {
  readonly rowId: number;
  readonly rowKey: string;
  readonly meanIndex: number;
  readonly searchableHeadword: string;
  readonly rule: OwnershipRule;
  readonly dedicatedRowId: number | null;
}

export interface CanonicalPlanningResult {
  readonly canonical: readonly CanonicalPlan[];
  readonly decisions: readonly OwnershipDecision[];
  readonly requiredDependencyIds: readonly number[];
  readonly findings: readonly Level1Finding[];
}
