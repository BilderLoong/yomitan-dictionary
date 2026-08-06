import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import Database from "bun:sqlite";
import { Dictionary, DictionaryIndex } from "yomichan-dict-builder";
import type { TermInformation } from "yomichan-dict-builder/dist/types/yomitan/termbank";

import { convertCanonical, type ConvertedCanonical } from "../conversion/convertCanonical";
import { closeDependencies, type DependencyEdge } from "../level1/closeDependencies";
import { planCanonicalOwners } from "../level1/planCanonical";
import {
  deriveBareAffixSoftLinks,
  deriveBareLookup,
  planMainToAlternativeSpellingSoftLinks,
  planPhraseAlternateSoftLinks,
  planVrMeanAlternateSoftLinks,
  type ConfirmedAffixEvidence,
  type LinkEvidence,
  type LinkRejection,
  type SoftLinkEntryPlan,
} from "../level1/planLinks";
import type {
  CanonicalEntryPlan,
  Level1Finding,
  OwnershipDecision,
} from "../level1/types";
import { assembleCanonicalRecord, assembleSoftLinkRecord } from "../yomitan/assembleRecords";
import { createBuildReport, type BuildFatalError, type BuildReport } from "./report";
import {
  buildSourceIndex,
  findSourceRows,
  type IndexedSourceRow,
  type SourceIndex,
  type SourceRow,
} from "../source/rows";
import {
  listSourceRowSummaries,
  loadSourceRow,
  openSourceDatabase,
} from "../source/sqlite";

export interface BuildPaths {
  readonly outputDirectory: string;
  readonly reportPath: string;
}

export interface BuildRequest {
  readonly requestedWords: readonly string[];
  readonly databasePath: string;
  readonly buildPaths: BuildPaths;
  readonly sourceIndex?: SourceIndex;
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

interface PlannedRow {
  readonly row: SourceRow;
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

const sameRules = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  left.every(
    (rule: string, index: number): boolean => rule === right[index],
  );

const sameSoftLinkRoute = (
  left: SoftLinkEntryPlan,
  right: SoftLinkEntryPlan,
): boolean =>
  left.lookup === right.lookup &&
  left.target === right.target &&
  sameRules(left.rules, right.rules);

const mergeSoftLink = (
  links: readonly SoftLinkEntryPlan[],
  next: SoftLinkEntryPlan,
): readonly SoftLinkEntryPlan[] => {
  const existingIndex = links.findIndex((link: SoftLinkEntryPlan): boolean =>
    sameSoftLinkRoute(link, next),
  );
  if (existingIndex < 0) return [...links, next];

  return links.map(
    (link: SoftLinkEntryPlan, index: number): SoftLinkEntryPlan =>
      index === existingIndex
        ? { ...link, evidence: [...link.evidence, ...next.evidence] }
        : link,
  );
};

const deduplicateSoftLinks = (
  links: readonly SoftLinkEntryPlan[],
): readonly SoftLinkEntryPlan[] => links.reduce(mergeSoftLink, []);

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
    ({ softLinkEntries }: { readonly softLinkEntries: readonly SoftLinkEntryPlan[] }): readonly SoftLinkEntryPlan[] =>
      softLinkEntries,
  );
  const existingSoftLinkEntries = [
    ...planMainToAlternativeSpellingSoftLinks({
      rowKey: row.decodedKey,
      decisions: canonicalResult.decisions,
    }),
    ...localSoftLinkEntries,
  ];
  const affixEvidence = localSoftLinkEntries.flatMap(createAffixEvidence);
  const softLinkEntries = deduplicateSoftLinks(
    deriveBareAffixSoftLinks(
      existingSoftLinkEntries,
      affixEvidence,
    ).softLinkEntries,
  );
  const findings = canonicalResult.findings.filter(
    (finding: Level1Finding): boolean => finding.kind !== "source-key-decode",
  );
  const rejections = alternateResults.flatMap(
    ({ rejections: alternateRejections }: { readonly rejections: readonly LinkRejection[] }): readonly LinkRejection[] =>
      alternateRejections,
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
    row,
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
      findSourceRows(index, requested).reduce(
        addUniqueRow,
        resolvedRows,
      ),
    [],
  );
  const missingWords = requestedWords
    .filter((word: string): boolean => findSourceRows(index, word).length === 0);

  return { rows, missingWords };
};

const dependencyReason = (
  planned: PlannedRow,
  dependencyId: number,
): string => {
  const decision = planned.decisions.find(
    ({ dedicatedRowId }: OwnershipDecision): boolean =>
      dedicatedRowId === dependencyId,
  );
  return decision === undefined
    ? "canonical-dependency"
    : `alternative-spelling-canonical-entry:${decision.searchableHeadword}`;
};

