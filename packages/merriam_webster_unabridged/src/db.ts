import Database from "bun:sqlite";
import path from "path";

const dirname = import.meta.dirname;

/**
 * schema
 *-----------------------------------------------------+
| CREATE TABLE alt ('id' INTEGER NOT NULL, 'w' TEXT)                                                                                                                                      |
| CREATE INDEX ix_alt_id ON alt(id COLLATE NOCASE)                                                                                                                                        |
| CREATE INDEX ix_alt_w ON alt(w COLLATE NOCASE)                                                                                                                                          |
| CREATE TABLE dbinfo (dbname char(44), author char(0), version char(0), direction char(0), origLang char(0), destLang char(0), license char(0), category char(0), description char(938)) |
| CREATE TABLE dbinfo_extra ('id' INTEGER PRIMARY KEY NOT NULL, 'name' TEXT UNIQUE, 'value' TEXT)                                                                                         |
| CREATE TABLE word ('id' INTEGER PRIMARY KEY NOT NULL, 'w' TEXT, 'm' TEXT)                                                                                                               |
| CREATE INDEX ix_word_w ON word(w COLLATE NOCASE)                                                                                                                                        |
+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
 
 */
export const db = new Database(path.resolve(dirname, "../assets/MWU.db"));

// Add this interface to match the database schema
export interface WordRecord {
  id: number;
  w: string; // word text
  m: string; // meaning/content
}

export interface queryWordOption {
  /**
   * Maximum number of rows to query, default is no limit.
   */
  limit?: number
}

export function queryWordRow(db: Database, options: queryWordOption = {}): IterableIterator<WordRecord> {
  const { limit } = options;
  const limitString = limit !== undefined ? ` LIMIT ${limit}` : "";
  console.log(`SELECT * FROM word where w not like 'collegiate_%' AND w not like 'medical_%' AND w not like 'thesaurus_%'` + limitString);
  // Explicitly type the return value
  return db.prepare<WordRecord, []>(`SELECT * FROM word where w not like 'collegiate_%' AND w not like 'medical_%' AND w not like 'thesaurus_%'` + limitString).iterate();
}
