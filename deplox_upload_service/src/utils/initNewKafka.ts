import { KafkaConfig } from "./kafkaConfig";
import dotenv from 'dotenv';

dotenv.config();

export const kafkaConfig = new KafkaConfig([process.env.KAFKA_BROKER || 'localhost:9092']);

export const initNewKafa = async (topic: string) => {
    try {
        await kafkaConfig.connect();
        await kafkaConfig.subscribe(topic);
        await kafkaConfig.consume();
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}