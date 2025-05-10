import { fileURLToPath } from "bun";
import path from "path";
import { db, queryWordRow, WordRecord } from "./db";
import * as cheerio from "cheerio";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const termTagMap = new Map<string, { count: number; words: string[] }>();

// for (const word of queryWordRow(db, { limit: 9999 })) {
for (const word of queryWordRow(db)) {
  const termTags = getTermTagFromWord(word);
  const headWord = word.w;
  termTags.forEach((tag) => {
    const val = termTagMap.get(tag) || { count: 0, words: [] };
    termTagMap.set(tag, {
      count: val.count + 1,
      words: [...val.words, headWord],
    });
  });
}

// Save the termTagMap to a csv file
const termTagMapFile = path.resolve(dirname, "../assets/termTagMap.tsv");
Bun.write(
  termTagMapFile,
  [
    ["termTag", "count", "words"],
    ...Array.from(termTagMap.entries()).map(([termTag, { count, words }]) => [
      termTag,
      count,
      words.map((w) => decodeURIComponent(w)).join("|"),
    ]),
  ]
    .map((row) => row.join("\t"))
    .join("\n")
);

function getTermTagFromWord({ m: content }: WordRecord): string[] {
  const $ = cheerio.load(content);
  const termTags = $(".entry-header .fl")
    .map((i, el) => $(el).text())
    .get();
  return termTags;
}
