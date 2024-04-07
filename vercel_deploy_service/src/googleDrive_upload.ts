import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import project from './db_models/project';
import producer from './index';
import { google } from 'googleapis';

async function publishLog(projectId: string, log: string) {
    await producer.send({
        topic: 'logs',
        messages: [
            { key: 'log', value: JSON.stringify({ project_id: projectId, log })},
        ]
    });
}

interface FileMetadata {
    name: string;
    mimeType?: string;
    parents?: string[];
}

export async function uploadFile(id: string, pathOfDir: string) {
    // connect kafka
    producer.connect();

    // configure drive
    const drive = google.drive({
        version: 'v3',
        auth: new google.auth.GoogleAuth({
            keyFile: `${process.env.GOOGLE_API_KEY_FILE}`,
            scopes: [`${process.env.GOOGLE_DRIVE_API}`],
        })
    });

    try {
        const mainDirFolder: FileMetadata = {
            name: id,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [`${process.env.DEPLOX_FOLDER_ID}`],
        };
        //create projectid folder in deplox folder/bucket
        const projectDirFolder = await drive.files.create({
            requestBody: mainDirFolder,
            fields: 'id, name',
        });
        console.log("MAIN:", projectDirFolder.data.name);
        const projectDirFolderId = projectDirFolder.data.id;

        // create build folder;
        const createBuildFolder: FileMetadata = {
            name: 'build',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [`${projectDirFolderId}`]
        };
        const createdBuildFolder = await drive.files.create({
            requestBody: createBuildFolder,
            fields: 'id, name',
        });

        // update project details in mongodb
        const updateProjectDetails = await project.updateOne({ projectId: id }, {
            folderId: projectDirFolderId, 
            buildFolderId: createdBuildFolder.data.id,
        });
        
        // upload directory's files
        console.log('Uploading inside build folder with name: ' + createdBuildFolder.data.name);
        await uploadDir(pathOfDir, createdBuildFolder.data.id || '');

    } catch (error) {
        return console.log("Error in creating main directory.");
    }

    async function uploadDir(pathOfDir: string, parentId?: string) {
        const files = fs.readdirSync(pathOfDir); // to  read everything inside a directory

        for (const file of files) {
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
                    publishLog(id, 'Uploading: ' + createdFile.data.name || '');
                    console.log("File created:", createdFile.data.name);
                } catch (error) {
                    publishLog(id, 'Error in uploading: ' + file);
                    console.log("Error in creating file: ", error);
                }
            }

        }
    }
}