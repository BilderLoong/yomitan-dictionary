/**
 * Parser for reading Yomitan dictionary files
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import type { DictionaryStructure, DictionaryIndex, TermEntry, TagEntry } from './types.js';

async function parseDictionaryDirectory(directoryPath: string): Promise<DictionaryStructure> {
  const files = await readdir(directoryPath);
  
  const indexFile = files.find(file => file === 'index.json');
  if (!indexFile) {
    throw new Error('No index.json found in dictionary directory');
  }
  
  const indexPath = join(directoryPath, indexFile);
  const indexContent = await readFile(indexPath, 'utf-8');
  const index: DictionaryIndex = JSON.parse(indexContent);
  
  // Find all term bank files
  const termBankFiles = files.filter(file => file.startsWith('term_bank_') && file.endsWith('.json'));
  const termBanks: TermEntry[][] = [];
  
  for (const termFile of termBankFiles) {
    const termPath = join(directoryPath, termFile);
    const termContent = await readFile(termPath, 'utf-8');
    const terms: TermEntry[] = JSON.parse(termContent);
    termBanks.push(terms);
  }
  
  // Find all tag bank files
  const tagBankFiles = files.filter(file => file.startsWith('tag_bank_') && file.endsWith('.json'));
  const tagBanks: TagEntry[][] = [];
  
  for (const tagFile of tagBankFiles) {
    const tagPath = join(directoryPath, tagFile);
    const tagContent = await readFile(tagPath, 'utf-8');
    const tags: TagEntry[] = JSON.parse(tagContent);
    tagBanks.push(tags);
  }
  
  // Optional: kanji banks
  const kanjiBankFiles = files.filter(file => file.startsWith('kanji_bank_') && file.endsWith('.json'));
  const kanjiBanks: unknown[][] = [];
  
  for (const kanjiFile of kanjiBankFiles) {
    const kanjiPath = join(directoryPath, kanjiFile);
    const kanjiContent = await readFile(kanjiPath, 'utf-8');
    const kanji: unknown[] = JSON.parse(kanjiContent);
    kanjiBanks.push(kanji);
  }
  
  // Optional: term meta banks
  const termMetaBankFiles = files.filter(file => file.startsWith('term_meta_bank_') && file.endsWith('.json'));
  const termMetaBanks: unknown[][] = [];
  
  for (const metaFile of termMetaBankFiles) {
    const metaPath = join(directoryPath, metaFile);
    const metaContent = await readFile(metaPath, 'utf-8');
    const meta: unknown[] = JSON.parse(metaContent);
    termMetaBanks.push(meta);
  }
  
  return {
    index,
    termBanks,
    tagBanks,
    kanjiBanks: kanjiBanks.length > 0 ? kanjiBanks : undefined,
    termMetaBanks: termMetaBanks.length > 0 ? termMetaBanks : undefined,
    filePaths: {
      index: indexPath,
      termBanks: termBankFiles.map(file => join(directoryPath, file)),
      tagBanks: tagBankFiles.map(file => join(directoryPath, file)),
      kanjiBanks: kanjiBankFiles.map(file => join(directoryPath, file)),
      termMetaBanks: termMetaBankFiles.map(file => join(directoryPath, file))
    }
  };
}

export function getTotalTermCount(termBanks: TermEntry[][]): number {
  return termBanks.reduce((total, bank) => total + bank.length, 0);
}

export function flattenTermBanks(termBanks: TermEntry[][]): TermEntry[] {
  return termBanks.flat();
}

export function groupTermsBySequence(terms: TermEntry[]): Map<number, TermEntry[]> {
  const sequenceGroups = new Map<number, TermEntry[]>();
  
  for (const term of terms) {
    const sequence = term[6]; // sequence is at index 6
    if (!sequenceGroups.has(sequence)) {
      sequenceGroups.set(sequence, []);
    }
    sequenceGroups.get(sequence)!.push(term);
  }
  
  return sequenceGroups;
}

export async function parseDictionary(inputPath: string): Promise<{
  dictionary: DictionaryStructure;
  cleanup?: () => Promise<void>;
}> {
  const stats = await stat(inputPath);
  
  if (stats.isDirectory()) {
    const dictionary = await parseDictionaryDirectory(inputPath);
    return { dictionary };
  }
  
  if (stats.isFile() && inputPath.endsWith('.zip')) {
    // Extract ZIP to temporary directory using bun's built-in extraction
    const tempDir = await mkdtemp(join(tmpdir(), 'yomitan-splitter-'));
    
    // Use bun's built-in zip extraction
    const extractionProcess = Bun.spawn(['unzip', '-q', inputPath, '-d', tempDir]);
    await extractionProcess.exited;
    
    if (extractionProcess.exitCode !== 0) {
      throw new Error(`Failed to extract ZIP file: ${inputPath}`);
    }
    
    const dictionary = await parseDictionaryDirectory(tempDir);
    
    return {
      dictionary,
      cleanup: async () => {
        await rm(tempDir, { recursive: true, force: true });
      }
    };
  }
  
  throw new Error('Input must be a directory or a .zip file');
}