import type Database from "bun:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Dictionary, DictionaryIndex } from "yomichan-dict-builder";
import type { TermInformation } from "yomichan-dict-builder/dist/types/yomitan/termbank";

import {
  type ConvertedCanonical,
  convertCanonical,
} from "../conversion/convertCanonical";
import {
  closeDependencies,
  type DependencyEdge,
} from "../level1/closeDependencies";
import { planCanonicalOwners } from "../level1/planCanonical";
import {
  type ConfirmedAffixEvidence,
  deriveBareAffixSoftLinks,
  deriveBareLookup,
  type LinkEvidence,
  type LinkRejection,
  planMainToAlternativeSpellingSoftLinks,
  planPhraseAlternateSoftLinks,
  planVrMeanAlternateSoftLinks,
  replaceShadowedAlternateLinks,
} from "../level1/planLinks";
import type {
  CanonicalEntryPlan,
  Level1Finding,
  OwnershipDecision,
  SoftLinkEntryPlan,
} from "../level1/types";
import {
  buildSourceIndex,
  findSourceRows,
  type IndexedSourceRow,
  type SourceIndex,
  type SourceRow,
  type SourceRowSummary,
} from "../source/rows";
import {
  listSourceRowSummaries,
  loadSourceRow,
  openSourceDatabase,
} from "../source/sqlite";
import {
  assembleCanonicalRecord,
  assembleSoftLinkRecord,
} from "../yomitan/assembleRecords";
import {
  type BuildFatalError,
  type BuildReport,
  createBuildReport,
} from "./report";

export interface BuildPaths {
  readonly outputDirectory: string;
  readonly reportPath: string;
  readonly stylesPath: string;
}

export interface BuildRequest {
  readonly requestedWords: readonly string[];
  readonly databasePath: string;
  readonly buildPaths: BuildPaths;
  readonly sourceIndex?: SourceIndex;
  /** Build every row of the source database instead of selected words. */
  readonly fullDatabase?: boolean;
}

export type BuildAttempt =
  | {
      readonly ok: true;
      readonly archivePath: string;
      readonly report: BuildReport;
      readonly records: readonly TermInformation[];
    }
  | {
      readonly ok: false;
      readonly report: BuildReport;
    };

const archiveFileName = "Merriam Webster Unabridged.zip";
const archiveReportPath = archiveFileName;

/**
 * Every build covers the Unabridged entries only. Rows prefixed with
 * another Merriam-Webster product key (`collegiate_`, `medical_`,
 * `thesaurus_`) are condensed twin entries of words already present in the
 * Unabridged; planning them doubles the corpus, and their embedded means
 * defer to definition-free dedicated rows, producing unresolvable soft-link
 * targets.
 */
const isUnabridgedRow = (row: SourceRowSummary): boolean =>
  !row.encodedKey.startsWith("collegiate_") &&
  !row.encodedKey.startsWith("medical_") &&
  !row.encodedKey.startsWith("thesaurus_");

interface PlannedRow {
  readonly row: IndexedSourceRow;
  readonly canonicalEntries: readonly CanonicalEntryPlan[];
  readonly decisions: readonly OwnershipDecision[];
  readonly requiredDependencyIds: readonly number[];
  readonly softLinkEntries: readonly SoftLinkEntryPlan[];
  readonly findings: readonly Level1Finding[];
  readonly rejections: readonly LinkRejection[];
  readonly dependencyEdges: readonly DependencyEdge[];
}

interface PendingRow {
  readonly row: IndexedSourceRow;
  readonly rootWord: string | null;
  readonly dependencyTarget: string | null;
}

