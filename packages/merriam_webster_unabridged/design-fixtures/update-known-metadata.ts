import Database from "bun:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import type { DictionaryTermBankV3 } from "yomichan-dict-builder/dist/types/yomitan/termbank";

/**
 * Source-assisted update for metadata that has an explicit, stable mapping.
 *
 * This is intentionally not an HTML-to-Yomitan parser. It only copies
 * headword homograph numbers and entry qualifiers into the already
 * hand-authored fixture. It also applies one source-independent layout fix:
 * pronunciation units are inline spans so a homograph number does not become
 * an isolated line before the pronunciation. Definitions, hierarchy, examples,
 * and relationships remain manual JSON so the fixture stays the design contract.
 */

type JsonObject = Record<string, unknown>;
type TermRecord = DictionaryTermBankV3[number];

interface SourceMetadata {
  lookup: string;
  headword: string;
  homographNumber?: string;
  partOfSpeech: string;
  entryQualifiers: string[];
  variantReference: string;
}

interface SourceRow {
  w: string;
  m: string;
}

interface UpdateReport {
  matched: Array<{
    lookup: string;
    term: string;
    tag: string;
    homographNumber?: string;
    entryQualifiers: string[];
    variantReference: string;
  }>;
  unmatched: SourceMetadata[];
}

const databasePath = path.resolve(import.meta.dirname, "../assets/MWU.db");
const termBankPath = path.resolve(import.meta.dirname, "what/term_bank_1.json");
const reportPath = path.resolve(
  import.meta.dirname,
  "../build/design-what/known-metadata-update.json",
);

const selectedLookups = [
  "what",
  "turn",
  "take",
  "run",
  "process",
  "have",
  "set",
  "hand",
  "give",
  "in",
  "o",
];

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const childrenOf = (value: unknown): readonly unknown[] => {
  if (Array.isArray(value)) return value;
  if (!isObject(value)) return [];
  const content = value.content;
  if (Array.isArray(content)) return content;
  return content === undefined ? [] : [content];
};

const cleanText = (value: string): string => value.replace(/\s+/g, " ").trim();

const textOf = (
  $: cheerio.CheerioAPI,
  element: cheerio.Cheerio<cheerio.Element>,
): string => cleanText(element.text());

const unitOf = (value: unknown): string | undefined => {
  if (!isObject(value) || !isObject(value.data)) return undefined;
  return typeof value.data.content === "string"
    ? value.data.content
    : undefined;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const node = (
  tag: string,
  content: unknown,
  unit: string,
  level: string,
  style: JsonObject,
): JsonObject => ({
  tag,
  data: { content: unit, level },
  style,
  content,
});

const normalizeHeadword = (value: string): string =>
  cleanText(value)
    .replace(/^(?:\d+)\s+/, "")
    .replaceAll("·", "")
    .trim();

const partOfSpeechTag = (value: string): string => {
  const text = value.toLowerCase();
  if (text.includes("combining form")) return "comb";
  if (text.includes("prefix")) return "prefix";
  if (text.includes("suffix")) return "suffix";
  if (text.includes("pronoun")) return "pron";
  if (text.includes("conjunction")) return "conj";
  if (text.includes("preposition")) return "prep";
  if (text.includes("interjection")) return "interj";
  if (text.includes("adjective")) return "adj";
  if (text.includes("adverb")) return "adv";
  if (text.includes("noun")) return "n";
  if (text.includes("verb")) return "v";
  if (text.includes("abbreviation")) return "abbr";
  if (text.includes("symbol")) return "symbol";
  if (text.includes("phrase")) return "phrase";
  return "";
};

const metadataForRow = (row: SourceRow): SourceMetadata[] => {
  const $ = cheerio.load(row.m, {}, false);
  return $("mean")
    .toArray()
    .map((mean) => {
      const root = $(mean);
      const heading = root.find(".hword").first();
      const rawHeadword = textOf($, heading);
      const homographNumber = cleanText(heading.find("sup").first().text());
      const partOfSpeech = textOf($, root.find(".entry-header .fl").first());
      return {
        lookup: decodeURIComponent(row.w),
        headword: normalizeHeadword(rawHeadword),
        ...(homographNumber.length > 0 ? { homographNumber } : {}),
        partOfSpeech,
        entryQualifiers: root
          .find(".entry-header .lbs .lb")
          .toArray()
          .map((label) => cleanText($(label).text()))
          .filter(Boolean),
        variantReference: cleanText(root.find(".cxl-ref").first().text()),
      };
    })
    .filter(({ headword }) => headword.length > 0);
};

const canonicalEntries = (termBank: readonly TermRecord[]): TermRecord[] =>
  termBank.filter((entry) => !Array.isArray(entry[5][0]));

const structuredRoot = (entry: TermRecord): JsonObject | undefined => {
  const definition = entry[5].find(
    (candidate) =>
      isObject(candidate) && candidate.type === "structured-content",
  );
  return isObject(definition) && isObject(definition.content)
    ? definition.content
    : undefined;
};

const replaceRoot = (entry: TermRecord, root: JsonObject): TermRecord => [
  entry[0],
  entry[1],
  entry[2],
  entry[3],
  entry[4],
  [{ type: "structured-content", content: root }],
  entry[6],
  entry[7],
];

const normalizeInlinePronunciation = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeInlinePronunciation);
  if (!isObject(value)) return value;

  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      normalizeInlinePronunciation(child),
    ]),
  );
  return unitOf(normalized) === "pronunciation" && normalized.tag === "div"
    ? { ...normalized, tag: "span" }
    : normalized;
};

