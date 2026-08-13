import Database from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildFunctionalLabelInventory,
  type FunctionalLabelObservation,
} from "../../src/pipeline/functionalLabelInventory";
import { writeFunctionalLabelInventory } from "../../src/pipeline/inventory";
import type { SourceIndex } from "../../src/source/rows";
import { createTestBuildRequest } from "../helpers/createTestDatabase";

const observation = (
  rowId: number,
  term: string,
  kind: FunctionalLabelObservation["kind"],
  rawLabel: string,
): FunctionalLabelObservation => ({
  rowId,
  rowKey: term,
  term,
  kind,
  rawLabel,
});

describe("functional-label inventory", () => {
  test("reports mapping status, owner kinds, and deterministic samples", () => {
    const inventory = buildFunctionalLabelInventory([
      observation(4, "future", "drp-phrase-canonical-entry", "future label"),
      observation(2, "noun", "main-canonical-entry", " noun "),
      observation(
        3,
        "noun-alt",
        "alternative-spelling-canonical-entry",
        "noun",
      ),
      observation(1, "future-first", "main-canonical-entry", "future label"),
    ]);

    expect(inventory.labels).toEqual([
      {
        normalizedLabel: "future label",
        count: 2,
        ownerKinds: {
          "main-canonical-entry": 1,
          "alternative-spelling-canonical-entry": 0,
          "drp-phrase-canonical-entry": 1,
        },
        sample: { rowId: 1, rowKey: "future-first", term: "future-first" },
        status: "unmapped",
        tags: ["?future_label"],
      },
      {
        normalizedLabel: "noun",
        count: 2,
        ownerKinds: {
          "main-canonical-entry": 1,
          "alternative-spelling-canonical-entry": 1,
          "drp-phrase-canonical-entry": 0,
        },
        sample: { rowId: 2, rowKey: "noun", term: "noun" },
        status: "fixed",
        tags: ["n"],
      },
    ]);
    expect(inventory.labelCount).toBe(2);
    expect(inventory.unmappedLabels).toEqual(["future label"]);
  });

  test("keeps semantic inventory content stable when observations arrive in a different order", () => {
    const observations = [
      observation(4, "future", "drp-phrase-canonical-entry", "future label"),
      observation(2, "noun", "main-canonical-entry", " noun "),
      observation(
        3,
        "noun-alt",
        "alternative-spelling-canonical-entry",
        "noun",
      ),
      observation(1, "future-first", "main-canonical-entry", "future label"),
    ];

    expect(buildFunctionalLabelInventory(observations)).toEqual(
      buildFunctionalLabelInventory(observations.toReversed()),
    );
  });

  test("writes the same semantic inventory for repeated scans of one source", async () => {
    const request = await createTestBuildRequest({
      words: ["future"],
      rows: [
        {
          id: 1,
          encodedKey: "future",
          html:
            '<mean><div class="entry-header"><h1 class="hword">future</h1>' +
            '<span class="fl">future label</span></div>' +
            '<div class="section" data-id="definition"><span class="dt">meaning</span></div></mean>',
        },
      ],
    });
    const firstOutputPath = join(
      request.buildPaths.outputDirectory,
      "functional-label-inventory-first.json",
    );
    const secondOutputPath = join(
      request.buildPaths.outputDirectory,
      "functional-label-inventory-second.json",
    );

    const firstAttempt = await writeFunctionalLabelInventory({
      databasePath: request.databasePath,
      outputPath: firstOutputPath,
    });
    const secondAttempt = await writeFunctionalLabelInventory({
      databasePath: request.databasePath,
      outputPath: secondOutputPath,
    });

    expect(firstAttempt.report).toEqual(secondAttempt.report);
    expect(JSON.parse(await readFile(firstOutputPath, "utf8"))).toEqual(
      JSON.parse(await readFile(secondOutputPath, "utf8")),
    );
  });

  test("writes evidence and fails the audit for an unmapped source label", async () => {
    const request = await createTestBuildRequest({
      words: ["future"],
      rows: [
        {
          id: 1,
          encodedKey: "future",
          html:
            '<mean><div class="entry-header"><h1 class="hword">future</h1>' +
            '<span class="fl">future label</span></div>' +
            '<div class="section" data-id="definition"><span class="dt">meaning</span></div></mean>',
        },
      ],
    });
    const outputPath = join(
      request.buildPaths.outputDirectory,
      "functional-label-inventory.json",
    );
    const attempt = await writeFunctionalLabelInventory({
      databasePath: request.databasePath,
      outputPath,
    });

    expect(attempt.ok).toBe(false);
    if (attempt.ok) return;
    expect(attempt.error).toContain("1 unmapped labels");
    expect(attempt.report?.unmappedLabels).toEqual(["future label"]);
    expect(JSON.parse(await readFile(outputPath, "utf8"))).toEqual(
      attempt.report,
    );
  });

  test("writes an audit report when an indexed source row cannot be scanned", async () => {
    const request = await createTestBuildRequest({
      words: ["future"],
      rows: [
        {
          id: 1,
          encodedKey: "future",
          html:
            '<mean><div class="entry-header"><h1 class="hword">future</h1>' +
            '<span class="fl">noun</span></div>' +
            '<div class="section" data-id="definition"><span class="dt">meaning</span></div></mean>',
        },
      ],
    });
    const outputPath = join(
      request.buildPaths.outputDirectory,
      "functional-label-inventory.json",
    );
    const sourceIndex = {
      rows: [{ id: 2, encodedKey: "missing", decodedKey: "missing" }],
      findings: [],
    } satisfies SourceIndex;
    const attempt = await writeFunctionalLabelInventory({
      databasePath: request.databasePath,
      outputPath,
      sourceIndex,
    });

    expect(attempt.ok).toBe(false);
    if (attempt.ok || attempt.report === null) return;

    expect(attempt.report.errors).toEqual([
      { rowId: 2, message: "Source row was not found." },
    ]);
    expect(attempt.error).toContain("1 scan errors");
    expect(JSON.parse(await readFile(outputPath, "utf8"))).toEqual(
      attempt.report,
    );
  });

  test("continues after one row cannot be planned", async () => {
    const request = await createTestBuildRequest({
      words: ["future", "later"],
      rows: [
        {
          id: 1,
          encodedKey: "future",
          html:
            '<mean><div class="entry-header"><h1 class="hword">future</h1>' +
            '<span class="fl">noun</span></div>' +
            '<div class="section" data-id="definition"><span class="dt">meaning</span></div></mean>',
        },
        {
          id: 2,
          encodedKey: "later",
          html:
            '<mean><div class="entry-header"><h1 class="hword">later</h1>' +
            '<span class="fl">noun</span></div>' +
            '<div class="section" data-id="definition"><span class="dt">meaning</span></div></mean>',
        },
      ],
    });
    const database = new Database(request.databasePath);
    try {
      database.exec("UPDATE word SET m = NULL WHERE id = 1");
    } finally {
      database.close();
    }
    const outputPath = join(
      request.buildPaths.outputDirectory,
      "functional-label-inventory.json",
    );

    const attempt = await writeFunctionalLabelInventory({
      databasePath: request.databasePath,
      outputPath,
    });

    expect(attempt.ok).toBe(false);
    if (attempt.ok || attempt.report === null) return;

    expect(attempt.report.errors).toEqual([
      {
        rowId: 1,
        message: expect.stringContaining("expects a string"),
      },
    ]);
    expect(attempt.report.scannedRows).toBe(2);
    expect(attempt.report.canonicalEntries).toBe(1);
    expect(attempt.report.labels).toEqual([
      {
        normalizedLabel: "noun",
        count: 1,
        ownerKinds: {
          "main-canonical-entry": 1,
          "alternative-spelling-canonical-entry": 0,
          "drp-phrase-canonical-entry": 0,
        },
        sample: { rowId: 2, rowKey: "later", term: "later" },
        status: "fixed",
        tags: ["n"],
      },
    ]);
    expect(attempt.error).toContain("1 scan errors");
    expect(JSON.parse(await readFile(outputPath, "utf8"))).toEqual(
      attempt.report,
    );
  });
});
