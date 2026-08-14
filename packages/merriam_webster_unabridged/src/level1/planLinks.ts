import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { Result } from "../shared/result";
import {
  findSourceRows,
  type IndexedSourceRow,
  type SourceIndex,
  type SourceRow,
} from "../source/rows";
import type {
  AlternativeSpellingCanonicalEntryPlan,
  BareLookupError,
  CanonicalSource,
  ConfirmedAffixEvidence,
  DrpPhraseCanonicalEntryPlan,
  Level1Finding,
  LinkEvidence,
  LinkPlanningResult,
  LinkRejection,
  MainCanonicalEntryPlan,
  OwnershipDecision,
  SoftLinkEntryPlan,
} from "./types";

type MeanCanonicalEntryPlan =
  | MainCanonicalEntryPlan
  | AlternativeSpellingCanonicalEntryPlan;

const sameRules = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  left.every((rule: string, index: number): boolean => rule === right[index]);

const sameRoute = (
  left: SoftLinkEntryPlan,
  right: SoftLinkEntryPlan,
): boolean =>
  left.lookup === right.lookup &&
  left.target === right.target &&
  sameRules(left.rules, right.rules);

const mergeLink = (
  links: readonly SoftLinkEntryPlan[],
  next: SoftLinkEntryPlan,
): readonly SoftLinkEntryPlan[] => {
  const existingIndex = links.findIndex((link: SoftLinkEntryPlan): boolean =>
    sameRoute(link, next),
  );
  if (existingIndex < 0) return [...links, next];

  return links.map(
    (link: SoftLinkEntryPlan, index: number): SoftLinkEntryPlan =>
      index === existingIndex
        ? { ...link, evidence: [...link.evidence, ...next.evidence] }
        : link,
  );
};

const deduplicateLinks = (
  links: readonly SoftLinkEntryPlan[],
): readonly SoftLinkEntryPlan[] =>
  links.reduce<readonly SoftLinkEntryPlan[]>(mergeLink, []);

const isAlternativeSpellingCanonicalEntry = (
  decision: OwnershipDecision,
): boolean => decision.rule === "alternative-spelling-canonical-entry";

const mainToAlternativeSpellingEvidence = (
  decision: OwnershipDecision,
): LinkEvidence => ({
  rowId: decision.rowId,
  rowKey: decision.rowKey,
  meanIndex: decision.meanIndex,
  phraseIndex: null,
  selector: ".hword",
  qualifier: null,
  localText: decision.searchableHeadword,
});

// The rule chain is never empty: Yomitan ranks an exact match (no rules) above
// a dictionary-deinflection pull (any rules). An empty chain would make the
// pulled target tie with the exact spelling on the shortest-inflection-chain
// key and let the build-root popularity (100) put a different spelling first.
const mainToAlternativeSpellingSoftLink = (
  rowKey: string,
  decision: OwnershipDecision,
): SoftLinkEntryPlan => ({
  kind: "soft-link-entry",
  relationship: "main-to-alternative-spelling-soft-link",
  lookup: rowKey,
  target: decision.searchableHeadword,
  rules: ["alternative"],
  evidence: [mainToAlternativeSpellingEvidence(decision)],
});

interface AlternateRelation {
  readonly selector: ".va" | ".vr";
  readonly owner: cheerio.Cheerio<AnyNode>;
}

type AlternateDecision =
  | {
      readonly kind: "accepted";
      readonly link: SoftLinkEntryPlan;
    }
  | {
      readonly kind: "rejected";
      readonly rejection: LinkRejection;
    }
  | {
      readonly kind: "ignored";
    };

const alternateRelation = (
  root: cheerio.CheerioAPI,
  alternate: Element,
): AlternateRelation => {
  const relation = root(alternate).closest(".vr").first();
  const relationElement = relation.get(0);

  return relationElement === undefined
    ? { selector: ".va", owner: root(alternate) }
    : { selector: ".vr", owner: root(relationElement) };
};

const qualifierText = (relation: cheerio.Cheerio<AnyNode>): string | null => {
  const qualifier = relation.find(".vl").first().text().trim();
  return qualifier.length === 0 ? null : qualifier;
};

const alternateEvidence = (
  source: CanonicalSource,
  relation: AlternateRelation,
): LinkEvidence => ({
  rowId: source.rowId,
  rowKey: source.rowKey,
  meanIndex: source.meanIndex,
  phraseIndex: source.phraseIndex,
  selector: relation.selector,
  qualifier: qualifierText(relation.owner),
  localText: relation.owner.text().trim(),
});

