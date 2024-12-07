import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import project from './db_models/project';
import simpleGit from 'simple-git';
import { initKafka, redisSubscriber } from './configs';
import { connectDB, publishLog, createEnvFile, buildProject, uploadProject } from './utils';

dotenv.config();

async function main() {
    await connectDB();
    await initKafka();

    while (true) {
        try {
            console.log('getting id from redis');
            const queueData = await redisSubscriber.brpop("build-queue", 0) || '';
            if (queueData !== null) {
                const data = JSON.parse(queueData[1]);
                const projectId = data.id;
                const env: string[] = data.env;
                console.log('projectId: ' + projectId);
                
                const getProject = await project.findOne({ projectId: projectId });
                const getGithubUrl = getProject?.github || '';
                if(getGithubUrl === undefined || getGithubUrl.length === 0) throw new Error('Invalid github repository url.');
                const pathOfDir = path.join(__dirname, 'output', projectId);
                await publishLog(projectId, 'Clonning git repository');
                await simpleGit().clone(getGithubUrl, pathOfDir);

                // adding .env variables
                if (env !== undefined) {
                    await createEnvFile(env, pathOfDir);
                }

                // build project
                await publishLog(projectId, 'Building Project');
                // console.log('Building project with id: ' + projectId);
                await buildProject(projectId);
                await publishLog(projectId, 'Build complete');

                // upload project to drive again men
                const pathToUpload1 = path.join(__dirname, 'output', projectId, 'build');
                const pathToUpload2 = path.join(__dirname, 'output', projectId, 'dist');
                // console.log(pathToUpload1);
                // console.log(pathToUpload2);
                if(fs.existsSync(pathToUpload1)) await uploadProject(projectId, pathToUpload1);
                else if(fs.existsSync(pathToUpload2)) await uploadProject(projectId, pathToUpload2);
                else {
                    publishLog(projectId, `Make sure build directory is named as 'build' or 'dist'`);
                    throw new Error('Build directory does not exits.');
                }
                await publishLog(projectId, 'Uploading project');
                await publishLog(projectId, 'Upload complete');

                const updateProject = await project.updateOne({ projectId: projectId }, { status: "Deployed" });

                await publishLog(projectId, 'Project deployed');
            }
        } catch (error: any) {
            console.log(error);
        }
    }
}

main();