const updateHeader = (
  entry: TermRecord,
  metadata: SourceMetadata,
): TermRecord => {
  const root = structuredRoot(entry);
  if (root === undefined) return entry;

  const rootChildren = childrenOf(root.content);
  const headerIndex = rootChildren.findIndex(
    (child) => unitOf(child) === "mwu-header",
  );
  if (headerIndex < 0) return entry;

  const header = rootChildren[headerIndex];
  if (!isObject(header)) return entry;

  const existingChildren = [...childrenOf(header.content)];
  const existingHomograph = existingChildren.find(
    (child) => unitOf(child) === "homograph-number",
  );
  const existingQualifier = existingChildren.find(
    (child) => unitOf(child) === "entry-qualifier",
  );
  const existingVariantReference = existingChildren.find(
    (child) => unitOf(child) === "variant-reference",
  );
  const homograph =
    existingHomograph ??
    (metadata.homographNumber === undefined
      ? undefined
      : node("span", metadata.homographNumber, "homograph-number", "1", {
          verticalAlign: "super",
          fontSize: "0.75em",
        }));
  const qualifier =
    existingQualifier ??
    (metadata.entryQualifiers.length === 0
      ? undefined
      : node(
          "span",
          `, ${metadata.entryQualifiers.join(", ")}`,
          "entry-qualifier",
          "1",
          { fontStyle: "italic", marginLeft: "0.35em" },
        ));
  const variantReference =
    existingVariantReference ??
    (metadata.variantReference.length === 0
      ? undefined
      : node("span", metadata.variantReference, "variant-reference", "1", {
          fontStyle: "italic",
          marginLeft: "0.5em",
        }));
  const retainedChildren = existingChildren.filter((child) => {
    const unit = unitOf(child);
    return (
      unit !== "homograph-number" &&
      unit !== "entry-qualifier" &&
      unit !== "variant-reference" &&
      !(typeof child === "string" && child.trim().length === 0)
    );
  });
  const metadataChildren: unknown[] = [];
  if (homograph !== undefined) metadataChildren.push(homograph, " ");
  if (qualifier !== undefined) metadataChildren.push(qualifier, " ");
  if (variantReference !== undefined)
    metadataChildren.push(variantReference, " ");
  const nextHeaderChildren =
    retainedChildren.length === 0
      ? metadataChildren.slice(0, -1)
      : [...metadataChildren, ...retainedChildren];
  const nextHeader = {
    ...header,
    content: nextHeaderChildren,
  };
  const nextContent = rootChildren.map((child, index) =>
    index === headerIndex ? nextHeader : child,
  );
  const nextRoot = normalizeInlinePronunciation({
    ...clone(root),
    content: nextContent,
  });
  if (
    !isObject(nextRoot) ||
    JSON.stringify(nextRoot) === JSON.stringify(root)
  ) {
    return entry;
  }
  return replaceRoot(entry, nextRoot);
};

const sourceRows = (database: Database): SourceRow[] => {
  const placeholders = selectedLookups.map(() => "?").join(",");
  return database
    .query<SourceRow, string[]>(
      `SELECT w, m FROM word WHERE w IN (${placeholders}) ORDER BY id`,
    )
    .all(...selectedLookups);
};

const main = async (): Promise<void> => {
  const termBank = JSON.parse(
    await Bun.file(termBankPath).text(),
  ) as DictionaryTermBankV3;
  const database = new Database(databasePath, { readonly: true });
  const metadata = sourceRows(database).flatMap(metadataForRow);
  const candidates = canonicalEntries(termBank);
  const used = new Set<number>();
  const report: UpdateReport = { matched: [], unmatched: [] };
  const nextTermBank = termBank.map((entry) => {
    const candidateIndex = candidates.indexOf(entry);
    if (candidateIndex < 0) return entry;

    const matchIndex = metadata.findIndex((source, index) => {
      if (used.has(index)) return false;
      return (
        source.headword === entry[0] &&
        (source.partOfSpeech.length === 0 && source.variantReference.length > 0
          ? entry[2] === ""
          : partOfSpeechTag(source.partOfSpeech) === entry[2])
      );
    });
    if (matchIndex < 0) return entry;

    const source = metadata[matchIndex]!;
    used.add(matchIndex);
    const next = updateHeader(entry, source);
    report.matched.push({
      lookup: source.lookup,
      term: entry[0],
      tag: entry[2],
      ...(source.homographNumber === undefined
        ? {}
        : { homographNumber: source.homographNumber }),
      entryQualifiers: source.entryQualifiers,
      variantReference: source.variantReference,
    });
    return next;
  });
  const normalizedTermBank = nextTermBank.map((entry) => {
    const root = structuredRoot(entry);
    if (root === undefined) return entry;
    const normalizedRoot = normalizeInlinePronunciation(clone(root));
    return isObject(normalizedRoot) &&
      JSON.stringify(normalizedRoot) !== JSON.stringify(root)
      ? replaceRoot(entry, normalizedRoot)
      : entry;
  });

  report.unmatched = metadata.filter((_, index) => !used.has(index));
  await Bun.write(
    termBankPath,
    `${JSON.stringify(normalizedTermBank, null, 2)}\n`,
  );
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Updated ${report.matched.length} entries; ${report.unmatched.length} source means remained unmatched`,
  );
};

if (import.meta.main) await main();