interface BuildState {
  readonly rootRows: readonly IndexedSourceRow[];
  readonly dependencyRows: readonly {
    readonly row: IndexedSourceRow;
    readonly reason: string;
  }[];
  readonly plannedRows: readonly PlannedRow[];
  readonly findings: readonly Level1Finding[];
  readonly rejections: readonly LinkRejection[];
  readonly errors: readonly BuildFatalError[];
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const softLinkKey = (link: SoftLinkEntryPlan): string =>
  `${link.lookup}\u0000${link.target}\u0000${link.rules.join("\u0000")}`;

const deduplicateSoftLinks = (
  links: readonly SoftLinkEntryPlan[],
): readonly SoftLinkEntryPlan[] => {
  const byKey = new Map<string, SoftLinkEntryPlan>();
  const indexByKey = new Map<string, number>();
  const merged: SoftLinkEntryPlan[] = [];

  for (const link of links) {
    const key = softLinkKey(link);
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, link);
      indexByKey.set(key, merged.length);
      merged.push(link);
      continue;
    }
    const combined: SoftLinkEntryPlan = {
      ...existing,
      evidence: [...existing.evidence, ...link.evidence],
    };
    byKey.set(key, combined);
    merged[indexByKey.get(key) as number] = combined;
  }

  return merged;
};

const createAffixEvidence = (
  link: SoftLinkEntryPlan,
): readonly ConfirmedAffixEvidence[] => {
  if (
    link.relationship !== "vr-mean-alternate-soft-link" &&
    link.relationship !== "phrase-alternate-soft-link"
  ) {
    return [];
  }

  const bare = deriveBareLookup(link.lookup);
  if (!bare.ok) return [];

  return link.evidence.map(
    (evidence: LinkEvidence): ConfirmedAffixEvidence => ({
      marked: link.lookup,
      bare: bare.value,
      target: link.target,
      evidence,
    }),
  );
};

const planRow = (row: SourceRow, index: SourceIndex): PlannedRow => {
  const canonicalResult = planCanonicalOwners(row, index);
  const alternateResults = canonicalResult.canonicalEntries.map(
    (plan: CanonicalEntryPlan) =>
      plan.kind === "drp-phrase-canonical-entry"
        ? planPhraseAlternateSoftLinks(plan)
        : planVrMeanAlternateSoftLinks(plan),
  );
  const localSoftLinkEntries = alternateResults.flatMap(
    ({
      softLinkEntries,
    }: {
      readonly softLinkEntries: readonly SoftLinkEntryPlan[];
    }): readonly SoftLinkEntryPlan[] => softLinkEntries,
  );
  const existingSoftLinkEntries = replaceShadowedAlternateLinks([
    ...canonicalResult.softLinkEntries,
    ...planMainToAlternativeSpellingSoftLinks({
      rowKey: row.decodedKey,
      decisions: canonicalResult.decisions,
    }),
    ...localSoftLinkEntries,
  ]);
  const affixEvidence = localSoftLinkEntries.flatMap(createAffixEvidence);
  const softLinkEntries = deduplicateSoftLinks(
    deriveBareAffixSoftLinks(existingSoftLinkEntries, affixEvidence)
      .softLinkEntries,
  );
  const findings = canonicalResult.findings.filter(
    (finding: Level1Finding): boolean => finding.kind !== "source-key-decode",
  );
  const rejections = alternateResults.flatMap(
    ({
      rejections: alternateRejections,
    }: {
      readonly rejections: readonly LinkRejection[];
    }): readonly LinkRejection[] => alternateRejections,
  );
  const dependencyEdges = canonicalResult.decisions.flatMap(
    (decision: OwnershipDecision): readonly DependencyEdge[] =>
      decision.dedicatedRowId === null
        ? []
        : [
            {
              fromRowId: decision.rowId,
              toRowId: decision.dedicatedRowId,
              target: decision.searchableHeadword,
            },
          ],
  );

  return {
    row: {
      id: row.id,
      encodedKey: row.encodedKey,
      decodedKey: row.decodedKey,
    },
    canonicalEntries: canonicalResult.canonicalEntries,
    decisions: canonicalResult.decisions,
    requiredDependencyIds: canonicalResult.requiredDependencyIds,
    softLinkEntries,
    findings,
    rejections,
    dependencyEdges,
  };
};

