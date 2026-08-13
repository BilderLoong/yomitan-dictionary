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
      readonly kind: "cxl-ref-not-emitted";
      readonly rowId: number;
      readonly meanIndex: number;
      readonly referenceIndex: number;
      readonly targetIndex: number;
      readonly rawRelation: string | null;
      readonly effectiveRelation: string | null;
      readonly target: string | null;
      readonly homographNumber: string | null;
      readonly reason:
        | "empty-relation"
        | "orphan-continuation"
        | "missing-target-href"
        | "unsupported-target-href"
        | "self-link"
        | "target-row-absent";
      readonly preview: string;
    }
  | {
      readonly kind: "soft-link-target-not-emitted";
      readonly lookup: string;
      readonly target: string;
    }
  | {
      readonly kind: "non-unabridged-row-excluded";
      readonly rowId: number;
      readonly rowKey: string;
    };

export type SoftLinkEntryRelationship =
  | "main-to-alternative-spelling-soft-link"
  | "vr-mean-alternate-soft-link"
  | "phrase-alternate-soft-link"
  | "bare-affix-soft-link"
  | "cxl-ref-soft-link";

export interface LinkEvidence {
  readonly rowId: number;
  readonly rowKey: string;
  readonly meanIndex: number;
  readonly phraseIndex: number | null;
  readonly selector: string;
  readonly qualifier: string | null;
  readonly localText: string;
  /** Target homograph identity from the source href; report evidence only. */
  readonly targetHomographNumber?: string;
}

export interface SoftLinkEntryPlan {
  readonly kind: "soft-link-entry";
  readonly relationship: SoftLinkEntryRelationship;
  readonly lookup: string;
  readonly target: string;
  readonly rules: readonly string[];
  readonly evidence: readonly LinkEvidence[];
}

export interface LinkPlanningResult {
  readonly softLinkEntries: readonly SoftLinkEntryPlan[];
  readonly rejections: readonly LinkRejection[];
}

export interface ConfirmedAffixEvidence {
  readonly marked: string;
  readonly bare: string;
  readonly target: string;
  readonly evidence: LinkEvidence;
}

export type BareLookupError = {
  readonly kind: "not-confirmed-affix";
};

export interface LinkRejection {
  readonly kind: "alternate-distinct-meaning";
  readonly lookup: string;
  readonly target: string;
  readonly evidence: readonly LinkEvidence[];
}

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
  readonly softLinkEntries: readonly SoftLinkEntryPlan[];
  readonly findings: readonly Level1Finding[];
}
