import { Admin, Consumer, Kafka } from "kafkajs";
import { pgPool } from "./initPostgres";
import { v4 as uuidv4 } from "uuid";
import dotenv from 'dotenv';

dotenv.config();

export class KafkaConfig {
    private kafka: Kafka;
    private consumer: Consumer;
    private admin: Admin;

    constructor(brokers: string[]) {
        this.kafka = new Kafka({
            clientId: process.env.KAFKA_CLI_ID,
            brokers: brokers,
        });

        this.consumer = this.kafka.consumer({ groupId: 'upload_service-logs-consumer' });
        this.admin = this.kafka.admin();
    }

    async connect() {
        try {
            await this.consumer.connect();
            await this.admin.connect();
            console.log('Kafka connected successfully');
        } catch (error) {
            throw new Error('Something went wrong while connecting kafka' + error);
        }
    }

    async createTopic(topic: string) {
        try {
            const topicExists = await this.admin.listTopics();

            if (!topicExists.includes(topic)) {
                await this.admin.createTopics({
                    topics: [{ topic }],
                });
                console.log('Topic created successfully');
            }
            else console.log('Topic already created');
        } catch (error: any) {
            throw new Error(error);
        }
    }

    async subscribe(topic: string) {
        try {
            await this.consumer.subscribe({ topic: topic, fromBeginning: true });
            console.log(`Kafka subscribed to topic: ${topic}`);
        } catch (error) {
            throw new Error(`Something went wrong while subscribing to topic: ${topic}` + error);
        }
    }

    async consume() {
        await this.consumer.run({
            eachBatch: async function ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }) {
                const messages = batch.messages;

                try {
                    for (const message of messages) {
                        if (!message.value) continue;

                        // buffer -> string
                        const stringMsg: string = message.value?.toString();
                        const { project_id, log } = JSON.parse(stringMsg);
                        // add to db code

                        const query = `INSERT INTO log_events (event_id, project_id, log) VALUES ($1, $2, $3)`;
                        const values = [uuidv4(), project_id, log];

                        await pgPool.query(query, values);

                        // kafka code;
                        resolveOffset(message.offset);
                        //@ts-ignore
                        await commitOffsetsIfNecessary(message.offset);
                        await heartbeat();
                    }
                } catch (error) {
                    console.log(error);
                }

            }
        });
    }

    async disconnect() {
        try {
            await this.consumer.disconnect();
        } catch (error: any) {
            throw new Error(error);
        }
    }
}