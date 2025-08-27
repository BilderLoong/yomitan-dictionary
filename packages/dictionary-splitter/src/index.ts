#!/usr/bin/env bun

import { Command } from 'commander';
import { splitDictionary } from './splitter.js';
import { validateMaxEntries } from './validation.js';

const program = new Command();

program
  .name('dictionary-splitter')
  .description('Split large Yomitan dictionaries into smaller parts')
  .version('1.0.0');

program
  .argument('<inputPath>', 'Path to the input dictionary directory or ZIP file')
  .argument('<outputDir>', 'Directory where split dictionaries will be saved')
  .requiredOption('-m, --max-entries <number>', 'Maximum number of entries per split dictionary')
  .option('-p, --prefix <string>', 'Prefix for split dictionary names', 'split')
  .action(async (inputPath: string, outputDir: string, options: { maxEntries: string; prefix: string }) => {
    try {
      const maxEntries = validateMaxEntries(options.maxEntries);
      
      console.log(`Splitting dictionary: ${inputPath}`);
      console.log(`Output directory: ${outputDir}`);
      console.log(`Max entries per split: ${maxEntries}`);
      console.log(`Prefix: ${options.prefix}`);
      
      const result = await splitDictionary(inputPath, outputDir, maxEntries, options.prefix);
      
      console.log(`\nSuccessfully created ${result.splitCount} split dictionaries:`);
      result.splits.forEach((split, index) => {
        console.log(`  Part ${index + 1}: ${split.entryCount} entries -> ${split.zipPath}`);
      });
      
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();