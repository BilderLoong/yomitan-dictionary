import type Database from "bun:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { ownedFunctionalLabel } from "../conversion/functionalLabels";
import { planCanonicalOwners } from "../level1/planCanonical";
import type { CanonicalEntryPlan } from "../level1/types";
import {
  buildSourceIndex,
  isUnabridgedRow,
  type SourceIndex,
} from "../source/rows";
import {
  listSourceRowSummaries,
  loadSourceRow,
  openSourceDatabase,
} from "../source/sqlite";
import {
  buildFunctionalLabelInventory,
  type FunctionalLabelInventory,
  type FunctionalLabelObservation,
} from "./functionalLabelInventory";

export interface FunctionalLabelInventoryReport
  extends FunctionalLabelInventory {
  readonly scannedRows: number;
  readonly canonicalEntries: number;
  readonly errors: readonly {
    readonly rowId: number;
    readonly message: string;
  }[];
}

export interface FunctionalLabelInventoryRequest {
  readonly databasePath: string;
  readonly outputPath: string;
  readonly sourceIndex?: SourceIndex;
}

export type FunctionalLabelInventoryAttempt =
  | {
      readonly ok: true;
      readonly outputPath: string;
      readonly report: FunctionalLabelInventoryReport;
    }
  | {
      readonly ok: false;
      readonly outputPath: string;
      readonly report: FunctionalLabelInventoryReport | null;
      readonly error: string;
    };

export const observationsFromCanonicalEntries = (
  plans: readonly CanonicalEntryPlan[],
): readonly FunctionalLabelObservation[] =>
  plans.flatMap(
    (plan: CanonicalEntryPlan): readonly FunctionalLabelObservation[] => {
      const rawLabel = ownedFunctionalLabel(plan.source.ownerHtml);
      return rawLabel === null
        ? []
        : [
            {
              rowId: plan.source.rowId,
              rowKey: plan.source.rowKey,
              term: plan.term,
              kind: plan.kind,
              rawLabel,
            },
          ];
    },
  );

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const scanRows = (
  database: Database,
  sourceIndex: SourceIndex,
): FunctionalLabelInventoryReport => {
  const rows = sourceIndex.rows.filter(isUnabridgedRow);
  const observations: FunctionalLabelObservation[] = [];
  const errors: { readonly rowId: number; readonly message: string }[] = [];
  let canonicalEntries = 0;

  for (const indexedRow of rows) {
    try {
      const row = loadSourceRow(database, indexedRow.id);
      if (row === null) {
        errors.push({
          rowId: indexedRow.id,
          message: "Source row was not found.",
        });
        continue;
      }

      const plans = planCanonicalOwners(row, sourceIndex).canonicalEntries;
      canonicalEntries += plans.length;
      observations.push(...observationsFromCanonicalEntries(plans));
    } catch (error: unknown) {
      errors.push({ rowId: indexedRow.id, message: errorMessage(error) });
    }
  }

  return {
    ...buildFunctionalLabelInventory(observations),
    scannedRows: rows.length,
    canonicalEntries,
    errors,
  };
};

export const writeFunctionalLabelInventory = async (
  request: FunctionalLabelInventoryRequest,
): Promise<FunctionalLabelInventoryAttempt> => {
  let database: Database | null = null;
  try {
    database = openSourceDatabase(request.databasePath);
    const sourceIndex =
      request.sourceIndex ?? buildSourceIndex(listSourceRowSummaries(database));
    const report = scanRows(database, sourceIndex);
    await mkdir(dirname(request.outputPath), { recursive: true });
    await writeFile(
      request.outputPath,
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    if (report.errors.length === 0 && report.unmappedLabels.length === 0) {
      return {
        ok: true,
        outputPath: request.outputPath,
        report,
      };
    }
    return {
      ok: false,
      outputPath: request.outputPath,
      report,
      error: `Inventory contains ${report.unmappedLabels.length} unmapped labels and ${report.errors.length} scan errors.`,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      outputPath: request.outputPath,
      report: null,
      error: errorMessage(error),
    };
  } finally {
    database?.close();
  }
};
