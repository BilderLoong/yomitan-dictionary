import { fileURLToPath } from "node:url";
import { Dictionary, DictionaryIndex } from "yomichan-dict-builder";
import type { DictionaryTermBankV3 } from "yomichan-dict-builder/dist/types/yomitan/termbank";

const termBankPath = new URL("./term_bank_1.json", import.meta.url);
const termBank = JSON.parse(
  await Bun.file(termBankPath).text(),
) as DictionaryTermBankV3;

const outputDirectory = fileURLToPath(
  new URL("../../build/design-what/", import.meta.url),
);
const outputFile = fileURLToPath(
  new URL("../../build/design-what/MWU-what-design.zip", import.meta.url),
);
const dictionary = new Dictionary({ fileName: "MWU-what-design.zip" });
const index = new DictionaryIndex()
  .setTitle("Merriam Webster Unabridged")
  .setRevision("design-what-plus-set-1")
  .setAuthor("Merriam-Webster")
  .setDescription(
    "A hand-authored MWU structured-content design fixture for what, ten high-coverage words, and the complete recognized set slice.",
  )
  .setAttribution("https://www.merriam-webster.com/")
  .setSequenced(true)
  .build();

await dictionary.setIndex(index, "", "");

for (const tag of [
  ["abbr", "partOfSpeech", -3, "abbreviation", 2],
  ["adj", "partOfSpeech", -2, "adjective", 2],
  ["adv", "partOfSpeech", -2, "adverb", 2],
  ["comb", "partOfSpeech", -3, "combining form", 2],
  ["conj", "partOfSpeech", -2, "conjunction", 2],
  ["interj", "partOfSpeech", -3, "interjection", 2],
  ["n", "partOfSpeech", -2, "noun", 2],
  ["phrase", "partOfSpeech", -2, "phrase", 2],
  ["prep", "partOfSpeech", -3, "preposition", 2],
  ["prefix", "partOfSpeech", -3, "prefix", 2],
  ["pron", "partOfSpeech", -2, "pronoun", 2],
  ["suffix", "partOfSpeech", -3, "suffix", 2],
  ["symbol", "partOfSpeech", -3, "symbol", 2],
  ["v", "partOfSpeech", -2, "verb", 2],
] as const) {
  dictionary.addTag({
    name: tag[0],
    category: tag[1],
    sortingOrder: tag[2],
    notes: tag[3],
    popularityScore: tag[4],
  });
}

for (const term of termBank) {
  await dictionary.addTerm(term);
}

const stats = await dictionary.export(outputDirectory);
console.log(`Wrote ${outputFile}`);
console.table(stats);
