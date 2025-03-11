import { Database } from "bun:sqlite";
import path from "path";
import { fileURLToPath } from "url";
import { Dictionary, DictionaryIndex, TermEntry } from "yomichan-dict-builder";

// Get current directory path
const dirname = path.dirname(fileURLToPath(import.meta.url));
console.log(dirname);
console.log(path.resolve(dirname, "../assets/MWU.db"));

// Create/connect to database
const db = new Database(path.resolve(dirname, "../assets/MWU.db"));

// Add this interface to match the database schema
interface WordRecord {
  id: number;
  w: string; // word text
  m: string; // meaning/content
}

function queryword(db: Database): IterableIterator<WordRecord> {
  // Explicitly type the return value
  return db.prepare<WordRecord, []>(`SELECT * FROM word LIMIT 5`).iterate();
}

async function constructor_dict() {
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

  const words = queryword(db);

  for (const { w, m } of words) {
    // Use each individual word record, not the entire iterator
    const entry = new TermEntry(decodeURIComponent(w))
      .addDetailedDefinition(m)
      .setReading("")
      .build();
    await dictionary.addTerm(entry);
  }

  return dictionary;
}

const dict = await constructor_dict();
console.log(path.resolve(dirname, "../build"));
const stats = await dict.export(path.resolve(dirname, "../build"));
console.log(stats);
