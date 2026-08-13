import type { Result } from "../shared/result";

export interface SourceRowSummary {
  readonly id: number;
  readonly encodedKey: string;
}

export interface IndexedSourceRow extends SourceRowSummary {
  readonly decodedKey: string;
}

export interface SourceKeyFinding {
  readonly kind: "source-key-decode";
  readonly rowId: number;
  readonly encodedKey: string;
  readonly message: string;
}

export interface SourceIndex {
  readonly rows: readonly IndexedSourceRow[];
  readonly findings: readonly SourceKeyFinding[];
}

export interface SourceRow extends IndexedSourceRow {
  readonly html: string;
}

export const isUnabridgedRow = (row: SourceRowSummary): boolean =>
  !row.encodedKey.startsWith("collegiate_") &&
  !row.encodedKey.startsWith("medical_") &&
  !row.encodedKey.startsWith("thesaurus_");

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const decodeSourceRow = (
  row: SourceRowSummary,
): Result<IndexedSourceRow, SourceKeyFinding> => {
  try {
    return {
      ok: true,
      value: { ...row, decodedKey: decodeURIComponent(row.encodedKey) },
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error: {
        kind: "source-key-decode",
        rowId: row.id,
        encodedKey: row.encodedKey,
        message: errorMessage(error),
      },
    };
  }
};

const compareIndexedRows = (
  left: IndexedSourceRow,
  right: IndexedSourceRow,
): number => {
  if (left.decodedKey < right.decodedKey) return -1;
  if (left.decodedKey > right.decodedKey) return 1;
  return left.id - right.id;
};

export const buildSourceIndex = (
  rows: readonly SourceRowSummary[],
): SourceIndex => {
  const decodedRows = rows.map(decodeSourceRow);
  const indexedRows = decodedRows.flatMap(
    (
      result: Result<IndexedSourceRow, SourceKeyFinding>,
    ): readonly IndexedSourceRow[] => (result.ok ? [result.value] : []),
  );
  const findings = decodedRows.flatMap(
    (
      result: Result<IndexedSourceRow, SourceKeyFinding>,
    ): readonly SourceKeyFinding[] => (result.ok ? [] : [result.error]),
  );

  return {
    rows: indexedRows.toSorted(compareIndexedRows),
    findings,
  };
};

const lowerBound = (
  rows: readonly IndexedSourceRow[],
  decodedKey: string,
): number => {
  let lower = 0;
  let upper = rows.length;

  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    const middleRow = rows[middle];
    if (middleRow === undefined) return lower;

    if (middleRow.decodedKey < decodedKey) lower = middle + 1;
    else upper = middle;
  }

  return lower;
};

const upperBound = (
  rows: readonly IndexedSourceRow[],
  decodedKey: string,
): number => {
  let lower = 0;
  let upper = rows.length;

  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    const middleRow = rows[middle];
    if (middleRow === undefined) return lower;

    if (middleRow.decodedKey <= decodedKey) lower = middle + 1;
    else upper = middle;
  }

  return lower;
};

export const findSourceRows = (
  index: SourceIndex,
  decodedKey: string,
): readonly IndexedSourceRow[] =>
  index.rows.slice(
    lowerBound(index.rows, decodedKey),
    upperBound(index.rows, decodedKey),
  );