const dependencyTarget = (
  planned: PlannedRow,
  dependencyId: number,
): string => {
  const decision = planned.decisions.find(
    ({ dedicatedRowId }: OwnershipDecision): boolean =>
      dedicatedRowId === dependencyId,
  );
  return decision?.searchableHeadword ?? String(dependencyId);
};

const addDependencyEntry = (
  entries: readonly BuildState["dependencyRows"][number][],
  row: IndexedSourceRow,
  reason: string,
): readonly BuildState["dependencyRows"][number][] =>
  entries.some(({ row: existing }: BuildState["dependencyRows"][number]): boolean =>
    existing.id === row.id,
  )
    ? entries
    : [...entries, { row, reason }];

const addError = (
  errors: readonly BuildFatalError[],
  error: BuildFatalError,
): readonly BuildFatalError[] =>
  errors.some((existing: BuildFatalError): boolean =>
    JSON.stringify(existing) === JSON.stringify(error),
  )
    ? errors
    : [...errors, error];

const planSelectedRows = (
  database: Database,
  index: SourceIndex,
  request: BuildRequest,
): BuildState => {
  const resolvedRoots = resolveRootRows(index, request.requestedWords);
  const rootIds = resolvedRoots.rows.map(
    ({ id }: IndexedSourceRow): number => id,
  );
  let pendingRows: readonly PendingRow[] = resolvedRoots.rows.map(
    (row: IndexedSourceRow): PendingRow => ({
      row,
      rootWord: row.decodedKey,
      dependencyTarget: null,
    }),
  );
  let processedRowIds: readonly number[] = [];
  let plannedRows: readonly PlannedRow[] = [];
  let dependencyRows: readonly BuildState["dependencyRows"][number][] = [];
  let findings: readonly Level1Finding[] = [...index.findings];
  let rejections: readonly LinkRejection[] = [];
  let errors: readonly BuildFatalError[] = resolvedRoots.missingWords.map(
    (word: string): BuildFatalError => ({ kind: "missing-root", word }),
  );

  let cursor = 0;
  while (cursor < pendingRows.length) {
    const pending = pendingRows[cursor];
    cursor += 1;
    if (pending === undefined || processedRowIds.includes(pending.row.id)) {
      continue;
    }

    processedRowIds = [...processedRowIds, pending.row.id];
    let row: SourceRow | null;
    try {
      row = loadSourceRow(database, pending.row.id);
    } catch (error: unknown) {
      row = null;
      errors = addError(errors, {
        kind: "io",
        message: `Unable to load row ${pending.row.id}: ${errorMessage(error)}`,
      });
    }

    if (row === null) {
      errors =
        pending.dependencyTarget === null
          ? addError(errors, {
              kind: "missing-root",
              word: pending.rootWord ?? pending.row.decodedKey,
            })
          : addError(errors, {
              kind: "missing-dependency",
              target: pending.dependencyTarget,
            });
      continue;
    }

    const planned = planRow(row, index);
    plannedRows = [...plannedRows, planned];
    findings = [...findings, ...planned.findings];
    rejections = [...rejections, ...planned.rejections];

    for (const dependencyId of planned.requiredDependencyIds) {
      if (rootIds.includes(dependencyId)) continue;

      const dependencyRow = index.rows.find(
        ({ id }: IndexedSourceRow): boolean => id === dependencyId,
      );
      if (dependencyRow === undefined) {
        errors = addError(errors, {
          kind: "missing-dependency",
          target: dependencyTarget(planned, dependencyId),
        });
        continue;
      }

      dependencyRows = addDependencyEntry(
        dependencyRows,
        dependencyRow,
        dependencyReason(planned, dependencyId),
      );
      const isQueued = pendingRows.some(
        ({ row: queuedRow }: PendingRow): boolean => queuedRow.id === dependencyId,
      );
      if (!isQueued && !processedRowIds.includes(dependencyId)) {
        pendingRows = [
          ...pendingRows,
          {
            row: dependencyRow,
            rootWord: null,
            dependencyTarget: dependencyTarget(planned, dependencyId),
          },
        ];
      }
    }
  }

  const closure = closeDependencies({
    rootRowIds: rootIds,
    availableRowIds: index.rows.map(
      ({ id }: IndexedSourceRow): number => id,
    ),
    edges: plannedRows.flatMap(
      ({ dependencyEdges }: PlannedRow): readonly DependencyEdge[] =>
        dependencyEdges,
    ),
  });
  if (!closure.ok) {
    errors = addError(errors, closure.error);
  }

  return {
    rootRows: resolvedRoots.rows,
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

interface SequenceAssignment {
  readonly term: string;
  readonly sequence: number;
}

interface SequenceAssignmentState {
  readonly records: readonly TermInformation[];
  readonly assignments: readonly SequenceAssignment[];
}

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

const assignCanonicalSequences = (
  records: readonly TermInformation[],
): readonly TermInformation[] =>
  records.reduce(
    (
      state: SequenceAssignmentState,
      record: TermInformation,
      index: number,
    ): SequenceAssignmentState => {
      const existing = state.assignments.find(
        ({ term }: SequenceAssignment): boolean => term === record[0],
      );
      const sequence = existing?.sequence ?? index + 1;

      return {
        records: [...state.records, replaceSequence(record, sequence)],
        assignments:
          existing === undefined
            ? [...state.assignments, { term: record[0], sequence }]
            : state.assignments,
      };
    },
    { records: [], assignments: [] },
  ).records;

const canonicalPopularity = (
  term: string,
  rootWords: readonly string[],
): number => (rootWords.includes(term) ? 100 : 0);

const buildRecords = (
  conversions: readonly ConvertedCanonical[],
  softLinkEntries: readonly SoftLinkEntryPlan[],
  rootWords: readonly string[],
): readonly TermInformation[] => {
  const canonicalRecords = assignCanonicalSequences(
    conversions.map(
      (converted: ConvertedCanonical, index: number): TermInformation =>
        assembleCanonicalRecord(
          converted,
          index + 1,
          canonicalPopularity(converted.plan.term, rootWords),
        ),
    ),
  );
  const softLinkRecords = softLinkEntries.map(
    (link: SoftLinkEntryPlan, index: number): TermInformation =>
      assembleSoftLinkRecord(link, canonicalRecords.length + index + 1),
  );
  return [...canonicalRecords, ...softLinkRecords];
};

const exportDictionary = async (
  records: readonly TermInformation[],
  outputDirectory: string,
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
      state.plannedRows.flatMap(
        ({ softLinkEntries }: PlannedRow): readonly SoftLinkEntryPlan[] =>
          softLinkEntries,
      ),
    ),
    conversions,
    planningFindings: state.findings,
    linkRejections: state.rejections,
    errors,
    archivePath,
  });