const planAlternate = (
  source: CanonicalSource,
  alternate: Element,
  root: cheerio.CheerioAPI,
  target: string,
  relationship: "vr-mean-alternate-soft-link" | "phrase-alternate-soft-link",
  rules: readonly string[],
): AlternateDecision => {
  const lookup = root(alternate).text().trim();
  if (lookup.length === 0 || lookup === target) return { kind: "ignored" };

  const relation = alternateRelation(root, alternate);
  const evidence = [alternateEvidence(source, relation)];

  if (relation.owner.find(".dt").length > 0) {
    return {
      kind: "rejected",
      rejection: {
        kind: "alternate-distinct-meaning",
        lookup,
        target,
        evidence,
      },
    };
  }

  return {
    kind: "accepted",
    link: {
      kind: "soft-link-entry",
      relationship,
      lookup,
      target,
      rules: [...rules],
      evidence,
    },
  };
};

const collectAlternateDecisions = (
  decisions: readonly AlternateDecision[],
): LinkPlanningResult => ({
  softLinkEntries: deduplicateLinks(
    decisions.flatMap(
      (decision: AlternateDecision): readonly SoftLinkEntryPlan[] =>
        decision.kind === "accepted" ? [decision.link] : [],
    ),
  ),
  rejections: decisions.flatMap(
    (decision: AlternateDecision): readonly LinkRejection[] =>
      decision.kind === "rejected" ? [decision.rejection] : [],
  ),
});

const planLocalAlternates = (
  source: CanonicalSource,
  target: string,
  relationship: "vr-mean-alternate-soft-link" | "phrase-alternate-soft-link",
  rules: readonly string[],
  isLocal: (root: cheerio.CheerioAPI, alternate: Element) => boolean,
): LinkPlanningResult => {
  const root = cheerio.load(source.ownerHtml, null, false);
  const decisions = root(".va")
    .toArray()
    .filter((alternate: Element): boolean => isLocal(root, alternate))
    .map(
      (alternate: Element): AlternateDecision =>
        planAlternate(source, alternate, root, target, relationship, rules),
    );

  return collectAlternateDecisions(decisions);
};

const isMeanLocalAlternate = (
  root: cheerio.CheerioAPI,
  alternate: Element,
): boolean => root(alternate).parents(".dro, .uro").length === 0;

const isPhraseLocalAlternate = (
  root: cheerio.CheerioAPI,
  alternate: Element,
): boolean => root(alternate).parents(".uro").length === 0;

export const planMainToAlternativeSpellingSoftLinks = (input: {
  readonly rowKey: string;
  readonly decisions: readonly OwnershipDecision[];
}): readonly SoftLinkEntryPlan[] =>
  deduplicateLinks(
    input.decisions
      .filter(isAlternativeSpellingCanonicalEntry)
      .filter(
        (decision: OwnershipDecision): boolean =>
          decision.searchableHeadword !== input.rowKey,
      )
      .map(
        (decision: OwnershipDecision): SoftLinkEntryPlan =>
          mainToAlternativeSpellingSoftLink(input.rowKey, decision),
      ),
  );

export const planVrMeanAlternateSoftLinks = (
  plan: MeanCanonicalEntryPlan,
): LinkPlanningResult =>
  planLocalAlternates(
    plan.source,
    plan.term,
    "vr-mean-alternate-soft-link",
    ["alternative"],
    isMeanLocalAlternate,
  );

export const planPhraseAlternateSoftLinks = (
  plan: DrpPhraseCanonicalEntryPlan,
): LinkPlanningResult =>
  planLocalAlternates(
    plan.source,
    plan.term,
    "phrase-alternate-soft-link",
    ["alternative"],
    isPhraseLocalAlternate,
  );

export const deriveBareLookup = (
  marked: string,
): Result<string, BareLookupError> => {
  const hasLeadingMarker = marked.startsWith("-");
  const hasTrailingMarker = marked.endsWith("-");
  if (!hasLeadingMarker && !hasTrailingMarker) {
    return { ok: false, error: { kind: "not-confirmed-affix" } };
  }

  const bare = marked.slice(
    hasLeadingMarker ? 1 : 0,
    hasTrailingMarker ? -1 : marked.length,
  );
  return bare.length > 0
    ? { ok: true, value: bare }
    : { ok: false, error: { kind: "not-confirmed-affix" } };
};

const bareAffixSoftLink = (
  affix: ConfirmedAffixEvidence,
): readonly SoftLinkEntryPlan[] => {
  const derived = deriveBareLookup(affix.marked);
  if (!derived.ok || derived.value !== affix.bare) return [];

  return [
    {
      kind: "soft-link-entry",
      relationship: "bare-affix-soft-link",
      lookup: derived.value,
      target: affix.target,
      rules: ["alternative"],
      evidence: [affix.evidence],
    },
  ];
};

