import Redis from 'ioredis';

/**
 * Redis Pub/Sub Subscriber
 *
 * A DEDICATED Redis client for subscriptions.
 * Redis protocol requires a separate connection for subscribe mode —
 * a subscribed client cannot issue regular commands.
 *
 * This module will be expanded by the Data Fusion Engine (src/core/fusion/)
 * to subscribe to channels published by the Python AI services.
 *
 * Channels (planned):
 *   - `ai:vision:{meetingId}`  — Computer vision / focus data
 *   - `ai:audio:{meetingId}`   — Audio / VAD data
 *
 * Usage:
 *   import { subscriber } from '../infrastructure/redis/pubsub';
 *   subscriber.subscribe('ai:vision:abc123');
 *   subscriber.on('message', (channel, message) => { ... });
 */

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const subscriber = new Redis(REDIS_URL, {
  lazyConnect: true,
});

subscriber.on('connect', () => {
  console.log('[redis:subscriber] Pub/Sub subscriber connected');
});

subscriber.on('error', (err: Error) => {
  console.error('[redis:subscriber] Error:', err.message);
});