const buildSelectedDictionary = async (
  request: BuildRequest,
  database: Database,
): Promise<BuildAttempt> => {
  const index =
    request.sourceIndex ?? buildSourceIndex(listSourceRowSummaries(database));
  const state = planSelectedRows(database, index, request);
  const canonicalEntryPlans = state.plannedRows.flatMap(
    ({ canonicalEntries }: PlannedRow): readonly CanonicalEntryPlan[] =>
      canonicalEntries,
  );
  const softLinkEntries = deduplicateSoftLinks(
    state.plannedRows.flatMap(
      ({ softLinkEntries }: PlannedRow): readonly SoftLinkEntryPlan[] =>
        softLinkEntries,
    ),
  );
  let conversions: readonly ConvertedCanonical[] = [];
  let errors: readonly BuildFatalError[] = [...state.errors];

  for (const plan of canonicalEntryPlans) {
    const result = convertCanonical(plan);
    if (result.ok) {
      conversions = [...conversions, result.value];
      continue;
    }
    errors = addError(errors, result.error);
  }

  const canonicalTerms = conversions.map(
    ({ plan }: ConvertedCanonical): string => plan.term,
  );
  for (const link of softLinkEntries) {
    if (!canonicalTerms.includes(link.target)) {
      errors = addError(errors, {
        kind: "missing-dependency",
        target: link.target,
      });
    }
  }

  const rootWords = state.rootRows.map(
    ({ decodedKey }: IndexedSourceRow): string => decodedKey,
  );
  const records = buildRecords(conversions, softLinkEntries, rootWords);
  for (const record of records) {
    const validationError = validateTermInformation(record);
    if (validationError !== null) {
      errors = addError(errors, {
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
  );
  try {
    await writeReport(request.buildPaths.reportPath, report);
  } catch (error: unknown) {
    errors = addError(errors, {
      kind: "io",
      message: `Unable to write build report: ${errorMessage(error)}`,
    });
    report = createReport(request, state, null, conversions, errors);
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
    await exportDictionary(records, request.buildPaths.outputDirectory);
  } catch (error: unknown) {
    errors = addError(errors, {
      kind: "io",
      message: `Unable to export dictionary: ${errorMessage(error)}`,
    });
    report = createReport(request, state, null, conversions, errors);
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
