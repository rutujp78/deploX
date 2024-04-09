import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

export async function downloadDriveFolder(id:string, projectBuildFolderId: string) {
    const drive = google.drive({
        version: 'v3',
        auth: new google.auth.GoogleAuth({
            keyFile: `${process.env.GOOGLE_API_KEY_FILE}`,
            scopes: [`${process.env.GOOGLE_DRIVE_API}`],
        })
    });

    try {
        // check for output folder
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            // If it doesn't exist, create it
            try {
                await fs.promises.mkdir(outputDir, { recursive: true });
                console.log(`Output directory '${outputDir}' created successfully.`);
            } catch (error) {
                console.error(`Error creating output directory '${outputDir}':`, error);
            }
        } else {
            console.log(`Output directory '${outputDir}' already exists.`);
        }
        
        await downloadItem(projectBuildFolderId, path.join(__dirname, 'output'));
    } catch (error) {
        console.log("Error while retrieving project", error);
    }

    async function downloadItem(fileId: string, filePath: string) {
        const file = await drive.files.get({
            fileId, 
            fields: 'id, name, mimeType',
        });

        if (file.data.mimeType === 'application/vnd.google-apps.folder') {
            let folderPath: string = '';
            if(file.data.name === 'build') {
                folderPath = path.join(filePath, id);
            }
            else folderPath = path.join(filePath, file.data.name ? file.data.name : '');

            console.log(`Creating '${folderPath}'directory`);

            if (!fs.existsSync(folderPath)) {
                // If it doesn't exist, create it
                try {
                    await fs.promises.mkdir(folderPath, { recursive: true });
                    console.log(`Directory '${folderPath}' created successfully.`);
                } catch (error) {
                    console.error(`Error creating directory '${folderPath}'`);
                }
            } else {
                console.log(`Directory '${folderPath}' already exists.`);
            }

            const subfolders = await drive.files.list({
                q: `'${fileId}' in parents`,
                fields: 'files(id, name, mimeType)',
            });

            for (const subfolder of (subfolders.data.files || [])) {
                await downloadItem(subfolder.id || '', folderPath);
            }
        }
        else {
            const downloadPath = path.join(filePath, file.data.name || '');
            const destinationFile = fs.createWriteStream(downloadPath);
            
            // explicitly need to use response type as stream other wise gives buffer then .pipe is not usable need to find workaround for it
            const downloadStream = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

            console.log("Downloading file: " + file.data.name + " in " + downloadPath);

            downloadStream.data.pipe(destinationFile)
            .on('finish', () => console.log("Downloaded file: " + file.data.name + " in " + downloadPath))
            .on('error', (err: Error) => console.error("Error downloading file: ", file.data.name, err));
        }
    }

}