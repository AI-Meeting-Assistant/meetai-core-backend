import Redis from 'ioredis';

/**
 * Redis Client Singleton
 *
 * A single shared client for standard Redis commands (GET, SET, etc.).
 * For Pub/Sub, use a dedicated subscriber client in pubsub.ts.
 *
 * Usage:
 *   import { redisClient } from '../infrastructure/redis/redis.client';
 */

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redisClient = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  console.log('[redis] Connected to Redis');
});

redisClient.on('error', (err: Error) => {
  console.error('[redis] Connection error:', err.message);
});
