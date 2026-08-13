/**
 * One-off research: inventory every distinct `.cxl` relation phrase in the
 * MWU source DB, inside and outside `.cxl-ref` containers.
 *
 * Output (JSON):
 *  - rowsWithCxlRef / refsTotal: row and paragraph counts
 *  - relationPhrases: distinct single `.cxl` texts -> count (desc)
 *  - multiRelationRefs: distinct ordered combos of `.cxl` texts per ref
 *  - cxlOutsideRef: distinct `.cxl` texts whose ancestor is not `.cxl-ref`
 *  - hrefKinds: distinct `.cxt` href shapes -> count
 */
import Database from "bun:sqlite";
import * as cheerio from "cheerio";

const databasePath =
  "/Users/birudo/Projects/yomitan-dictionary/packages/merriam_webster_unabridged/assets/MWU.db";
const database = new Database(databasePath, { readonly: true });

const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();

interface RowRecord {
  readonly id: number;
  readonly w: string;
  readonly m: string;
}

const count = database
  .query<{ n: number }, []>(
    "SELECT COUNT(*) AS n FROM word WHERE m LIKE '%cxl-ref%'",
  )
  .get();
console.log(`rows containing "cxl-ref": ${count?.n ?? 0}`);

const countCxl = database
  .query<{ n: number }, []>(
    "SELECT COUNT(*) AS n FROM word WHERE m LIKE '%class=\"cxl\"%' OR m LIKE '%class=%cxl%'",
  )
  .get();
console.log(`rows containing class "cxl": ${countCxl?.n ?? 0}`);

const rows = database
  .query<RowRecord, []>(
    "SELECT id, w AS w, m AS m FROM word WHERE m LIKE '%class=\"cxl\"%'",
  )
  .iterate();

const relationCounts = new Map<string, number>();
const multiRelationRefs = new Map<string, number>();
const cxlOutsideRef = new Map<string, number>();
const hrefKinds = new Map<string, number>();
const examples = new Map<
  string,
  { rowId: number; key: string; html: string }
>();
let refsTotal = 0;
let rowsWithRef = 0;

const record = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

for (const row of rows) {
  const key = decodeURIComponent(row.w);
  const root = cheerio.load(row.m);

  const cxlRefs = root(".cxl-ref").toArray();
  if (cxlRefs.length > 0) rowsWithRef += 1;

  for (const ref of cxlRefs) {
    refsTotal += 1;
    const relations = root(ref)
      .find(".cxl")
      .toArray()
      .map((el) => normalize(root(el).text()));
    if (relations.length === 0) continue;

    const comboKey = relations.join(" ␟ ");
    if (relations.length === 1) {
      record(relationCounts, relations[0]!);
      if (!examples.has(relations[0]!)) {
        examples.set(relations[0]!, {
          rowId: row.id,
          key,
          html: root(ref).prop("outerHTML") ?? "",
        });
      }
    } else {
      record(multiRelationRefs, comboKey);
    }

    for (const anchor of root(ref).find(".cxt").toArray()) {
      const href = root(anchor).attr("href") ?? "(none)";
      record(hrefKinds, href.startsWith("bword://") ? "bword://…" : href);
    }
  }

  // `.cxl` spans whose ancestor chain has no `.cxl-ref`
  for (const cxl of root(".cxl").toArray()) {
    if (root(cxl).parents(".cxl-ref").length === 0) {
      record(cxlOutsideRef, normalize(root(cxl).text()));
    }
  }
}

const sortByCount = (
  map: Map<string, number>,
): { phrase: string; count: number }[] =>
  [...map.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count);

console.log(
  JSON.stringify(
    {
      rowsWithCxlRef: rowsWithRef,
      refsTotal,
      relationCounts: sortByCount(relationCounts),
      multiRelationRefs: sortByCount(multiRelationRefs),
      cxlOutsideRef: sortByCount(cxlOutsideRef),
      hrefKinds: sortByCount(hrefKinds),
      examples: Object.fromEntries(
        [...examples.entries()].map(([phrase, ex]) => [phrase, ex]),
      ),
    },
    null,
    2,
  ),
);
