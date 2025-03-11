import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

program
    .argument('<directoryPath>', 'Path to the directory to compress')
    .option('-n, --name <zipName>', 'Optional name for the zip file')
    .action(async (directoryPath: string, options: { name?: string }) => {
        try {
            // Verify directory exists
            if (!fs.existsSync(directoryPath)) {
                console.error('Directory does not exist:', directoryPath);
                process.exit(1);
            }

            // Determine zip file name
            const dirName = path.basename(directoryPath);
            const zipName = options.name || dirName;
            // Get the parent directory to place zip at the same level
            const parentDir = path.dirname(directoryPath);
            const outputPath = path.join(parentDir, `${zipName}.zip`);

            // Create output stream
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            // Listen for events
            output.on('close', () => {
                console.log(`Successfully created ${outputPath}`);
                console.log(`Total bytes: ${archive.pointer()}`);
            });

            archive.on('error', (err) => {
                throw err;
            });

            // Pipe archive data to the output file
            archive.pipe(output);

            // Add directory content to the archive
            archive.directory(directoryPath, false);

            // Finalize the archive
            await archive.finalize();

        } catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    });

program.parse();