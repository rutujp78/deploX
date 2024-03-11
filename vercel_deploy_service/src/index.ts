import path from 'path';
import { createClient } from 'redis';
import { downloadDriveFolder } from './googleDrive_download';
import { buildProject } from './utls';
import { uploadFile } from './googleDrive_upload';
import dotenv from 'dotenv';

const subscriber = createClient();
subscriber.connect();

dotenv.config();

async function main() {
    while(true) {
        // poll id from queue
        // this is sooo noob
        // const id = await subscriber.rPop("build-queue");
        // console.log(id);

        //now this is some pero kode
        const id = await subscriber.brPop("build-queue", 0);
        // console.log(id);

        if(id !== null) {
            // Get project from drive
            console.log("Downloading project");
            await downloadDriveFolder(id.element);
            console.log("Project downloaded");

            // build project men
            console.log("Building project");
            await buildProject(id.element);
            console.log("Built project");

            // upload project to drive again men
            const pathToUpload = path.join(__dirname, `/output/${id.element}/build`);
            console.log("Uploading built project");
            await uploadFile(id.element, pathToUpload);
            console.log("Uploaded built project");
        }
    }
}

main();