const addUniqueRow = (
  rows: readonly IndexedSourceRow[],
  next: IndexedSourceRow,
): readonly IndexedSourceRow[] =>
  rows.some(({ id }: IndexedSourceRow): boolean => id === next.id)
    ? rows
    : [...rows, next];

const resolveRootRows = (
  index: SourceIndex,
  requestedWords: readonly string[],
): {
  readonly rows: readonly IndexedSourceRow[];
  readonly missingWords: readonly string[];
} => {
  const rows = requestedWords.reduce(
    (resolvedRows: readonly IndexedSourceRow[], requested: string) =>
      findSourceRows(index, requested).reduce(addUniqueRow, resolvedRows),
    [],
  );
  const missingWords = requestedWords.filter(
    (word: string): boolean => findSourceRows(index, word).length === 0,
  );

  return { rows, missingWords };
};

const cxlRefDependencyLink = (
  planned: PlannedRow,
  dependencyId: number,
  index: SourceIndex,
): SoftLinkEntryPlan | undefined =>
  planned.softLinkEntries.find(
    (link: SoftLinkEntryPlan): boolean =>
      link.relationship === "cxl-ref-soft-link" &&
      findSourceRows(index, link.target).some(
        ({ id }: IndexedSourceRow): boolean => id === dependencyId,
      ),
  );

const dependencyReason = (
  planned: PlannedRow,
  dependencyId: number,
  index: SourceIndex,
): string => {
  const decision = planned.decisions.find(
    ({ dedicatedRowId }: OwnershipDecision): boolean =>
      dedicatedRowId === dependencyId,
  );
  if (decision !== undefined) {
    return `alternative-spelling-canonical-entry:${decision.searchableHeadword}`;
  }

  const cxlRefLink = cxlRefDependencyLink(planned, dependencyId, index);
  return cxlRefLink === undefined
    ? "canonical-dependency"
    : `cxl-ref-soft-link:${cxlRefLink.target}`;
};

const dependencyTarget = (
  planned: PlannedRow,
  dependencyId: number,
  index: SourceIndex,
): string => {
  const decision = planned.decisions.find(
    ({ dedicatedRowId }: OwnershipDecision): boolean =>
      dedicatedRowId === dependencyId,
  );
  if (decision !== undefined) return decision.searchableHeadword;

  const cxlRefLink = cxlRefDependencyLink(planned, dependencyId, index);
  return cxlRefLink?.target ?? String(dependencyId);
};

