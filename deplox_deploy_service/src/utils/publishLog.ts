import { Message } from "kafkajs";
import { kafkaConfig } from "../configs/initKafka";

export async function publishLog(projectId: string, log: string) {
    try {
        const topic: string = process.env.KAFKA_TOPIC || '';
        const messages: Message[] = [{
            key: 'log', value: JSON.stringify({ project_id: projectId, log })
        }];
        await kafkaConfig.produceMessages(topic, messages);
    } catch (error) {
        throw new Error('Error in publishing log: ' + error);
    }
}
