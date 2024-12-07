import { Admin, Consumer, Kafka, Message, Producer } from "kafkajs";

export class KafkaConfig {
    private kafka: Kafka;
    private consumer: Consumer;
    private admin: Admin;
    private producer: Producer;

    constructor(brokers: string[]) {
        this.kafka = new Kafka({
            clientId: process.env.KAFKA_CLI_ID,
            brokers: brokers,
        });

        this.consumer = this.kafka.consumer({ groupId: 'upload_service-logs-consumer' });
        this.producer = this.kafka.producer();
        this.admin = this.kafka.admin();
    }

    async connect() {
        try {
            await this.admin.connect();
            await this.producer.connect();
            console.log('Kafka connected successfully');
        } catch (error) {
            throw new Error('Something went wrong while connecting kafka');
        }
    }

    async createTopic(topic: string) {
        try {
            const topicExists = await this.admin.listTopics();

            if(!topicExists.includes(topic)) {
                await this.admin.createTopics({
                    topics: [{ topic }],
                });
                console.log('Topic created successfully');
            }
        } catch (error) {
            console.log(error);
        }
    }

    async produceMessages(topic: string, messages: Message[]) {
        try {
            await this.producer.send({
                topic: topic,
                messages: messages
            });
        } catch (error) {
            throw new Error('Something went wrong while sending message from kafka' + error);   
        }
    }

    async disconnect() {
        try {
            await this.consumer.disconnect();
            await this.producer.disconnect();
            console.log('Kafka successfully disconnected');
        } catch (error: any) {
            throw new Error('Something went wrong while disconnecting kafka' + error);
        }
    }
}