const mergeBareAffixSoftLink = (
  links: readonly SoftLinkEntryPlan[],
  next: SoftLinkEntryPlan,
): readonly SoftLinkEntryPlan[] => {
  const sourceRouteIndex = links.findIndex(
    (link: SoftLinkEntryPlan): boolean =>
      link.relationship === "main-to-alternative-spelling-soft-link" &&
      link.lookup === next.lookup &&
      link.target === next.target,
  );
  if (sourceRouteIndex < 0) return mergeLink(links, next);

  return links.map(
    (link: SoftLinkEntryPlan, index: number): SoftLinkEntryPlan =>
      index === sourceRouteIndex
        ? { ...link, evidence: [...link.evidence, ...next.evidence] }
        : link,
  );
};

export const deriveBareAffixSoftLinks = (
  existingLinks: readonly SoftLinkEntryPlan[],
  affixes: readonly ConfirmedAffixEvidence[],
): LinkPlanningResult => ({
  softLinkEntries: affixes
    .flatMap(bareAffixSoftLink)
    .reduce<readonly SoftLinkEntryPlan[]>(mergeBareAffixSoftLink, [
      ...existingLinks,
    ]),
  rejections: [],
});

type CxlRefTargetParse =
  | {
      readonly kind: "valid";
      readonly target: string;
      readonly homographNumber: string | null;
    }
  | { readonly kind: "missing" }
  | { readonly kind: "unsupported"; readonly href: string };

const parseCxlRefTarget = (href: string | null): CxlRefTargetParse => {
  if (href === null) return { kind: "missing" };
  if (!href.startsWith("bword://")) return { kind: "unsupported", href };
  const withoutScheme = href.slice("bword://".length);
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutScheme);
  } catch {
    decoded = withoutScheme;
  }
  const homographNumber = decoded.match(/\[(\d+)\]$/u)?.[1] ?? null;
  const target = decoded.replace(/\[\d+\]$/, "");
  if (target.length === 0) return { kind: "missing" };
  return { kind: "valid", target, homographNumber };
};

export interface CxlRefPlanningResult {
  readonly links: readonly SoftLinkEntryPlan[];
  readonly requiredDependencyIds: readonly number[];
  readonly findings: readonly Level1Finding[];
}

export interface CxlRefInput {
  readonly root: cheerio.CheerioAPI;
  readonly mean: Element;
  readonly meanIndex: number;
  readonly lookup: string;
  readonly row: SourceRow;
  readonly index: SourceIndex;
}

interface CxlRefReference {
  readonly relation: string;
  readonly preview: string;
}

const inspectCxlRef = (
  root: cheerio.CheerioAPI,
  reference: Element,
): CxlRefReference => ({
  relation: root(reference).find(".cxl").first().text().trim(),
  preview: root(reference).prop("outerHTML") ?? "",
});

type CxlRefDecision =
  | {
      readonly kind: "link";
      readonly link: SoftLinkEntryPlan;
      readonly dependencyIds: readonly number[];
    }
  | {
      readonly kind: "finding";
      readonly finding: Level1Finding;
    };

type CxlRefFindingReason =
  | "empty-relation"
  | "orphan-continuation"
  | "missing-target-href"
  | "unsupported-target-href"
  | "self-link"
  | "target-row-absent";

const cxlRefNotEmittedFinding = (
  input: CxlRefInput,
  reference: CxlRefReference,
  referenceIndex: number,
  targetIndex: number,
  reason: CxlRefFindingReason,
  target: string | null,
  homographNumber: string | null,
  effectiveRelation: string | null,
): Level1Finding => ({
  kind: "cxl-ref-not-emitted",
  rowId: input.row.id,
  meanIndex: input.meanIndex,
  referenceIndex,
  targetIndex,
  rawRelation: reference.relation.length === 0 ? null : reference.relation,
  effectiveRelation,
  target,
  homographNumber,
  reason,
  preview: reference.preview,
});

const CONTINUATION_PHRASES: ReadonlySet<string> = new Set([
  "or",
  "and",
  "or of",
  "and of",
]);

const normalizedRelation = (relation: string): string =>
  relation.replace(/\s+/gu, " ").trim().toLowerCase();

const isContinuationRelation = (relation: string): boolean =>
  CONTINUATION_PHRASES.has(normalizedRelation(relation));

