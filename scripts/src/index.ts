import path from "path";
import fs from "fs";
import archiver from "archiver";

async function compressDirectory(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a write stream and archiver instance
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression level
    });

    // Handle archive events
    output.on('close', () => {
      console.log(`Successfully compressed ${sourceDir} to ${outputPath}`);
      console.log(`(${archive.pointer()} total bytes)`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Archive warning:', err);
      } else {
        reject(err);
      }
    });

    archive.on('error', (err) => reject(err));

    // Pipe archive data to the output file
    archive.pipe(output);

    // Add directory contents to archive
    archive.directory(sourceDir, false);

    // Finalize the archive
    archive.finalize();
  });
}

// CLI implementation
async function main() {
  const [sourceDir, outputPath] = process.argv.slice(2);
  
  if (!sourceDir || !outputPath) {
    console.error('Usage: ts-node compress.ts <source-directory> <output-zip-path>');
    process.exit(1);
  }

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  try {
    await compressDirectory(sourceDir, outputPath);
  } catch (err) {
    console.error('Compression failed:', err);
    process.exit(1);
  }
}

main(); 