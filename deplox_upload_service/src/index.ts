import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { initNewKafa } from './utils/initNewKafka';
import { deploy, logs } from './controller/index';
import { connectDB } from './utils/connectDB';

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

app.post('/deploy', deploy);
app.get('/logs/:project_id', logs);

// initKafkaConsumer();
const topic: string = process.env.KAFKA_TOPIC || 'logs';
initNewKafa(topic);

app.listen(3000, async () => {
    connectDB();
});