const planCxlRefTarget = (
  input: CxlRefInput,
  reference: CxlRefReference,
  referenceIndex: number,
  targetIndex: number,
  anchor: Element,
  effectiveRule: string,
): CxlRefDecision => {
  const parsed = parseCxlRefTarget(input.root(anchor).attr("href") ?? null);

  if (parsed.kind === "missing") {
    return {
      kind: "finding",
      finding: cxlRefNotEmittedFinding(
        input,
        reference,
        referenceIndex,
        targetIndex,
        "missing-target-href",
        null,
        null,
        effectiveRule,
      ),
    };
  }

  if (parsed.kind === "unsupported") {
    return {
      kind: "finding",
      finding: cxlRefNotEmittedFinding(
        input,
        reference,
        referenceIndex,
        targetIndex,
        "unsupported-target-href",
        null,
        null,
        effectiveRule,
      ),
    };
  }

  if (parsed.target === input.lookup) {
    return {
      kind: "finding",
      finding: cxlRefNotEmittedFinding(
        input,
        reference,
        referenceIndex,
        targetIndex,
        "self-link",
        parsed.target,
        parsed.homographNumber,
        effectiveRule,
      ),
    };
  }

  const targetRows = findSourceRows(input.index, parsed.target);
  if (targetRows.length === 0) {
    return {
      kind: "finding",
      finding: cxlRefNotEmittedFinding(
        input,
        reference,
        referenceIndex,
        targetIndex,
        "target-row-absent",
        parsed.target,
        parsed.homographNumber,
        effectiveRule,
      ),
    };
  }

  return {
    kind: "link",
    link: {
      kind: "soft-link-entry",
      relationship: "cxl-ref-soft-link",
      lookup: input.lookup,
      target: parsed.target,
      rules: [effectiveRule],
      evidence: [
        {
          rowId: input.row.id,
          rowKey: input.row.decodedKey,
          meanIndex: input.meanIndex,
          phraseIndex: null,
          selector: ".cxl-ref",
          qualifier: null,
          localText: input.root(anchor).text().trim(),
          referenceIndex,
          targetIndex,
          rawRelation:
            reference.relation.length === 0 ? null : reference.relation,
          effectiveRelation: effectiveRule,
          ...(parsed.homographNumber === null
            ? {}
            : { targetHomographNumber: parsed.homographNumber }),
        },
      ],
    },
    dependencyIds: targetRows.map(({ id }: IndexedSourceRow): number => id),
  };
};

const planCxlRefTargets = (
  input: CxlRefInput,
  reference: Element,
  inspected: CxlRefReference,
  referenceIndex: number,
  effectiveRule: string,
): readonly CxlRefDecision[] => {
  const anchors = input.root(reference).find(".cxt").toArray();
  if (anchors.length === 0) {
    return [
      {
        kind: "finding",
        finding: cxlRefNotEmittedFinding(
          input,
          inspected,
          referenceIndex,
          0,
          "missing-target-href",
          null,
          null,
          effectiveRule,
        ),
      },
    ];
  }
  return anchors.map(
    (anchor: Element, targetIndex: number): CxlRefDecision =>
      planCxlRefTarget(
        input,
        inspected,
        referenceIndex,
        targetIndex,
        anchor,
        effectiveRule,
      ),
  );
};

interface CxlRefPlannedReference {
  readonly decisions: readonly CxlRefDecision[];
  readonly lastCompleteRelation: string | null;
}

const planCxlRefBlockedTargets = (
  input: CxlRefInput,
  reference: Element,
  inspected: CxlRefReference,
  referenceIndex: number,
  reason: CxlRefFindingReason,
): readonly CxlRefDecision[] => {
  const anchors = input.root(reference).find(".cxt").toArray();
  if (anchors.length === 0) {
    return [
      {
        kind: "finding",
        finding: cxlRefNotEmittedFinding(
          input,
          inspected,
          referenceIndex,
          0,
          reason,
          null,
          null,
          null,
        ),
      },
    ];
  }
  return anchors.map((anchor: Element, targetIndex: number): CxlRefDecision => {
    const parsed = parseCxlRefTarget(input.root(anchor).attr("href") ?? null);
    return {
      kind: "finding",
      finding: cxlRefNotEmittedFinding(
        input,
        inspected,
        referenceIndex,
        targetIndex,
        reason,
        parsed.kind === "valid" ? parsed.target : null,
        parsed.kind === "valid" ? parsed.homographNumber : null,
        null,
      ),
    };
  });
};