const planSelectedRows = (
  database: Database,
  index: SourceIndex,
  request: BuildRequest,
): BuildState => {
  const resolvedRoots =
    request.fullDatabase === true
      ? { rows: index.rows.filter(isUnabridgedRow), missingWords: [] }
      : resolveRootRows(index, request.requestedWords);
  const excludedRootRows = resolvedRoots.rows.filter(
    (row: IndexedSourceRow): boolean => !isUnabridgedRow(row),
  );
  const rootRows = resolvedRoots.rows.filter(isUnabridgedRow);
  const rootIds = new Set(
    rootRows.map(({ id }: IndexedSourceRow): number => id),
  );
  const pendingRows: PendingRow[] = rootRows.map(
    (row: IndexedSourceRow): PendingRow => ({
      row,
      rootWord: row.decodedKey,
      dependencyTarget: null,
    }),
  );
  const processedRowIds = new Set<number>();
  const plannedRows: PlannedRow[] = [];
  const dependencyRows: BuildState["dependencyRows"][number][] = [];
  const findings: Level1Finding[] = [
    ...index.findings,
    ...excludedRootRows.map(
      ({ id, decodedKey }: IndexedSourceRow): Level1Finding => ({
        kind: "non-unabridged-row-excluded",
        rowId: id,
        rowKey: decodedKey,
      }),
    ),
  ];
  const rejections: LinkRejection[] = [];
  const errors: BuildFatalError[] = resolvedRoots.missingWords.map(
    (word: string): BuildFatalError => ({ kind: "missing-root", word }),
  );

  let cursor = 0;
  while (cursor < pendingRows.length) {
    const pending = pendingRows[cursor];
    cursor += 1;
    if (pending === undefined || processedRowIds.has(pending.row.id)) {
      continue;
    }

    processedRowIds.add(pending.row.id);
    let row: SourceRow | null;
    try {
      row = loadSourceRow(database, pending.row.id);
    } catch (error: unknown) {
      row = null;
      errors.push({
        kind: "io",
        message: `Unable to load row ${pending.row.id}: ${errorMessage(error)}`,
      });
    }

    if (row === null) {
      errors.push(
        pending.dependencyTarget === null
          ? {
              kind: "missing-root",
              word: pending.rootWord ?? pending.row.decodedKey,
            }
          : {
              kind: "missing-dependency",
              target: pending.dependencyTarget,
            },
      );
      continue;
    }

    const planned = planRow(row, index);
    plannedRows.push(planned);
    findings.push(...planned.findings);
    rejections.push(...planned.rejections);

    for (const dependencyId of planned.requiredDependencyIds) {
      if (rootIds.has(dependencyId)) continue;

      const dependencyRow = index.rows.find(
        ({ id }: IndexedSourceRow): boolean => id === dependencyId,
      );
      if (dependencyRow === undefined) {
        errors.push({
          kind: "missing-dependency",
          target: dependencyTarget(planned, dependencyId, index),
        });
        continue;
      }

      if (!isUnabridgedRow(dependencyRow)) {
        findings.push({
          kind: "non-unabridged-row-excluded",
          rowId: dependencyId,
          rowKey: dependencyRow.decodedKey,
        });
        continue;
      }

      const reason = dependencyReason(planned, dependencyId, index);
      if (
        !dependencyRows.some(
          ({ row: existing }: BuildState["dependencyRows"][number]): boolean =>
            existing.id === dependencyId,
        )
      ) {
        dependencyRows.push({ row: dependencyRow, reason });
      }
      const isQueued = pendingRows.some(
        ({ row: queuedRow }: PendingRow): boolean =>
          queuedRow.id === dependencyId,
      );
      if (!isQueued && !processedRowIds.has(dependencyId)) {
        pendingRows.push({
          row: dependencyRow,
          rootWord: null,
          dependencyTarget: dependencyTarget(planned, dependencyId, index),
        });
      }
    }
  }

  const closure = closeDependencies({
    rootRowIds: [...rootIds],
    availableRowIds: index.rows.map(({ id }: IndexedSourceRow): number => id),
    edges: plannedRows.flatMap(
      ({ dependencyEdges }: PlannedRow): readonly DependencyEdge[] =>
        dependencyEdges,
    ),
  });
  if (!closure.ok) {
    errors.push(closure.error);
  }

  return {
    rootRows,
    dependencyRows,
    plannedRows,
    findings,
    rejections,
    errors,
  };
};

const validateTermInformation = (record: TermInformation): string | null => {
  if (record.length !== 8) return "term tuple must contain eight fields";
  if (record[0].length === 0) return "term must not be empty";
  if (record[1].length !== 0) return "reading must be empty";
  if (![100, 0, -100].includes(record[4])) {
    return "popularity must be 100, 0, or -100";
  }
  if (record[5].length === 0) return "term must contain a definition";
  return null;
};

const replaceSequence = (
  record: TermInformation,
  sequence: number,
): TermInformation => [
  record[0],
  record[1],
  record[2],
  record[3],
  record[4],
  record[5],
  sequence,
  record[7],
];

const canonicalPopularity = (
  term: string,
  rootWords: ReadonlySet<string>,
): number => (rootWords.has(term) ? 100 : 0);

