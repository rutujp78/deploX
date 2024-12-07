import Redis from "ioredis";

// const redisUri: string = process.env.REDIS_URI || '';
export const redisPublisher = new Redis();