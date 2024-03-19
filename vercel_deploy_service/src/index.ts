import path from 'path';
import { createClient } from 'redis';
import { buildProject } from './utls';
import { uploadFile } from './googleDrive_upload';
import dotenv from 'dotenv';
import project from './db_models/project';
import mongoose from 'mongoose';
import simpleGit from 'simple-git';
import fs from 'fs';

const subscriber = createClient();
subscriber.connect();
const publisher = createClient();
publisher.connect();

dotenv.config();
function connectDB() {
    mongoose.connect(process.env.MONGODB_URL || "")
        .then(() => console.log("Connected to mongoDB"))
        .catch((err: Error) => console.log(err));
}
connectDB();

async function publishLog(projectId: string, log: string) {
    await publisher.publish(`logs:${projectId}`, log);
}

async function main() {
    while (true) {
        const queueData = await subscriber.brPop("build-queue", 0);

        if (queueData !== null) {
            const data = JSON.parse(queueData.element); 
            const projectId = data.id;
            const env: string[] = data.env;

            const getProject = await project.findOne({ projectId: projectId });
            const getGithubUrl = getProject?.github || "";

            const pathOfDir = path.join(__dirname, 'output', projectId);

            try {
                publishLog(projectId, 'Clonning git repository');
                await simpleGit().clone(getGithubUrl, pathOfDir);
            } catch (error: any) {
                console.log(error);
                publishLog(projectId, `Error: ${error}`);
            }

            // adding .env variables
            if(env !== undefined) {
                const envContent = env.map((line: string) => line.split(' ').join('=')).join('\n');
                const envFilePath = path.join(pathOfDir, '.env');
                fs.writeFile(envFilePath, envContent, (err) => {
                    if(err) {
                        console.error("Error creating .env file: ", err);
                    }
                    else {
                        console.log(".env file created successfully");
                    }
                });
            }
            
            // build project men
            console.log("Building project");
            publishLog(projectId, 'Building Project');
            await buildProject(projectId);
            
            // upload project to drive again men
            const pathToUpload = path.join(__dirname, `/output/${projectId}/build`);
            
            console.log("Uploading built project");
            publishLog(projectId, 'Uploading built project');
            await uploadFile(projectId, pathToUpload);
            console.log("Uploaded built project");
            publishLog(projectId, 'Uploaded built project');

            publisher.lPush('deploy-queue', projectId);
        }
    }
}

main();