const exportDictionary = async (
  records: readonly TermInformation[],
  outputDirectory: string,
  stylesPath: string,
): Promise<void> => {
  const index = new DictionaryIndex()
    .setTitle("Merriam Webster Unabridged")
    .setRevision("1.0.0-v1")
    .setAuthor("Birudo")
    .setDescription("Selected-word Merriam Webster Unabridged dictionary")
    .setAttribution("https://www.merriam-webster.com/")
    .setSequenced(true)
    .build();
  const dictionary = new Dictionary({ fileName: archiveFileName });

  await dictionary.setIndex(index, "", "");
  for (const record of records) {
    await dictionary.addTerm(record);
  }
  await dictionary.addFile(stylesPath, "styles.css");
  await dictionary.export(outputDirectory);
};

const writeReport = async (
  reportPath: string,
  report: BuildReport,
): Promise<true> => {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return true;
};

const createReport = (
  request: BuildRequest,
  state: BuildState,
  archivePath: string | null,
  conversions: readonly ConvertedCanonical[],
  errors: readonly BuildFatalError[],
  fullDatabase = false,
  recordCount = 0,
  conversionFindings = 0,
  softLinkCount = 0,
  extraFindings: readonly Level1Finding[] = [],
): BuildReport =>
  createBuildReport({
    requestedWords: request.requestedWords,
    rootRows: state.rootRows,
    dependencyRows: state.dependencyRows,
    decisions: state.plannedRows.flatMap(
      ({ decisions }: PlannedRow): readonly OwnershipDecision[] => decisions,
    ),
    canonicalEntryPlans: state.plannedRows.flatMap(
      ({ canonicalEntries }: PlannedRow): readonly CanonicalEntryPlan[] =>
        canonicalEntries,
    ),
    softLinkEntries: deduplicateSoftLinks(
      replaceShadowedAlternateLinks(
        state.plannedRows.flatMap(
          ({ softLinkEntries }: PlannedRow): readonly SoftLinkEntryPlan[] =>
            softLinkEntries,
        ),
      ),
    ),
    conversions,
    planningFindings: [...state.findings, ...extraFindings],
    linkRejections: state.rejections,
    errors,
    archivePath,
    fullDatabase,
    recordCount: fullDatabase ? recordCount : undefined,
    conversionFindings: fullDatabase ? conversionFindings : undefined,
    softLinkCount: fullDatabase ? softLinkCount : undefined,
  });

