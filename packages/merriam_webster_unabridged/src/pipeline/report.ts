import type { ConvertedCanonical } from "../conversion/convertCanonical";
import {
  analyzeConversionCoverage,
  type ConversionCoverage,
} from "../conversion/coverage";
import type { LinkRejection, SoftLinkEntryPlan } from "../level1/planLinks";
import type {
  CanonicalEntryPlan,
  Level1Finding,
  OwnershipDecision,
} from "../level1/types";
import type { IndexedSourceRow } from "../source/rows";

export interface DependencyReportEntry {
  readonly row: IndexedSourceRow;
  readonly reason: string;
}

export interface BuildReportInput {
  readonly requestedWords: readonly string[];
  readonly rootRows: readonly IndexedSourceRow[];
  readonly dependencyRows: readonly DependencyReportEntry[];
  readonly decisions: readonly OwnershipDecision[];
  readonly canonicalEntryPlans: readonly CanonicalEntryPlan[];
  readonly softLinkEntries: readonly SoftLinkEntryPlan[];
  readonly conversions: readonly ConvertedCanonical[];
  readonly planningFindings?: readonly Level1Finding[];
  readonly linkRejections?: readonly LinkRejection[];
  readonly errors: readonly BuildFatalError[];
  readonly archivePath: string | null;
  /** Full-database builds skip the per-entry detail fields. */
  readonly fullDatabase?: boolean;
  /** Record count for full-database builds, whose conversions are not retained. */
  readonly recordCount?: number;
  /** Conversion-finding count for full-database builds. */
  readonly conversionFindings?: number;
  /** Soft-link count for full-database builds, whose links are not retained. */
  readonly softLinkCount?: number;
}

export type BuildFatalError =
  | { readonly kind: "missing-root"; readonly word: string }
  | { readonly kind: "missing-dependency"; readonly target: string }
  | {
      readonly kind: "empty-canonical-definition";
      readonly rowId: number;
      readonly term: string;
    }
  | { readonly kind: "schema"; readonly message: string }
  | { readonly kind: "io"; readonly message: string };

export interface BuildReport extends BuildReportInput {
  readonly coverage: readonly ConversionCoverage[];
  readonly totals: {
    readonly roots: number;
    readonly dependencies: number;
    readonly canonicalEntries: number;
    readonly softLinkEntries: number;
    readonly records: number;
    readonly findings: number;
    readonly errors: number;
  };
}

export const createBuildReport = (input: BuildReportInput): BuildReport => {
  const fullDatabase = input.fullDatabase === true;
  const requestedWords = [...input.requestedWords];
  const rootRows = [...input.rootRows];
  const dependencyRows = input.dependencyRows.map(
    (entry: DependencyReportEntry): DependencyReportEntry => ({
      row: entry.row,
      reason: entry.reason,
    }),
  );
  const decisions = [...input.decisions];
  const canonicalEntryPlans = fullDatabase
    ? []
    : [...input.canonicalEntryPlans];
  const softLinkEntries = fullDatabase ? [] : [...input.softLinkEntries];
  const conversions = fullDatabase ? [] : [...input.conversions];
  const planningFindings = [...(input.planningFindings ?? [])];
  const linkRejections = [...(input.linkRejections ?? [])];
  const errors = [...input.errors];
  const coverage = fullDatabase
    ? []
    : conversions.map(analyzeConversionCoverage);
  const conversionFindings = fullDatabase
    ? (input.conversionFindings ?? 0)
    : conversions.reduce(
        (total: number, conversion: ConvertedCanonical): number =>
          total + conversion.findings.length,
        0,
      );

  return {
    requestedWords,
    rootRows,
    dependencyRows,
    decisions,
    canonicalEntryPlans,
    softLinkEntries,
    conversions,
    planningFindings,
    linkRejections,
    errors,
    archivePath: input.archivePath,
    coverage,
    totals: {
      roots: rootRows.length,
      dependencies: dependencyRows.length,
      canonicalEntries: canonicalEntryPlans.length,
      softLinkEntries: fullDatabase
        ? (input.softLinkCount ?? 0)
        : softLinkEntries.length,
      records: input.recordCount ?? conversions.length + softLinkEntries.length,
      findings: conversionFindings + planningFindings.length,
      errors: errors.length,
    },
  };
};

export const serializeBuildReport = (report: BuildReport): string =>
  `${JSON.stringify(report, null, 2)}\n`;
