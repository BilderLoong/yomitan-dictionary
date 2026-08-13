/**
 * Real-database audit of the accepted cxl-ref policy.
 *
 * Headline scope: Unabridged rows only. Rows whose encoded key is prefixed
 * with `collegiate_`, `medical_`, or `thesaurus_` are product twins and are
 * excluded, matching the build's Unabridged-only filter.
 *
 * The audit drives the real Level 1 planner (`planCanonicalOwners`) over every
 * Unabridged row, then aggregates the cxl-ref outcomes. Reference-level facts
 * (distinct phrases, continuations, secondary anchors) come from a structural
 * HTML pass that mirrors the planner's mean-level traversal.
 */
import Database from "bun:sqlite";
import * as cheerio from "cheerio";
import {
  extractSearchableHeadword,
  planCanonicalOwners,
} from "../src/level1/planCanonical";
import {
  planPhraseAlternateSoftLinks,
  planVrMeanAlternateSoftLinks,
} from "../src/level1/planLinks";
import type { SoftLinkEntryPlan } from "../src/level1/types";
import {
  buildSourceIndex,
  findSourceRows,
  type SourceRow,
  type SourceRowSummary,
} from "../src/source/rows";

const databasePath =
  "/Users/birudo/Projects/yomitan-dictionary/packages/merriam_webster_unabridged/assets/MWU.db";
const database = new Database(databasePath, { readonly: true });

const isUnabridgedKey = (encodedKey: string): boolean =>
  !encodedKey.startsWith("collegiate_") &&
  !encodedKey.startsWith("medical_") &&
  !encodedKey.startsWith("thesaurus_");

const CONTINUATION_PHRASES: ReadonlySet<string> = new Set([
  "or",
  "and",
  "or of",
  "and of",
]);

const normalizedRelation = (relation: string): string =>
  relation.replace(/\s+/gu, " ").trim().toLocaleLowerCase();

const isContinuationRelation = (relation: string): boolean =>
  CONTINUATION_PHRASES.has(normalizedRelation(relation));

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

interface DbRow {
  readonly id: number;
  readonly w: string;
  readonly m: string;
}

const summaries: SourceRowSummary[] = [];
for (const row of database
  .query<DbRow, []>("SELECT id, w, m FROM word")
  .iterate()) {
  summaries.push({ id: row.id, encodedKey: row.w });
}
const index = buildSourceIndex(summaries);

const decode = (encodedKey: string): string => {
  try {
    return decodeURIComponent(encodedKey);
  } catch {
    return encodedKey;
  }
};

let sourceRefs = 0;
let reachedRefs = 0;
let continuationRefs = 0;
let orphanContinuations = 0;
let secondaryAnchors = 0;
const phraseCounts = new Map<string, number>();

const cxlLinks: SoftLinkEntryPlan[] = [];
const alternateLinks: SoftLinkEntryPlan[] = [];
const canonicalTerms = new Set<string>();
const findingReasons = new Map<string, number>();
const secondaryFindingReasons = new Map<string, number>();
let plannedRows = 0;

const record = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

for (const dbRow of database
  .query<DbRow, []>("SELECT id, w, m FROM word")
  .iterate()) {
  if (!isUnabridgedKey(dbRow.w)) continue;

  const row: SourceRow = {
    id: dbRow.id,
    encodedKey: dbRow.w,
    decodedKey: decode(dbRow.w),
    html: dbRow.m,
  };

  if (dbRow.m.includes("cxl-ref")) {
    const root = cheerio.load(dbRow.m, null, false);
    for (const mean of root("mean").toArray()) {
      const owner = root(mean);
      const headwordHtml = owner.find(".hword").first().prop("outerHTML") ?? "";
      const searchableHeadword = extractSearchableHeadword(headwordHtml);
      const reachedByPlanner = searchableHeadword.length > 0;
      const hasMeanDefinition = owner
        .find(".dt")
        .toArray()
        .some(
          (definition: cheerio.Element): boolean =>
            root(definition).closest(".dro").length === 0,
        );
      const refs = owner.find(".cxl-ref").toArray();
      if (refs.length === 0) continue;
      const deferredAlternateSpelling =
        searchableHeadword !== row.decodedKey &&
        findSourceRows(index, searchableHeadword).length > 0;
      const isReached =
        reachedByPlanner && !hasMeanDefinition && !deferredAlternateSpelling;
      if (isReached) reachedRefs += refs.length;

      let lastComplete: string | null = null;
      for (const ref of refs) {
        const relation = root(ref).find(".cxl").first().text().trim();
        sourceRefs += 1;
        if (relation.length > 0) record(phraseCounts, relation);
        const anchors = root(ref).find(".cxt").toArray();
        if (anchors.length > 1) secondaryAnchors += anchors.length - 1;
        if (!isReached) continue;
        if (isContinuationRelation(relation)) {
          continuationRefs += 1;
          if (lastComplete === null) orphanContinuations += 1;
        } else if (relation.length > 0) {
          lastComplete = relation;
        }
      }
    }
  }

  const result = planCanonicalOwners(row, index);
  plannedRows += 1;
  for (const link of result.softLinkEntries) {
    if (link.relationship === "cxl-ref-soft-link") cxlLinks.push(link);
    else alternateLinks.push(link);
  }
  for (const finding of result.findings) {
    if (finding.kind !== "cxl-ref-not-emitted") continue;
    record(findingReasons, finding.reason);
    if (finding.targetIndex >= 1)
      record(secondaryFindingReasons, finding.reason);
  }
  for (const plan of result.canonicalEntries) {
    canonicalTerms.add(plan.term);
    const alternates =
      plan.kind === "drp-phrase-canonical-entry"
        ? planPhraseAlternateSoftLinks(plan).softLinkEntries
        : planVrMeanAlternateSoftLinks(plan).softLinkEntries;
    alternateLinks.push(...alternates);
  }
}