const buildSelectedDictionary = async (
  request: BuildRequest,
  database: Database,
): Promise<BuildAttempt> => {
  const fullDatabase = request.fullDatabase === true;
  const index =
    request.sourceIndex ?? buildSourceIndex(listSourceRowSummaries(database));
  const state = planSelectedRows(database, index, request);
  const canonicalEntryPlans = state.plannedRows.flatMap(
    ({ canonicalEntries }: PlannedRow): readonly CanonicalEntryPlan[] =>
      canonicalEntries,
  );
  const softLinkEntries = deduplicateSoftLinks(
    replaceShadowedAlternateLinks(
      state.plannedRows.flatMap(
        ({ softLinkEntries }: PlannedRow): readonly SoftLinkEntryPlan[] =>
          softLinkEntries,
      ),
    ),
  );
  const errors: BuildFatalError[] = [...state.errors];
  const rootWordSet = new Set(
    state.rootRows.map(
      ({ decodedKey }: IndexedSourceRow): string => decodedKey,
    ),
  );
  const canonicalTermSet = new Set<string>();
  const conversions: ConvertedCanonical[] = [];
  const canonicalRecords: TermInformation[] = [];
  const sequenceByTerm = new Map<string, number>();
  let convertedCount = 0;
  let conversionFindings = 0;

  for (const plan of canonicalEntryPlans) {
    const result = convertCanonical(plan);
    if (!result.ok) {
      errors.push(result.error);
      continue;
    }
    const converted = result.value;
    canonicalTermSet.add(converted.plan.term);
    const record = assembleCanonicalRecord(
      converted,
      convertedCount + 1,
      canonicalPopularity(converted.plan.term, rootWordSet),
    );
    convertedCount += 1;
    const sequence = sequenceByTerm.get(record[0]) ?? convertedCount;
    if (sequenceByTerm.get(record[0]) === undefined) {
      sequenceByTerm.set(record[0], sequence);
    }
    canonicalRecords.push(replaceSequence(record, sequence));
    conversionFindings += converted.findings.length;
    if (!fullDatabase) conversions.push(converted);
  }

  const softLinkTargetFindings: Level1Finding[] = [];
  const resolvedSoftLinkEntries: SoftLinkEntryPlan[] = [];
  for (const link of softLinkEntries) {
    if (canonicalTermSet.has(link.target)) {
      resolvedSoftLinkEntries.push(link);
      continue;
    }
    // The target spelling exists in the source but its dedicated row
    // emits no canonical entry (for example a definition-free variant
    // row). The link cannot resolve; drop it and stay auditable. This
    // applies to selected and full builds alike.
    softLinkTargetFindings.push({
      kind: "soft-link-target-not-emitted",
      lookup: link.lookup,
      target: link.target,
    });
  }

  const softLinkRecords = resolvedSoftLinkEntries.map(
    (link: SoftLinkEntryPlan, index: number): TermInformation =>
      assembleSoftLinkRecord(link, canonicalRecords.length + index + 1),
  );
  const records = [...canonicalRecords, ...softLinkRecords];
  for (const record of records) {
    const validationError = validateTermInformation(record);
    if (validationError !== null) {
      errors.push({
        kind: "schema",
        message: `${record[0]}: ${validationError}`,
      });
    }
  }

  const canExport = errors.length === 0;
  let report = createReport(
    request,
    state,
    canExport ? archiveReportPath : null,
    conversions,
    errors,
    fullDatabase,
    records.length,
    conversionFindings,
    resolvedSoftLinkEntries.length,
    softLinkTargetFindings,
  );
  try {
    await writeReport(request.buildPaths.reportPath, report);
  } catch (error: unknown) {
    errors.push({
      kind: "io",
      message: `Unable to write build report: ${errorMessage(error)}`,
    });
    report = createReport(
      request,
      state,
      null,
      conversions,
      errors,
      fullDatabase,
      records.length,
      conversionFindings,
      softLinkEntries.length,
    );
    try {
      await writeReport(request.buildPaths.reportPath, report);
    } catch (_reportError: unknown) {
      return { ok: false, report };
    }
    return { ok: false, report };
  }

  if (!canExport) return { ok: false, report };

  try {
    await mkdir(request.buildPaths.outputDirectory, { recursive: true });
    await exportDictionary(
      records,
      request.buildPaths.outputDirectory,
      request.buildPaths.stylesPath,
    );
  } catch (error: unknown) {
    errors.push({
      kind: "io",
      message: `Unable to export dictionary: ${errorMessage(error)}`,
    });
    report = createReport(
      request,
      state,
      null,
      conversions,
      errors,
      fullDatabase,
      records.length,
      conversionFindings,
      softLinkEntries.length,
    );
    try {
      await writeReport(request.buildPaths.reportPath, report);
    } catch (_reportError: unknown) {
      return { ok: false, report };
    }
    return { ok: false, report };
  }

  return {
    ok: true,
    archivePath: join(request.buildPaths.outputDirectory, archiveFileName),
    report,
    records,
  };
};

export const runBuild = async (
  request: BuildRequest,
): Promise<BuildAttempt> => {
  let database: Database | null = null;
  try {
    database = openSourceDatabase(request.databasePath);
    return await buildSelectedDictionary(request, database);
  } catch (error: unknown) {
    const report = createBuildReport({
      requestedWords: request.requestedWords,
      rootRows: [],
      dependencyRows: [],
      decisions: [],
      canonicalEntryPlans: [],
      softLinkEntries: [],
      conversions: [],
      errors: [{ kind: "io", message: errorMessage(error) }],
      archivePath: null,
    });
    try {
      await writeReport(request.buildPaths.reportPath, report);
    } catch (_reportError: unknown) {
      return { ok: false, report };
    }
    return { ok: false, report };
  } finally {
    database?.close();
  }
};
