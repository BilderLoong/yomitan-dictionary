import Database from "bun:sqlite";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { BuildRequest } from "../../src/pipeline/runBuild";
import { definition, mean } from "./mwuHtml";

const stylesPath = fileURLToPath(new URL("../../styles.css", import.meta.url));

export interface TestDatabaseRow {
  readonly id: number;
  readonly encodedKey: string;
  readonly html: string;
}

export const createTestBuildRequest = async (input: {
  readonly words: readonly string[];
  readonly rows: readonly TestDatabaseRow[];
}): Promise<BuildRequest> => {
  const directory = await mkdtemp(join(tmpdir(), "mwu-v1-"));
  const databasePath = join(directory, "MWU.db");
  const database = new Database(databasePath);
  database.exec(
    "CREATE TABLE word (id INTEGER PRIMARY KEY NOT NULL, w TEXT, m TEXT);" +
      "CREATE TABLE alt (id INTEGER NOT NULL, w TEXT);",
  );
  const insert = database.prepare(
    "INSERT INTO word (id, w, m) VALUES (?, ?, ?)",
  );
  input.rows.forEach(({ id, encodedKey, html }: TestDatabaseRow): void => {
    insert.run(id, encodedKey, html);
  });
  database.close();

  return {
    requestedWords: input.words,
    databasePath,
    buildPaths: {
      outputDirectory: join(directory, "build"),
      reportPath: join(directory, "build", "build-report.json"),
      stylesPath,
    },
  };
};

export const representativeRows: readonly TestDatabaseRow[] = [
  {
    id: 1,
    encodedKey: "o",
    html:
      mean("o", definition("letter")) +
      mean("o'", definition("apostrophe form")) +
      mean("oh", definition("exclamation")),
  },
  { id: 2, encodedKey: "o%27", html: mean("o'", definition("apostrophe")) },
  { id: 3, encodedKey: "oh", html: mean("oh", definition("exclamation")) },
];
