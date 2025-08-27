/**
 * ZIP file utilities for Yomitan dictionary packaging using JSZip
 */

import JSZip from 'jszip';
import { readFile, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { writeFile } from 'fs/promises';

/**
 * Creates a ZIP file from a directory using JSZip
 * This is a pure function that returns a promise describing the zip operation
 */
export async function zipDirectory(
  sourceDir: string,
  outputZipPath: string
): Promise<void> {
  const zip = new JSZip();
  
  // Recursively add all files from the directory to the zip
  await addDirectoryToZip(zip, sourceDir, '');
  
  // Generate the zip file
  const zipContent = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });
  
  // Write the zip file to disk
  await writeFile(outputZipPath, zipContent);
}

/**
 * Recursively adds files from a directory to a JSZip instance
 */
async function addDirectoryToZip(
  zip: JSZip,
  directoryPath: string,
  zipPath: string
): Promise<void> {
  const files = await readdir(directoryPath, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = join(directoryPath, file.name);
    const relativePath = join(zipPath, file.name);
    
    if (file.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, relativePath);
    } else {
      const fileContent = await readFile(fullPath);
      zip.file(relativePath, fileContent);
    }
  }
}

/**
 * Creates ZIP files for all split dictionary directories
 * This function handles the side effect of file system operations
 */
export async function createZipFilesForSplits(
  splitDirectories: Array<{ outputPath: string }>,
  outputDir: string,
  originalDictName: string
): Promise<Array<{ zipPath: string; partNumber: number }>> {
  const zipResults: Array<{ zipPath: string; partNumber: number }> = [];

  for (let i = 0; i < splitDirectories.length; i++) {
    const partNumber = i + 1;
    const splitDir = splitDirectories[i].outputPath;
    const zipFileName = `${originalDictName}-${partNumber}.zip`;
    const zipFilePath = join(outputDir, zipFileName);

    await zipDirectory(splitDir, zipFilePath);
    zipResults.push({ zipPath: zipFilePath, partNumber });
  }

  return zipResults;
}