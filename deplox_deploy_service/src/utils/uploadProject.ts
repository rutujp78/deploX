import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

import { s3Client } from '../configs';
import { publishLog } from './publishLog';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export const uploadProject = async (projectId: string, pathToUpload: string) => {
    const buildFolderContents = fs.readdirSync(pathToUpload, { recursive: true });
    // console.log(buildFolderContents);
        
    for(const file of buildFolderContents) {
        try {
            const filePath = path.join(pathToUpload, file.toString());
            if(fs.lstatSync(filePath).isDirectory()) continue;
            else {
                const key = path.posix.join('_output', projectId, ...file.toString().split(path.sep));
                // console.log(key);
                const command = new PutObjectCommand({
                    Bucket: 'deplox',
                    Key: key,
                    Body: fs.readFileSync(filePath),
                    ContentType: mime.lookup(filePath) || '',
                });

                await s3Client.send(command);
                await publishLog(projectId, 'Uploading: ' + file);
            }
        } catch (error: any) {
            publishLog(projectId, 'Error in uploading: ' + file);
            console.log('Error in uploading file: ' + file, error);
            throw new Error('Error in uploading project' + error);
        }
    }
}