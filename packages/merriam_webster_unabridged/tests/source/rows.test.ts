import { describe, expect, test } from "bun:test";
import Database from "bun:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildSourceIndex, findSourceRows } from "../../src/source/rows";
import {
  listSourceRowSummaries,
  loadSourceRow,
  openSourceDatabase,
} from "../../src/source/sqlite";

describe("source row index", () => {
  test("sorts decoded keys and preserves duplicate rows by id", () => {
    const rows = Object.freeze([
      Object.freeze({ id: 4, encodedKey: "o%27" }),
      Object.freeze({ id: 3, encodedKey: "in" }),
      Object.freeze({ id: 2, encodedKey: "in" }),
    ]);

    const result = buildSourceIndex(rows);

    expect(result).toEqual({
      rows: [
        { id: 2, encodedKey: "in", decodedKey: "in" },
        { id: 3, encodedKey: "in", decodedKey: "in" },
        { id: 4, encodedKey: "o%27", decodedKey: "o'" },
      ],
      findings: [],
    });
    expect(findSourceRows(result, "o'").map(({ id }) => id)).toEqual([4]);
    expect(findSourceRows(result, "in").map(({ id }) => id)).toEqual([2, 3]);
    expect(rows.map(({ id }) => id)).toEqual([4, 3, 2]);
  });

  test("reports an undecodable source key without discarding valid rows", () => {
    const result = buildSourceIndex([
      { id: 9, encodedKey: "%E0%A4%A" },
      { id: 1, encodedKey: "give" },
    ]);

    expect(result.rows).toEqual([
      { id: 1, encodedKey: "give", decodedKey: "give" },
    ]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      kind: "source-key-decode",
      rowId: 9,
      encodedKey: "%E0%A4%A",
    });
    expect(result.findings[0]?.message.length).toBeGreaterThan(0);
  });

  test("matches decoded keys exactly", () => {
    const index = buildSourceIndex([
      { id: 1, encodedKey: "IN" },
      { id: 2, encodedKey: "in" },
    ]);

    expect(findSourceRows(index, "IN").map(({ id }) => id)).toEqual([1]);
    expect(findSourceRows(index, "in").map(({ id }) => id)).toEqual([2]);
    expect(findSourceRows(index, "In")).toEqual([]);
  });
});

describe("SQLite source row edge", () => {
  test("lists lightweight rows and loads HTML only by requested id", () => {
    const database = new Database(":memory:");
    database.exec(
      "CREATE TABLE word (id INTEGER PRIMARY KEY NOT NULL, w TEXT, m TEXT)",
    );
    database.run("INSERT INTO word (id, w, m) VALUES (?, ?, ?)", [
      2,
      "o%27",
      "<mean>apostrophe</mean>",
    ]);
    database.run("INSERT INTO word (id, w, m) VALUES (?, ?, ?)", [
      1,
      "give",
      "<mean>give</mean>",
    ]);

    try {
      expect(listSourceRowSummaries(database)).toEqual([
        { id: 1, encodedKey: "give" },
        { id: 2, encodedKey: "o%27" },
      ]);
      expect(loadSourceRow(database, 2)).toEqual({
        id: 2,
        encodedKey: "o%27",
        decodedKey: "o'",
        html: "<mean>apostrophe</mean>",
      });
      expect(loadSourceRow(database, 999)).toBeNull();
    } finally {
      database.close();
    }
  });

  test("opens a file database read-only", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mwu-source-test-"));
    const databasePath = join(directory, "MWU.db");
    const writableDatabase = new Database(databasePath);
    writableDatabase.exec(
      "CREATE TABLE word (id INTEGER PRIMARY KEY NOT NULL, w TEXT, m TEXT)",
    );
    writableDatabase.close();

    const database = openSourceDatabase(databasePath);

    try {
      expect(listSourceRowSummaries(database)).toEqual([]);
      expect((): void => {
        database.exec(
          "INSERT INTO word (id, w, m) VALUES (1, 'give', '<mean />')",
        );
      }).toThrow();
    } finally {
      database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
