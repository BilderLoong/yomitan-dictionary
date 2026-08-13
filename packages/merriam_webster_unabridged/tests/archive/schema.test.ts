import { describe, expect, test } from "bun:test";
import { runBuild } from "../../src/pipeline/runBuild";
import {
  dictionaryIndex,
  dictionaryTagBankV3,
  dictionaryTermBankV3,
} from "../fixture/yomitan-chrome-playwright/lib/validate-schemas.js";
import {
  createTestBuildRequest,
  representativeRows,
} from "../helpers/createTestDatabase";

const readArchiveJson = async (
  archivePath: string,
  fileName: string,
): Promise<unknown> => {
  const child = Bun.spawn(["unzip", "-p", archivePath, fileName], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const text = await new Response(child.stdout).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    const errorText = await new Response(child.stderr).text();
    throw new Error(`Unable to read ${fileName}: ${errorText}`);
  }
  return JSON.parse(text);
};

const readTermBanks = async (
  archivePath: string,
): Promise<readonly unknown[]> => {
  const listing = Bun.spawn(["unzip", "-Z1", archivePath], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const listingText = await new Response(listing.stdout).text();
  const listingExitCode = await listing.exited;
  if (listingExitCode !== 0) {
    const errorText = await new Response(listing.stderr).text();
    throw new Error(`Unable to list archive: ${errorText}`);
  }
  const fileNames = listingText
    .split("\n")
    .filter((fileName: string): boolean =>
      /^term_bank_\d+\.json$/u.test(fileName),
    )
    .toSorted();

  return Promise.all(
    fileNames.map(async (fileName: string): Promise<unknown> => {
      return readArchiveJson(archivePath, fileName);
    }),
  );
};

describe("selected archive", () => {
  test("validates schemas and contains no dangling soft links", async () => {
    const request = await createTestBuildRequest({
      words: ["o"],
      rows: representativeRows,
    });
    const attempt = await runBuild(request);

    expect(attempt.ok).toBe(true);
    if (!attempt.ok) return;

    const index = await readArchiveJson(attempt.archivePath, "index.json");
    expect(dictionaryIndex(index), JSON.stringify(dictionaryIndex.errors)).toBe(
      true,
    );

    const tagBank = await readArchiveJson(
      attempt.archivePath,
      "tag_bank_1.json",
    );
    expect(
      dictionaryTagBankV3(tagBank),
      "tag_bank_1.json must satisfy the Yomitan tag-bank schema",
    ).toBe(true);

    const termBanks = await readTermBanks(attempt.archivePath);
    for (const termBank of termBanks) {
      expect(
        dictionaryTermBankV3(termBank),
        JSON.stringify(dictionaryTermBankV3.errors),
      ).toBe(true);
    }

    if (!Array.isArray(tagBank)) return;
    const tagNames = tagBank.flatMap((entry: unknown): readonly string[] =>
      Array.isArray(entry) && typeof entry[0] === "string" ? [entry[0]] : [],
    );
    termBanks.forEach((termBank: unknown): void => {
      if (!Array.isArray(termBank)) return;
      termBank.forEach((entry: unknown): void => {
        if (!Array.isArray(entry) || typeof entry[2] !== "string") return;
        const definitionTags = entry[2].trim();
        if (definitionTags.length === 0) return;
        definitionTags.split(" ").forEach((tag: string): void => {
          expect(
            tagNames.filter((candidate: string): boolean => candidate === tag),
            `${entry[0]} uses ${tag}`,
          ).toHaveLength(1);
        });
      });
    });

    const canonicalTerms = attempt.records
      .filter((record): boolean => record[4] >= 0)
      .map((record): string => record[0]);
    const targets = attempt.records
      .filter((record): boolean => record[4] === -100)
      .flatMap((record): readonly string[] => {
        const definition = record[5][0];
        if (!Array.isArray(definition)) return [];
        const target = definition[0];
        return typeof target === "string" ? [target] : [];
      });

    expect(
      targets.every((target): boolean => canonicalTerms.includes(target)),
    ).toBe(true);
  });

  test("keeps repeated semantic builds deterministic", async () => {
    const firstRequest = await createTestBuildRequest({
      words: ["o"],
      rows: representativeRows,
    });
    const secondRequest = await createTestBuildRequest({
      words: ["o"],
      rows: representativeRows,
    });
    const first = await runBuild(firstRequest);
    const second = await runBuild(secondRequest);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.records).toEqual(second.records);
    expect(first.report).toEqual(second.report);
    expect(await readArchiveJson(first.archivePath, "tag_bank_1.json")).toEqual(
      await readArchiveJson(second.archivePath, "tag_bank_1.json"),
    );
    expect(await readTermBanks(first.archivePath)).toEqual(
      await readTermBanks(second.archivePath),
    );
  });
});
