import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

import type { Result } from "../shared/result";
import type {
  AlternativeSpellingCanonicalEntryPlan,
  CanonicalSource,
  DrpPhraseCanonicalEntryPlan,
  MainCanonicalEntryPlan,
  OwnershipDecision,
} from "./types";

type MeanCanonicalEntryPlan =
  | MainCanonicalEntryPlan
  | AlternativeSpellingCanonicalEntryPlan;

export type SoftLinkEntryRelationship =
  | "main-to-alternative-spelling-soft-link"
  | "vr-mean-alternate-soft-link"
  | "phrase-alternate-soft-link"
  | "bare-affix-soft-link";

export interface LinkEvidence {
  readonly rowId: number;
  readonly rowKey: string;
  readonly meanIndex: number;
  readonly phraseIndex: number | null;
  readonly selector: string;
  readonly qualifier: string | null;
  readonly localText: string;
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
