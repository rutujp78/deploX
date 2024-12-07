import { KafkaConfig } from "./kafkaConfig";
import dotenv from 'dotenv';

dotenv.config();
console.log(process.env.KAFKA_BROKER);
export const kafkaConfig = new KafkaConfig([process.env.KAFKA_BROKER || 'kafka:9092']);

export const initKafka = async () => {
    try {
        await kafkaConfig.connect();
        await kafkaConfig.createTopic(process.env.KAFKA_TOPIC || 'logs');
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}