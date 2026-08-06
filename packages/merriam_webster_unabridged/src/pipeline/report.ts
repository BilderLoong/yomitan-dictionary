import type { ConvertedCanonical } from "../conversion/convertCanonical";
import type { LinkRejection } from "../level1/planLinks";
import type {
  CanonicalEntryPlan,
  Level1Finding,
  OwnershipDecision,
  SoftLinkEntryPlan,
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
  const requestedWords = [...input.requestedWords];
  const rootRows = [...input.rootRows];
  const dependencyRows = input.dependencyRows.map(
    (entry: DependencyReportEntry): DependencyReportEntry => ({
      row: entry.row,
      reason: entry.reason,
    }),
  );
  const decisions = [...input.decisions];
  const canonicalEntryPlans = [...input.canonicalEntryPlans];
  const softLinkEntries = [...input.softLinkEntries];
  const conversions = [...input.conversions];
  const planningFindings = [...(input.planningFindings ?? [])];
  const linkRejections = [...(input.linkRejections ?? [])];
  const errors = [...input.errors];

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
    totals: {
      roots: rootRows.length,
      dependencies: dependencyRows.length,
      canonicalEntries: canonicalEntryPlans.length,
      softLinkEntries: softLinkEntries.length,
      records: conversions.length + softLinkEntries.length,
      findings:
        conversions.reduce(
          (total: number, conversion: ConvertedCanonical): number =>
            total + conversion.findings.length,
          0,
        ) + planningFindings.length,
      errors: errors.length,
    },
  };
};

export const serializeBuildReport = (report: BuildReport): string =>
  `${JSON.stringify(report, null, 2)}\n`;
