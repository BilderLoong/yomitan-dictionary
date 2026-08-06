import Database from "bun:sqlite";

import type { SourceRow, SourceRowSummary } from "./rows";

interface SourceRowRecord {
  readonly id: number;
  readonly encodedKey: string;
  readonly html: string;
}

export const openSourceDatabase = (databasePath: string): Database =>
  new Database(databasePath, { readonly: true });

export const listSourceRowSummaries = (
  database: Database,
): readonly SourceRowSummary[] =>
  // Order by `w` so the planner scans the key-only index instead of the
  // `word` table b-tree, whose pages interleave the multi-gigabyte `m` blobs.
  database
    .query<SourceRowSummary, []>(
      "SELECT id, w AS encodedKey FROM word ORDER BY w",
    )
    .all();

export const loadSourceRow = (
  database: Database,
  id: number,
): SourceRow | null => {
  const record = database
    .query<SourceRowRecord, [number]>(
      "SELECT id, w AS encodedKey, m AS html FROM word WHERE id = ?",
    )
    .get(id);

  return record === null
    ? null
    : { ...record, decodedKey: decodeURIComponent(record.encodedKey) };
};
