// zip a folder

function zipFolder(folderPath: string, zipFilePath: string) {
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');

    // Check if the folder exists
    if (!fs.existsSync(folderPath)) {
        throw new Error(`Folder not found: ${folderPath}`);
    }
    
    // Create the zip file
    const zipCommand = `zip -r ${zipFilePath} ${folderPath}`;
    exec(zipCommand, (error: any, stdout: any, stderr: any) => {
        if (error) {
            throw new Error(`Error creating zip file: ${error}`);
        }
    });

}