const planCxlRefReference = (
  input: CxlRefInput,
  reference: Element,
  referenceIndex: number,
  lastCompleteRelation: string | null,
): CxlRefPlannedReference => {
  const inspected = inspectCxlRef(input.root, reference);

  if (inspected.relation.length === 0) {
    return {
      decisions: planCxlRefBlockedTargets(
        input,
        reference,
        inspected,
        referenceIndex,
        "empty-relation",
      ),
      lastCompleteRelation,
    };
  }

  if (isContinuationRelation(inspected.relation)) {
    if (lastCompleteRelation === null) {
      return {
        decisions: planCxlRefBlockedTargets(
          input,
          reference,
          inspected,
          referenceIndex,
          "orphan-continuation",
        ),
        lastCompleteRelation: null,
      };
    }
    return {
      decisions: planCxlRefTargets(
        input,
        reference,
        inspected,
        referenceIndex,
        lastCompleteRelation,
      ),
      lastCompleteRelation,
    };
  }

  return {
    decisions: planCxlRefTargets(
      input,
      reference,
      inspected,
      referenceIndex,
      inspected.relation,
    ),
    lastCompleteRelation: inspected.relation,
  };
};

interface CxlRefPlanningState {
  readonly lastCompleteRelation: string | null;
  readonly decisions: readonly CxlRefDecision[];
}

export const planCxlRefSoftLinks = (
  input: CxlRefInput,
): CxlRefPlanningResult => {
  const planned = input
    .root(input.mean)
    .find(".cxl-ref")
    .toArray()
    .reduce<CxlRefPlanningState>(
      (
        state: CxlRefPlanningState,
        reference: Element,
        referenceIndex: number,
      ): CxlRefPlanningState => {
        const result = planCxlRefReference(
          input,
          reference,
          referenceIndex,
          state.lastCompleteRelation,
        );
        return {
          lastCompleteRelation: result.lastCompleteRelation,
          decisions: [...state.decisions, ...result.decisions],
        };
      },
      { lastCompleteRelation: null, decisions: [] },
    );

  return {
    links: planned.decisions.flatMap(
      (decision: CxlRefDecision): readonly SoftLinkEntryPlan[] =>
        decision.kind === "link" ? [decision.link] : [],
    ),
    requiredDependencyIds: planned.decisions.flatMap(
      (decision: CxlRefDecision): readonly number[] =>
        decision.kind === "link" ? decision.dependencyIds : [],
    ),
    findings: planned.decisions.flatMap(
      (decision: CxlRefDecision): readonly Level1Finding[] =>
        decision.kind === "finding" ? [decision.finding] : [],
    ),
  };
};

const SPELLING_VARIANT_WORDS: ReadonlySet<string> = new Set([
  "variant",
  "variants",
  "spelling",
  "spellings",
]);

const isSpellingVariantRelation = (rules: readonly string[]): boolean =>
  rules.some((rule: string): boolean =>
    normalizedRelation(rule)
      .split(" ")
      .some((word: string): boolean => SPELLING_VARIANT_WORDS.has(word)),
  );

const isShadowedAlternate = (
  links: readonly SoftLinkEntryPlan[],
  link: SoftLinkEntryPlan,
): boolean =>
  (link.relationship === "vr-mean-alternate-soft-link" ||
    link.relationship === "phrase-alternate-soft-link") &&
  links.some(
    (candidate: SoftLinkEntryPlan): boolean =>
      candidate.relationship === "cxl-ref-soft-link" &&
      candidate.lookup === link.lookup &&
      candidate.target === link.target &&
      isSpellingVariantRelation(candidate.rules),
  );

const sameLookupTarget = (
  left: SoftLinkEntryPlan,
  right: SoftLinkEntryPlan,
): boolean => left.lookup === right.lookup && left.target === right.target;

export const replaceShadowedAlternateLinks = (
  links: readonly SoftLinkEntryPlan[],
): readonly SoftLinkEntryPlan[] => {
  const shadowedAlternates = links.filter((link: SoftLinkEntryPlan): boolean =>
    isShadowedAlternate(links, link),
  );

  return links
    .filter(
      (link: SoftLinkEntryPlan): boolean => !shadowedAlternates.includes(link),
    )
    .map(
      (link: SoftLinkEntryPlan): SoftLinkEntryPlan =>
        link.relationship === "cxl-ref-soft-link" &&
        isSpellingVariantRelation(link.rules) &&
        shadowedAlternates.some((shadowed: SoftLinkEntryPlan): boolean =>
          sameLookupTarget(link, shadowed),
        )
          ? {
              ...link,
              evidence: [
                ...link.evidence,
                ...shadowedAlternates
                  .filter((shadowed: SoftLinkEntryPlan): boolean =>
                    sameLookupTarget(link, shadowed),
                  )
                  .flatMap(
                    ({
                      evidence,
                    }: SoftLinkEntryPlan): readonly LinkEvidence[] => evidence,
                  ),
              ],
            }
          : link,
    );
};
