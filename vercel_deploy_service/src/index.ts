import path from 'path';
import { createClient } from 'redis';
import { downloadDriveFolder } from './googleDrive_download';
import { buildProject } from './utls';
import { uploadFile } from './googleDrive_upload';
import dotenv from 'dotenv';

const subscriber = createClient();
subscriber.connect();
const publisher = createClient();
publisher.connect();

dotenv.config();

async function publishLog(projectId: string, log: string) {
    await publisher.publish(`logs:${projectId}`, log);
}

async function main() {
    while (true) {
        const id = await subscriber.brPop("build-queue", 0);
        // console.log(id);

        if (id !== null) {
            // Get project from drive
            console.log("Downloading project");
            publishLog(id.element, 'Downloading project');
            await downloadDriveFolder(id.element);
            console.log("Project downloaded");
            publishLog(id.element, 'Project downloaded');
            
            // build project men
            console.log("Building project");
            publishLog(id.element, 'Building Project');
            await buildProject(id.element);
            console.log("Built project");
            publishLog(id.element, 'Built project');
            
            // upload project to drive again men
            const pathToUpload = path.join(__dirname, `/output/${id.element}/build`);
            
            console.log("Uploading built project");
            publishLog(id.element, 'Uploading built project');
            await uploadFile(id.element, pathToUpload);
            console.log("Uploaded built project");
            publishLog(id.element, 'Uploaded built project');

            publisher.lPush('deploy-queue', id.element);
        }
    }
}

main();