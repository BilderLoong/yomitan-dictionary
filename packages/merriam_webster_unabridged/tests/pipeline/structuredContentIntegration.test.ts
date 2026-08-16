import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TermInformation } from "yomichan-dict-builder/dist/types/yomitan/termbank";

import { runBuild } from "../../src/pipeline/runBuild";

type JsonObject = Record<string, unknown>;

const sourceDatabasePath = new URL("../../assets/MWU.db", import.meta.url)
  .pathname;

const stylesPath = new URL("../../styles.css", import.meta.url).pathname;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const structuredContent = (record: TermInformation): unknown => {
  const definition = record[5][0];
  if (
    !isObject(definition) ||
    definition.type !== "structured-content" ||
    !("content" in definition)
  ) {
    return null;
  }
  return definition.content;
};

const allObjects = (value: unknown): readonly JsonObject[] => {
  if (Array.isArray(value)) return value.flatMap(allObjects);
  if (!isObject(value)) return [];
  return [value, ...allObjects(value.content)];
};

const textOf = (value: unknown): string =>
  typeof value === "string"
    ? value
    : Array.isArray(value)
      ? value.map(textOf).join("")
      : isObject(value)
        ? textOf(value.content)
        : "";

const unitsOf = (value: unknown, unit: string): readonly JsonObject[] =>
  allObjects(value).filter(
    (node: JsonObject): boolean =>
      isObject(node.data) && node.data.content === unit,
  );

test("renders real MWU what records as structured content", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "mwu-structured-"));
  const attempt = await runBuild({
    requestedWords: ["what", "take", "process", "set", "hand"],
    databasePath: sourceDatabasePath,
    buildPaths: {
      outputDirectory,
      reportPath: join(outputDirectory, "build-report.json"),
      stylesPath,
    },
  });

  expect(
    attempt.ok,
    attempt.ok ? "" : JSON.stringify(attempt.report.errors),
  ).toBe(true);
  if (!attempt.ok) return;

  const canonicalRecords = attempt.records.filter(
    (record: TermInformation): boolean => structuredContent(record) !== null,
  );
  const whatRecords = canonicalRecords.filter(
    (record: TermInformation): boolean => record[0] === "what",
  );
  const requestedTerms = ["what", "take", "process", "set", "hand"];
  const firstWhat = whatRecords[0];
  const content = firstWhat === undefined ? null : structuredContent(firstWhat);
  const serialized = JSON.stringify(content);
  const allowedTags = new Set([
    "br",
    "details",
    "div",
    "li",
    "ol",
    "span",
    "summary",
  ]);

  expect(attempt.report.errors).toEqual([]);
  expect(
    attempt.report.conversions.every(({ findings }) =>
      findings.every(({ kind }) => kind !== "unsupported-visible-subtree"),
    ),
  ).toBe(true);
  expect(canonicalRecords.length).toBeGreaterThan(10);
  expect(
    requestedTerms.every((term: string): boolean =>
      canonicalRecords.some(
        (record: TermInformation): boolean => record[0] === term,
      ),
    ),
  ).toBe(true);
  expect(whatRecords.length).toBe(5);
  expect(firstWhat?.[1]).toBe("");
  expect(firstWhat?.[2]).toBe("pron");
  expect(unitsOf(content, "mwu-entry")).toHaveLength(1);
  expect(unitsOf(content, "mwu-header")).toHaveLength(1);
  expect(unitsOf(content, "mwu-level").length).toBeGreaterThan(0);
  expect(unitsOf(content, "origin")[0]?.open).toBe(false);
  expect(unitsOf(content, "phrase").length).toBeGreaterThan(0);
  expect(unitsOf(content, "extra-examples").length).toBeGreaterThan(0);
  expect(
    unitsOf(content, "extra-examples").every(
      (node: JsonObject): boolean => node.open === false,
    ),
  ).toBe(true);
  expect(serialized).toContain("target-highlight");
  expect(serialized).not.toContain("bword://");
  expect(serialized).not.toContain("gdlookup://");
  expect(
    allObjects(content).every(
      (node: JsonObject): boolean =>
        typeof node.tag !== "string" || allowedTags.has(node.tag),
    ),
  ).toBe(true);
}, 30_000);

