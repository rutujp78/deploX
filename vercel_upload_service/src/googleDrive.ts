import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';
import mime from 'mime-types';
import { createClient } from 'redis';

interface FileMetadata {
    name: string;
    mimeType?: string;
    parents?: string[];
}

const publisher = createClient();
publisher.connect();

async function publishLog(projectId: string, log: string) {
    await publisher.publish(`logs:${projectId}`, log);
}

export async function uploadFile(id: string, pathOfDir: string) {
    // configure drive
    const drive = google.drive({
        version: 'v3',
        auth: new google.auth.GoogleAuth({
            keyFile: `${process.env.GOOGLE_API_KEY_FILE}`,
            scopes: [`${process.env.GOOGLE_DRIVE_API}`],
        })
    });

    // creating metadata for main directory, here parents id folder id where we want to upload our clonned repo
    const mainDirFolder: FileMetadata = {
        name: id,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [`${process.env.VERCEL_FOLDER_ID}`],
    }

    try {
        // upload to drive
        const mainDirFolderCreated = await drive.files.create({
            requestBody: mainDirFolder,
            fields: 'id, name',
        })
        console.log("MAIN:", mainDirFolderCreated.data.name);

        // upload directory's files
        await uploadDir(pathOfDir, mainDirFolderCreated.data.id ? mainDirFolderCreated.data.id : undefined);

        return mainDirFolderCreated.data.id;
    } catch (error) {
        console.log("Error in creating main directory.", error);
    }

    async function uploadDir(pathOfDir: string, parentId?: string) {
        const files = fs.readdirSync(pathOfDir); // to  read everything inside a directory
        // console.log("Files in dir: ", files);

        for (const file of files) {
            // skip '.git' folder
            if (file === ".git") continue;

            const filePath = path.join(pathOfDir, file);
            const fileStat = fs.statSync(filePath);

            // if current file is directory, need to create a dir since drive is dumb :)
            if (fileStat.isDirectory()) {
                const folder: FileMetadata = {
                    name: file,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId ? parentId : ''],
                };

                try {
                    const createdFolder = await drive.files.create({
                        requestBody: folder,
                        fields: 'id, name',
                    });

                    // console.log("INFO: ", filePath, createdFolder.data.id);
                    console.log("Folder created:", createdFolder.data.name);

                    //recursively upload subdirectories and its files
                    await uploadDir(filePath, createdFolder.data.id ? createdFolder.data.id : undefined);
                } catch (error) {
                    console.log("Error in creating directory.");
                }
            }
            else {
                // if current file is not directory but any file
                const mimeType = mime.lookup(filePath) || 'application/octet-stream';

                const fileMetadata: FileMetadata = {
                    name: file,
                    parents: [parentId ? parentId : ''],
                }
                try {
                    const createdFile = await drive.files.create({
                        requestBody: fileMetadata,
                        media: {
                            mimeType,
                            body: fs.createReadStream(filePath),
                        },
                        fields: 'id, name',
                    })
                    publishLog(id, 'Uploading: ' + createdFile.data.name);
                    // console.log("File created:", createdFile.data.name);
                } catch (error) {
                    publishLog(id, 'Error uploading: ' + file);
                    console.log("Error in creating file: ", error);
                }
            }

        }
    }
}