import { Dictionary, DictionaryIndex, TermEntry } from "yomichan-dict-builder";
import { queryWordRows, db, queryGivenWordRows, chainIterators } from "./db";
import * as path from "path";
import { Command } from "commander";
import { parser } from "./parser";
import { readFile } from "fs/promises";

async function constructor_dict(options: ProgramOptions) {
  const { limit, additionalWordsListFile } = options;

  const index = new DictionaryIndex()
    .setTitle("Merriam Webster Unabridged")
    .setRevision("1.0")
    .setAuthor("Birudo")
    .setDescription("Merriam Webster Unabridged Dictionary")
    .setAttribution("https://www.merriam-webster.com/")
    .setUrl("https://example.com")
    .build();

  const dictionary = new Dictionary({
    fileName: `${index.title}.zip`,
  });

  await dictionary.setIndex(index);

  // const res = await readFile(additionalWordsListFile, "utf-8").then((givenWords) => {
  //   return givenWords
  //     .split("\n")
  //     .map((w) => w.trim())
  //     .filter((w) => w.length > 0);
  // }).catch((error) => {
  //   console.error(`Error reading additional words file: ${error}`);
  // });

  const readGivenWords = async () => {
    if (!additionalWordsListFile) {
      return [];
    }

    try {
      const givenWords = await readFile(additionalWordsListFile, "utf-8");
      return givenWords
        .split("\n")
        .map((w) => w.trim())
        .filter((w) => w.length > 0);
    } catch (error) {
      console.error(`Error reading additional words file: ${error}`);
    }

    return [];
  };

  const words = chainIterators(
    queryWordRows(db, { limit }),
    queryGivenWordRows(await readGivenWords(), db)
  );

  for (const { w, m } of words) {
    // Use each individual word record, not the entire iterator
    const res = parser(m);

    if (typeof res === "object" && "error" in res) {
      console.error(`Got error when parsing ${w}: ${res.error}.`);
      continue;
    }

    res.forEach((r) => {
      const entry = new TermEntry(decodeURIComponent(w));

      const {
        definitionTags,
        deinflectors,
        detailedDefinitions,
        popularity,
        reading,
        sequenceNumber,
        term,
        termTags,
      } = r;

      // TODO Review this.
      detailedDefinitions.forEach((d) => {
        entry.addDetailedDefinition(d);
      });

      /**
       * According to https://github.com/yomidevs/yomitan/blob/edd39aac504336a5616b0e018137431e2f015f52/ext/data/schemas/dictionary-term-bank-v3-schema.json#L415
       * `reading` must be a string.
       */
      entry.setReading(reading ?? "");

      if (definitionTags) {
        entry.setDefinitionTags(definitionTags);
      }

      if (deinflectors) {
        entry.setDeinflectors(deinflectors);
      }
      if (popularity) {
        entry.setPopularity(popularity);
      }

      if (definitionTags) {
        entry.setDefinitionTags(definitionTags);
      }

      if (sequenceNumber) {
        entry.setSequenceNumber(sequenceNumber);
      }

      if (termTags) {
        entry.setTermTags(termTags);
      }

      if (popularity) {
        entry.setPopularity(popularity);
      }

      dictionary.addTerm(entry.build());
    });
  }

  return dictionary;
}

// Create a utility type to filter out function properties
type NonFunctionMembers<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

// Usage with TermEntry
export type TermEntryData = NonFunctionMembers<TermEntry>;

interface ProgramOptions {
  limit?: number;
  additionalWordsListFile?: string;
}

async function main() {
  const program = new Command();
  program
    .option(
      "--limit <number>",
      "Maximum number of entries to build, default is no limit.",
      (value) => {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          throw new Error("--limit must be a number");
        }
        return parsed;
      }
    )
    .option(
      "--additional-words-list-file <string>",
      "Path to a file containing additional words to include, words should be separated by /n."
    )
    .parse(process.argv);

  const options = program.opts<ProgramOptions>();

  const dict = await constructor_dict(options);

  const dirname = import.meta.dirname;
  console.log(path.resolve(dirname, "../build"));
  const stats = await dict.export(path.resolve(dirname, "../build"));

  console.log(stats);
}

main();