test("preserves real abstract synonym-discussion reference targets", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "mwu-abstract-"));
  const attempt = await runBuild({
    requestedWords: ["abstract"],
    databasePath: sourceDatabasePath,
    buildPaths: {
      outputDirectory,
      reportPath: join(outputDirectory, "build-report.json"),
      stylesPath,
    },
  });

  expect(
    attempt.ok,
    attempt.ok ? "" : JSON.stringify(attempt.report.errors),
  ).toBe(true);
  if (!attempt.ok) return;

  const references = attempt.records
    .filter(
      (record: TermInformation): boolean =>
        record[0] === "abstract" && structuredContent(record) !== null,
    )
    .flatMap((record: TermInformation): readonly JsonObject[] =>
      unitsOf(structuredContent(record), "synonym-discussion-reference"),
    );
  expect(references).toHaveLength(2);
  expect(references.map(textOf)).toEqual(
    expect.arrayContaining([
      "See Synonym Discussion at abridgment",
      "See Synonym Discussion at detach",
    ]),
  );
  expect(
    references.map((reference: JsonObject): string[] =>
      unitsOf(reference, "cross-reference").map(textOf),
    ),
  ).toEqual(expect.arrayContaining([["abridgment"], ["detach"]]));
  const targets = references.flatMap(
    (reference: JsonObject): readonly JsonObject[] =>
      unitsOf(reference, "cross-reference"),
  );
  expect(targets).toHaveLength(2);
  expect(
    targets.every(
      (target: JsonObject): boolean => target.data?.relation === undefined,
    ),
  ).toBe(true);
  expect(
    JSON.stringify(
      attempt.records.filter(
        (record: TermInformation): boolean => record[0] === "abstract",
      ),
    ),
  ).not.toContain("bword://");
});

test("keeps real MWU synonym references inside their source entries", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "mwu-synonym-"));
  const attempt = await runBuild({
    requestedWords: ["turn"],
    databasePath: sourceDatabasePath,
    buildPaths: {
      outputDirectory,
      reportPath: join(outputDirectory, "build-report.json"),
      stylesPath,
    },
  });

  expect(
    attempt.ok,
    attempt.ok ? "" : JSON.stringify(attempt.report.errors),
  ).toBe(true);
  if (!attempt.ok) return;

  const discussionRecords = attempt.records.filter(
    (record: TermInformation): boolean => {
      const content = structuredContent(record);
      return (
        record[0] === "turn" &&
        unitsOf(content, "synonym-discussion").length === 1
      );
    },
  );
  expect(discussionRecords).toHaveLength(1);

  const discussion = structuredContent(discussionRecords[0]);
  const entries = unitsOf(discussion, "synonym-entry");
  expect(entries).toHaveLength(11);
  expect(
    entries.map((entry: JsonObject): string =>
      unitsOf(entry, "synonym-term").map(textOf).join(""),
    ),
  ).toEqual([
    "revolve",
    "rotate",
    "gyrate",
    "circle",
    "spin",
    "twirl",
    "whirl",
    "wheel",
    "eddy",
    "swirl",
    "pirouette",
  ]);
  expect(unitsOf(entries[5], "cross-reference").map(textOf)).toEqual(["spin"]);
  expect(unitsOf(entries[9], "cross-reference").map(textOf)).toEqual(["eddy"]);
  expect(
    entries.every(
      (entry: JsonObject): boolean =>
        unitsOf(entry, "synonym-explanation")[0]?.tag === "span",
    ),
  ).toBe(true);
  expect(attempt.report.errors).toEqual([]);
  expect(
    attempt.report.conversions.every(({ findings }) =>
      findings.every(({ kind }) => kind !== "unsupported-visible-subtree"),
    ),
  ).toBe(true);
}, 30_000);
