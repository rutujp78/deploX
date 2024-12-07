import Redis from "ioredis";
import dotenv from 'dotenv';

dotenv.config();

// @ts-ignore
export const redisSubscriber = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
});