const softLinkKey = (link: SoftLinkEntryPlan): string =>
  `${link.lookup}\u0000${link.target}\u0000${link.rules.join("\u0000")}`;

const distinctRoutes = new Map<string, SoftLinkEntryPlan>();
for (const link of cxlLinks) distinctRoutes.set(softLinkKey(link), link);

const resolvedCxl = [...distinctRoutes.values()].filter(
  (link: SoftLinkEntryPlan): boolean => canonicalTerms.has(link.target),
);

const collisionPairs = new Set<string>();
for (const link of cxlLinks) {
  if (
    alternateLinks.some(
      (alternate: SoftLinkEntryPlan): boolean =>
        (alternate.relationship === "vr-mean-alternate-soft-link" ||
          alternate.relationship === "phrase-alternate-soft-link") &&
        alternate.lookup === link.lookup &&
        alternate.target === link.target,
    )
  ) {
    collisionPairs.add(`${link.lookup}\u0000${link.target}`);
  }
}

const shadowedPairs = [...collisionPairs].filter((key: string): boolean => {
  const [lookup, target] = key.split("\u0000");
  return cxlLinks.some(
    (link: SoftLinkEntryPlan): boolean =>
      link.lookup === lookup &&
      link.target === target &&
      isSpellingVariantRelation(link.rules),
  );
});

const distinctAlternates = new Map<string, SoftLinkEntryPlan>();
for (const link of alternateLinks) {
  distinctAlternates.set(softLinkKey(link), link);
}
const resolvedAlternates = [...distinctAlternates.values()].filter(
  (link: SoftLinkEntryPlan): boolean => canonicalTerms.has(link.target),
);
const shadowedAlternateKeys = [...distinctAlternates.keys()].filter(
  (key: string): boolean => {
    const [lookup, target] = key.split("\u0000");
    return [...distinctRoutes.values()].some(
      (link: SoftLinkEntryPlan): boolean =>
        link.lookup === lookup &&
        link.target === target &&
        isSpellingVariantRelation(link.rules),
    );
  },
);
const familyRecords =
  resolvedCxl.length +
  resolvedAlternates.filter(
    (link: SoftLinkEntryPlan): boolean =>
      !shadowedAlternateKeys.includes(softLinkKey(link)),
  ).length;

const sortedPhrases = [...phraseCounts.entries()].sort(
  (left: [string, number], right: [string, number]): number =>
    right[1] - left[1],
);

console.log(
  JSON.stringify(
    {
      scope: "unabridged-only",
      plannedRows,
      sourceRefs,
      reachedRefs,
      distinctPhrases: phraseCounts.size,
      continuationRefs,
      orphanContinuations,
      secondaryAnchors,
      rawCxlLinks: cxlLinks.length,
      distinctRoutes: distinctRoutes.size,
      resolvedCxlRecords: resolvedCxl.length,
      canonicalTerms: canonicalTerms.size,
      findingReasons: Object.fromEntries(findingReasons),
      secondaryFindingReasons: Object.fromEntries(secondaryFindingReasons),
      secondaryValid:
        secondaryAnchors -
        [...secondaryFindingReasons.values()].reduce(
          (total: number, count: number): number => total + count,
          0,
        ),
      collisionPairs: collisionPairs.size,
      shadowedPairs: shadowedPairs.length,
      resolvedAlternates: resolvedAlternates.length,
      shadowedAlternateLinks: shadowedAlternateKeys.length,
      familyRecords,
      topPhrases: sortedPhrases.slice(0, 30),
    },
    null,
    2,
  ),
);
