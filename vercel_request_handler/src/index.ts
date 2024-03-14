import express from 'express';
import { downloadDriveFolder } from './googleDrive_download';
import path from 'path';
import dotenv from 'dotenv';
import project from './db_models/project';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import status from './db_models/status';

const subscriber = createClient();
subscriber.connect();

const app = express();
dotenv.config();

app.use((req, res, next) => {
    const host = req.hostname;
    const id = host.split('.')[0];
    const outputDir = path.join(__dirname, 'output', id);
    express.static(outputDir)(req, res, next);
})
// app.use(express.static(path.join(__dirname, 'output', id)));

app.get("/*", async (req, res, next) => {
    try {
        // Extract host and id from the request
        const host = req.hostname;
        const id = host.split(".")[0];
        const filePath = req.path;

        const getProject = await status.findOne({
            projectId: id
        });

        if (!getProject || getProject.status !== 'Deployed') {
            return res.send({
                msg: `No such project with id: ${id} is deployed!`,
            })
        }

        if (filePath === '/' || filePath === '/index.html') {
            return res.sendFile(path.join(__dirname, 'output', id, 'index.html'));
        }
        next();

    } catch (error) {
        console.error("Error fetching file:", error);
        return res.status(500).send("Internal Server Error");
    }
})

app.listen(3001, () => {
    mongoose.connect(process.env.MONGODB_URL || "")
        .then(() => console.log("mongoDB connected"))
        .catch(err => console.log(err));
    console.log("App listening on port: " + 3001);

    async function dowloadBuildFolder() {
        while(true) {
            // update downloadDriveFolder use mongoDB
            const id = await subscriber.brPop("deploy-queue", 0);
        
            if(id !== null) {
                const getProject = await project.findOne({
                    projectId: id.element
                });
            
                const projectBuildFolderId = getProject?.buildFolderId || '';
            
                // Get the folder ID associated with the project (replace with your logic)
                await downloadDriveFolder(id.element, projectBuildFolderId); // Implement logic to fetch build folder
                console.log(`Project ${id.element} is ready to serve.`);
        
                const projectStatus = await status.updateOne({ projectId: id.element}, {
                    status: 'deployed',
                });
            }
        }
    }
    
    dowloadBuildFolder();
})