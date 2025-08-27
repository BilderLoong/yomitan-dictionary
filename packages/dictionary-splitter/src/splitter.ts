/**
 * Core splitting logic for Yomitan dictionaries
 */

import { mkdir, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { parseDictionary, getTotalTermCount, flattenTermBanks, groupTermsBySequence } from './parser.js';
import { zipDirectory } from './zip.js';
import type { DictionaryStructure, TermEntry, SplitResult } from './types.js';

export async function splitDictionary(
  inputPath: string,
  outputDir: string,
  maxEntries: number,
  prefix: string = 'split'
): Promise<SplitResult> {
  // Parse the input dictionary (handles both directories and ZIP files)
  const { dictionary, cleanup } = await parseDictionary(inputPath);
  const totalTerms = getTotalTermCount(dictionary.termBanks);
  
  if (totalTerms <= maxEntries) {
    throw new Error(`Dictionary only has ${totalTerms} entries, which is less than or equal to the maximum ${maxEntries}. No splitting needed.`);
  }
  
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });
  
  // Extract original dictionary name from input path
  const originalDictName = extractDictionaryName(inputPath);
  
  // Split the terms
  const splitTermGroups = splitTerms(dictionary.termBanks, maxEntries);
  
  // Create split dictionaries
  const splits: Array<{ partNumber: number; entryCount: number; outputPath: string; zipPath: string }> = [];
  
  for (let i = 0; i < splitTermGroups.length; i++) {
    const partNumber = i + 1;
    const terms = splitTermGroups[i];
    const splitDirName = `${prefix}-part-${partNumber}`;
    const splitOutputPath = join(outputDir, splitDirName);
    
    await mkdir(splitOutputPath, { recursive: true });
    
    // Create the split dictionary with proper naming
    await createSplitDictionary(dictionary, terms, splitOutputPath, partNumber, splitTermGroups.length, originalDictName);
    
    // Create ZIP file for the split dictionary
    const zipFileName = `${originalDictName}-${partNumber}.zip`;
    const zipFilePath = join(outputDir, zipFileName);
    await zipDirectory(splitOutputPath, zipFilePath);
    
    splits.push({
      partNumber,
      entryCount: terms.length,
      outputPath: splitOutputPath,
      zipPath: zipFilePath
    });
  }
  
  // Clean up temporary directory if we extracted a ZIP file
  if (cleanup) {
    await cleanup();
  }
  
  return {
    splitCount: splitTermGroups.length,
    splits
  };
}

export function splitTerms(termBanks: TermEntry[][], maxEntries: number): TermEntry[][] {
  const allTerms = flattenTermBanks(termBanks);
  const sequenceGroups = groupTermsBySequence(allTerms);
  
  const result: TermEntry[][] = [];
  let currentChunk: TermEntry[] = [];
  let currentCount = 0;
  
  // Process sequence groups to keep related terms together
  const sortedSequences = Array.from(sequenceGroups.keys()).sort((a, b) => a - b);
  
  for (const sequence of sortedSequences) {
    const groupTerms = sequenceGroups.get(sequence)!;
    const groupSize = groupTerms.length;
    
    // If a single group is larger than maxEntries, we need to split it
    if (groupSize > maxEntries) {
      // Split the large group into multiple chunks
      for (let i = 0; i < groupTerms.length; i += maxEntries) {
        const chunk = groupTerms.slice(i, i + maxEntries);
        result.push(chunk);
      }
      continue;
    }
    
    // If adding this group would exceed max entries, start a new chunk
    if (currentCount + groupSize > maxEntries && currentCount > 0) {
      result.push(currentChunk);
      currentChunk = [];
      currentCount = 0;
    }
    
    // Add the group to current chunk
    currentChunk.push(...groupTerms);
    currentCount += groupSize;
    
    // If current chunk reaches max entries, start a new one
    if (currentCount >= maxEntries) {
      result.push(currentChunk);
      currentChunk = [];
      currentCount = 0;
    }
  }
  
  // Add the last chunk if it has any terms
  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }
  
  return result;
}

/**
 * Extracts the original dictionary name from the input path
 * Removes .zip extension and directory paths to get the base name
 */
function extractDictionaryName(inputPath: string): string {
  const baseName = basename(inputPath);
  // Remove .zip extension if present
  return baseName.replace(/\.zip$/i, '');
}

async function createSplitDictionary(
  originalDict: DictionaryStructure,
  terms: TermEntry[],
  outputPath: string,
  partNumber: number,
  _totalParts: number, // Unused but kept for interface consistency
  originalDictName: string
): Promise<void> {
  // Create modified index with proper naming format
  const modifiedIndex = {
    ...originalDict.index,
    title: `${originalDictName}-${partNumber}`,
    revision: `${originalDict.index.revision}-part${partNumber}`
  };
  
  await writeFile(
    join(outputPath, 'index.json'),
    JSON.stringify(modifiedIndex, null, 2)
  );
  
  // Write term bank
  await writeFile(
    join(outputPath, 'term_bank_1.json'),
    JSON.stringify(terms, null, 2)
  );
  
  // Copy tag banks (all tags are shared)
  for (let i = 0; i < originalDict.tagBanks.length; i++) {
    await writeFile(
      join(outputPath, `tag_bank_${i + 1}.json`),
      JSON.stringify(originalDict.tagBanks[i], null, 2)
    );
  }
  
  // Copy optional kanji banks if they exist
  if (originalDict.kanjiBanks) {
    for (let i = 0; i < originalDict.kanjiBanks.length; i++) {
      await writeFile(
        join(outputPath, `kanji_bank_${i + 1}.json`),
        JSON.stringify(originalDict.kanjiBanks[i], null, 2)
      );
    }
  }
  
  // Copy optional term meta banks if they exist
  if (originalDict.termMetaBanks) {
    for (let i = 0; i < originalDict.termMetaBanks.length; i++) {
      await writeFile(
        join(outputPath, `term_meta_bank_${i + 1}.json`),
        JSON.stringify(originalDict.termMetaBanks[i], null, 2)
      );
    }
  }
}