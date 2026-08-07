import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { openSourceDatabase } from "../src/source/sqlite";

/**
 * Extracts the source article HTML for the selected words into
 * tests/rendered/fixtures/<term>.html, so the render-contract tests and
 * Storybook stories can run the real converter without opening the 3.4 GB
 * source database.
 *
 * The fragments are snapshots of the immutable 2024 MWU release; refresh
 * them with `bun run update:render-fixtures` if the asset ever changes.
 */

interface SourceRowRecord {
  readonly id: number;
  readonly encodedKey: string;
  readonly html: string;
}

const main = async (): Promise<number> => {
  const wordsPath = path.resolve(import.meta.dirname, "testWords.txt");
  const words = (await Bun.file(wordsPath).text())
    .split("\n")
    .map((word: string): string => word.trim())
    .filter((word: string): boolean => word.length > 0);

  const fixtureDir = path.resolve(import.meta.dirname, "rendered/fixtures");
  await mkdir(fixtureDir, { recursive: true });

  const databasePath = path.resolve(import.meta.dirname, "../assets/MWU.db");
  const database = openSourceDatabase(databasePath);
  const query = database.query<SourceRowRecord, [string]>(
    "SELECT id, w AS encodedKey, m AS html FROM word WHERE w = ?",
  );

  let totalBytes = 0;
  for (const word of words) {
    const row = query.get(word);
    if (row === undefined) {
      console.error(`No source row for ${word}`);
      return 1;
    }
    const decodedKey = decodeURIComponent(row.encodedKey);
    if (decodedKey !== word) {
      console.error(
        `Row ${row.id} key ${decodedKey} does not match requested ${word}`,
      );
      return 1;
    }
    await writeFile(path.join(fixtureDir, `${word}.html`), row.html);
    totalBytes += row.html.length;
    console.log(`${word}: row ${row.id}, ${row.html.length} bytes`);
  }
  console.log(
    `Wrote ${words.length} fixtures (${totalBytes} bytes) to ${fixtureDir}`,
  );
  return 0;
};

const exitCode = await main();
process.exit(exitCode);
