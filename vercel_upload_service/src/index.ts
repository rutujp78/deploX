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
import status from './db_models/status';
import project from './db_models/project';

const publisher = createClient();
publisher.connect();

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

app.post('/deploy', async (req, res) => {
    const repoUrl = req.body.repoUrl; // github.com/project
    const id = generate(); // ex: 123ab
    const env = req.body.env;

    // D:\projects\vercel_clone\vercel\build\output\randomStr\
    const pathOfDir = path.join(__dirname, 'output', id);

    // git clone repo to server
    await simpleGit().clone(repoUrl, pathOfDir);

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
        // upload clonned repo from server to googleDrive can use aws or any other s3 for efficiency
        const projectFolderId = await uploadFile(id, pathOfDir);
        
        // put project folder id in mongodb;
        const newProject = await project.create({
            github: repoUrl,
            projectId: id,
            folderId: projectFolderId,
        });

        console.log("Files uploaded");
    } catch (error) {
        console.log("Unable to uplaod files");
        return res.status(200).json({
            msg: "Unable to upload repository",
        });
    }

    await publisher.lPush("build-queue", id);

    // similar to,
    // INSERT => SQL
    // .create => MongoDB
    // await publisher.hSet("status", id, "uploaded"); // on redis db set is used to store , ig it is not good to use redis db
    const projectStatus = await status.create({
        projectId: id,
        status: "Uploaded",
    })

    res.json({id: id});
});

app.get('/status', async (req, res) => {
    const id = req.query.id;
    // const response = await subscriber.hGet("status", id as string);
    // res.json({
    //     status: response,
    // })
    const response = await status.findOne({ projectId: id });
    res.json({
        status: response?.status,
    });
})

app.listen(3000, async () => {
    mongoose.connect(process.env.MONGODB_URL || '')
    .then(() => console.log("MongoDB connected"))
    .catch((err: Error) => console.log("Error while connecting mongodb.", err));
    console.log("App listening to port: 3000");
});