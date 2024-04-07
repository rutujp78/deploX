import fs from 'fs';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import project from './db_models/project';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import { createClient as createClientRedis } from 'redis';
import { downloadDriveFolder } from './googleDrive_download';

const app = express();
dotenv.config();

const subscriber = createClientRedis();
subscriber.connect();

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLI_ID,
    brokers: [`${process.env.KAFKA_BROKER}`],
    ssl: {
        ca: [fs.readFileSync(path.join(__dirname, '..', 'kafka.pem')), 'utf-8'],
    },
    sasl: {
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || '',
        mechanism: 'plain',
    }
});

const producer = kafka.producer();

app.use(cors());
app.use((req, res, next) => {
    const host = req.hostname;
    const id = host.split('.')[0];
    const outputDir = path.join(__dirname, 'output', id);
    express.static(outputDir)(req, res, next);
})
// app.use(express.static(path.join(__dirname, 'output', id)));


async function publishLog(projectId: string, log: string) {
    await producer.send({
        topic: 'logs',
        messages: [
            { key: 'log', value: JSON.stringify({ project_id: projectId, log })},
        ],
    });
}

app.get("/*", async (req, res, next) => {
    try {
        // Extract host and id from the request
        const host = req.hostname;
        const id = host.split(".")[0];
        const filePath = req.path;

        const getProject = await project.findOne({
            projectId: id
        });

        if (!getProject || getProject.status !== 'Deployed') {
            return res.send({
                msg: `No such project with id: ${id} is deployed!`,
            });
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

app.listen(3001, async () => {
    mongoose.connect(process.env.MONGODB_URL || "")
        .then(() => console.log("mongoDB connected"))
        .catch(err => console.log(err));
    console.log("App listening on port: " + 3001);

    await producer.connect();

    async function dowloadBuildFolder() {
        while (true) {
            // update downloadDriveFolder use mongoDB
            const id = await subscriber.brPop("deploy-queue", 0);

            if (id !== null) {
                const getProject = await project.findOne({
                    projectId: id.element
                });

                const projectBuildFolderId = getProject?.buildFolderId || '';

                publishLog(id.element, 'Deploying project');

                // Get the folder ID associated with the project (replace with your logic)
                await downloadDriveFolder(id.element, projectBuildFolderId); // Implement logic to fetch build folder
                console.log(`Project ${id.element} is ready to serve.`);

                const updateProject = await project.updateOne({ projectId: id.element }, {
                    status: "Deployed"
                })

                publishLog(id.element, 'Project deployed');
            }
        }
    }

    dowloadBuildFolder();
})