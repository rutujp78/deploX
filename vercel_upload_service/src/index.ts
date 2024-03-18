import express from 'express';
import cors from 'cors';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';
import { generate } from './generate';
import { uploadFile } from './googleDrive';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import project from './db_models/project';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';

const publisher = createClient();
publisher.connect();
const subscriber = new Redis();

const io = new Server({ 
    cors: {
        origin: '*',
    }
});

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

async function publishLog(projectId: string, log: string) {
    await publisher.publish(`logs:${projectId}`, log);
}

app.post('/deploy', async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const id = generate();
    const env = req.body.env;

    const pathOfDir = path.join(__dirname, 'output', id);

    res.json({id: id});

    try {
        publishLog(id, 'Clonning git repository');
        await simpleGit().clone(repoUrl, pathOfDir);
        publishLog(id, 'Clonned git repository');
    } catch (error) {
        // console.log("Please enter a valid github repository url");
        return res.status(404).send({msg: "Please enter a valid github repository url"})
    }

    console.log("Uploading Files");
    
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

    try {
        publishLog(id, 'Uploading repository to google drive');
        const projectFolderId = await uploadFile(id, pathOfDir);
        
        const newProject = await project.create({
            github: repoUrl,
            projectId: id,
            folderId: projectFolderId,
            status: 'Deploying'
        });
        
        publishLog(id, 'Uploaded repository to google drive');
        console.log("Files uploaded");
    } catch (error: any) {
        publishLog(id, 'Error: Unable to upload files');
        console.log("Unable to upload files");
        return res.status(500).json({
            msg: "Unable to upload repository",
        });
    }

    await publisher.lPush("build-queue", id);
    publishLog(id, 'Project added to deploy queue');
});

try {
    io.listen(9001);
    console.log('Socket server 9001 is running');
} catch (error) {
    console.error('Failed to start socket server:', error);
}

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel);
        socket.emit('message', `Joined ${channel}`);
    })

    socket.on('error', error => console.log(error));
})

async function initRedisSubscribe() {
    console.log("Subscribed to logs");
    subscriber.psubscribe('logs:*');
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message);
    })
}

initRedisSubscribe();

app.listen(3000, async () => {
    mongoose.connect(process.env.MONGODB_URL || '')
    .then(() => console.log("MongoDB connected"))
    .catch((err: Error) => console.log("Error while connecting mongodb.", err));
    console.log("App listening to port: 3000");
});