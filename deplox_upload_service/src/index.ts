import fs from 'fs';
import path from 'path';
import cors from 'cors';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import project from './db_models/project';
import express from 'express';
import mongoose from 'mongoose';
import { Kafka } from 'kafkajs';
import { generate } from './generate';
import { v4 as uuidv4 } from 'uuid';
// import { createClient as createClientRedis}  from 'redis';
import { createClient as createClientClickhouse} from '@clickhouse/client'

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();
const redisUri: string = process.env.REDIS_URI || '';
const redisPublisher = new Redis(redisUri);

const client = createClientClickhouse({
    host: process.env.CLICKHOUSE_HOST_URL,
    database: 'default',
    username: process.env.CLICKHOUSE_USERNAME,
    password: process.env.CLICKHOUSE_PASSWORD,
})

// to uniquly indentify
const kafka = new Kafka({
    clientId: process.env.KAFKA_CLI_ID,
    brokers: [`${process.env.KAFKA_BROKER}`],
    ssl: {
        ca: [fs.readFileSync(path.join(__dirname, '..', 'kafka.pem')), 'utf-8']
    },
    sasl: {
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || '',
        mechanism: 'plain',
    }
});

// const publisher = createClientRedis();
// publisher.connect();
const consumer = kafka.consumer({ groupId: 'upload_service-logs-consumer' });

app.post('/deploy', async (req, res) => {
    const id = generate();
    const env = req.body.env;
    const repoUrl = req.body.repoUrl;

    try {
        // get the size of repo
        const { pathname } = new URL(repoUrl);
        const [owner, repo] = pathname.split('/').slice(1);

        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const options = {
            headers: {
                'User-Agent': 'node.js',
                'Accept': 'application/vnd.github.v3+json',
            }
        };

        const response = await fetch(apiUrl, options);

        if (!response.ok) {
            // throw new Error(`HTTP error! Status: ${response.status}`);
            return res.status(404).json({ msg: "Unable to fetch repository details" });
        }

        const repoData = await response.json();
        const sizeInKilobytes = repoData.size;
        const sizeInMegabytes = sizeInKilobytes / 1024;

        console.log(`Repository size: ${sizeInMegabytes} MB`);

        if (sizeInMegabytes > 500) {
            return res.status(404).json({ msg: 'Repository size exceeds 500 MB.' });
        }

        console.log('Repository details:', repoData);

        // add project to deploy queue
        const newProject = await project.create({
            github: repoUrl,
            projectId: id,
            status: 'Deploying'
        });
    
    
        const data = { id: id, env: [...env] };
        const jsonString = JSON.stringify(data);
    
        await redisPublisher.lpush("build-queue", jsonString);
        
        // return the repsonse after adding to deploy queue
        return res.status(200).json({id: id});

    } catch (error) {
        console.log(error);
        return res.status(404).json({ msg: "Unable to deploy the project."});   
    }
});

app.get('/logs/:project_id', async (req, res) => {
    // get logs from clickhouse
    const project_id = req.params.project_id;
    const logs = await client.query({
        query: `SELECT event_id, project_id, log, timestamp from log_events where project_id = {project_id:String} order by timestamp`,
        query_params: {
            project_id,
        },
        format: 'JSONEachRow',
    });

    const rawLogs = await logs.json();

    return res.json({ logs: rawLogs });
});

async function initKafkaConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'logs', fromBeginning: true });
    console.log("Kafka connect and subscribed to topic: logs")

    await consumer.run({
        eachBatch: async function ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }) {
            const messages = batch.messages;
            // console.log(`Received ${messages.length} messages...`);
            
            for(const message of messages) {
                if(!message.value) continue;

                // since it is in buffer need to use toString();
                const stringMsg = message.value?.toString();
                const { project_id, log } = JSON.parse(stringMsg || '');
                // console.log({ project_id, log });

                try {
                    const { query_id} = await client.insert({
                        table: 'log_events',
                        values: [{ event_id: uuidv4(), project_id, log}],
                        format: 'JSONEachRow',
                    });
                    // console.log(query_id);

                    resolveOffset(message.offset);
                    // commit to kafka
                    //@ts-ignore
                    await commitOffsetsIfNecessary(message.offset);
                    await heartbeat();
                } catch (error) {
                    console.log(error);
                }
            }
        }
    })
}

initKafkaConsumer();

app.listen(3000, async () => {
    mongoose.connect(process.env.MONGODB_URL || '')
    .then(() => console.log("MongoDB connected"))
    .catch((err: Error) => console.log("Error while connecting mongodb.", err));
    console.log("App listening to port: 3000");
});