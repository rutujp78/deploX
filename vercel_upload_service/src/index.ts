import express from 'express';
import cors from 'cors';
import { generate } from './generate';
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

    const newProject = await project.create({
        github: repoUrl,
        projectId: id,
        status: 'Deploying'
    });

    const data = { id: id, env: [...env] };
    const jsonString = JSON.stringify(data);

    await publisher.lPush("build-queue", jsonString);
    publishLog(id, "Project added to build-queue");
    res.json({id: id});
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