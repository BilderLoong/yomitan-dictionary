/**
 * Type definitions for Yomitan dictionary structure
 */

export interface DictionaryIndex {
  title: string;
  revision: string;
  author?: string;
  description?: string;
  format?: number;
  sourceLanguage?: string;
  targetLanguage?: string;
  [key: string]: unknown;
}

export type TermEntry = [
  term: string,
  reading: string,
  definitionTags: string | null,
  ruleIdentifiers: string,
  score: number,
  definitions: Array<string | Record<string, unknown>>,
  sequence: number,
  termTags: string
];

export type TagEntry = [
  name: string,
  category: string,
  order: number,
  notes: string,
  score: number
];

export interface DictionaryFiles {
  index: DictionaryIndex;
  termBanks: TermEntry[][];
  tagBanks: TagEntry[][];
  kanjiBanks?: unknown[][];
  termMetaBanks?: unknown[][];
}

export interface SplitResult {
  splitCount: number;
  splits: Array<{
    partNumber: number;
    entryCount: number;
    outputPath: string;
    zipPath: string;
  }>;
}

export interface DictionaryStructure {
  index: DictionaryIndex;
  termBanks: TermEntry[][];
  tagBanks: TagEntry[][];
  kanjiBanks?: unknown[][];
  termMetaBanks?: unknown[][];
  filePaths: {
    index: string;
    termBanks: string[];
    tagBanks: string[];
    kanjiBanks?: string[];
    termMetaBanks?: string[];
  };
}