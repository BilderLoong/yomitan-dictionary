import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { Result } from "../shared/result";
import {
  findSourceRows,
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
  SoftLinkEntryRelationship,
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

const mainToAlternativeSpellingSoftLink = (
  rowKey: string,
  decision: OwnershipDecision,
): SoftLinkEntryPlan => ({
  kind: "soft-link-entry",
  relationship: "main-to-alternative-spelling-soft-link",
  lookup: rowKey,
  target: decision.searchableHeadword,
  rules: [],
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

const VARIANT_RELATION_PHRASES: readonly string[] = [
  "variant spelling of",
  "variant of",
  "archaic variant of",
  "obsolete variant of",
  "dialectal variant of",
  "scottish variant of",
  "chiefly scottish variant of",
  "chiefly british spelling of",
];

const isApprovedVariantRelation = (relation: string): boolean =>
  VARIANT_RELATION_PHRASES.includes(relation.toLowerCase());

const cxlRefTargetFromHref = (href: string | null): string | null => {
  if (href === null) return null;
  const withoutScheme = href.startsWith("bword://")
    ? href.slice("bword://".length)
    : href;
  const target = withoutScheme.replace(/\[\d+\]$/, "");
  if (target.length === 0) return null;
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
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
  readonly target: string | null;
  readonly anchorText: string;
  readonly preview: string;
}

const inspectCxlRef = (
  root: cheerio.CheerioAPI,
  reference: Element,
): CxlRefReference => {
  const relation = root(reference).find(".cxl").first().text().trim();
  const anchor = root(reference).find(".cxt").first();
  return {
    relation,
    target: cxlRefTargetFromHref(anchor.attr("href") ?? null),
    anchorText: anchor.text().trim(),
    preview: root(reference).prop("outerHTML") ?? "",
  };
};

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

const cxlRefNotEmittedFinding = (
  input: CxlRefInput,
  reference: CxlRefReference,
  reason: "unapproved-relation" | "missing-target" | "self-link",
): Level1Finding => ({
  kind: "cxl-ref-not-emitted",
  rowId: input.row.id,
  meanIndex: input.meanIndex,
  relation: reference.relation.length === 0 ? null : reference.relation,
  target: reference.target,
  reason,
  preview: reference.preview,
});

const planCxlRefReference = (
  input: CxlRefInput,
  reference: Element,
): CxlRefDecision => {
  const inspected = inspectCxlRef(input.root, reference);

  if (
    inspected.relation.length === 0 ||
    !isApprovedVariantRelation(inspected.relation)
  ) {
    return {
      kind: "finding",
      finding: cxlRefNotEmittedFinding(input, inspected, "unapproved-relation"),
    };
  }

  if (inspected.target === null) {
    return {
      kind: "finding",
      finding: cxlRefNotEmittedFinding(input, inspected, "missing-target"),
    };
  }

  if (inspected.target === input.lookup) {
    return {
      kind: "finding",
      finding: cxlRefNotEmittedFinding(input, inspected, "self-link"),
    };
  }

  const targetRows = findSourceRows(input.index, inspected.target);
  if (targetRows.length === 0) {
    return {
      kind: "finding",
      finding: cxlRefNotEmittedFinding(input, inspected, "missing-target"),
    };
  }

  return {
    kind: "link",
    link: {
      kind: "soft-link-entry",
      relationship: "cxl-ref-variant-reference-soft-link",
      lookup: input.lookup,
      target: inspected.target,
      rules: [inspected.relation],
      evidence: [
        {
          rowId: input.row.id,
          rowKey: input.row.decodedKey,
          meanIndex: input.meanIndex,
          phraseIndex: null,
          selector: ".cxl-ref",
          qualifier: null,
          localText: inspected.anchorText,
        },
      ],
    },
    dependencyIds: targetRows.map(({ id }: IndexedSourceRow): number => id),
  };
};

export const planCxlRefVariantSoftLinks = (
  input: CxlRefInput,
): CxlRefPlanningResult => {
  const decisions = input
    .root(input.mean)
    .find(".cxl-ref")
    .toArray()
    .map(
      (reference: Element): CxlRefDecision =>
        planCxlRefReference(input, reference),
    );

  return {
    links: decisions.flatMap(
      (decision: CxlRefDecision): readonly SoftLinkEntryPlan[] =>
        decision.kind === "link" ? [decision.link] : [],
    ),
    requiredDependencyIds: decisions.flatMap(
      (decision: CxlRefDecision): readonly number[] =>
        decision.kind === "link" ? decision.dependencyIds : [],
    ),
    findings: decisions.flatMap(
      (decision: CxlRefDecision): readonly Level1Finding[] =>
        decision.kind === "finding" ? [decision.finding] : [],
    ),
  };
};

const isShadowedAlternate = (
  links: readonly SoftLinkEntryPlan[],
  link: SoftLinkEntryPlan,
): boolean =>
  (link.relationship === "vr-mean-alternate-soft-link" ||
    link.relationship === "phrase-alternate-soft-link") &&
  links.some(
    (candidate: SoftLinkEntryPlan): boolean =>
      candidate.relationship === "cxl-ref-variant-reference-soft-link" &&
      candidate.lookup === link.lookup &&
      candidate.target === link.target,
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
        link.relationship === "cxl-ref-variant-reference-soft-link" &&
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
