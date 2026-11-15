import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export let redisClient: Redis | null = null;

try {
  if (env.REDIS_URL) redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (process.env.NODE_ENV === 'test' || times > 2) {
        return null; // Stop reconnecting if Redis is unavailable
      }
      return 1000;
    },
    lazyConnect: true,
  });

  redisClient?.on('connect', () => {
    logger.info('Connected to Redis server');
  });

  redisClient?.on('error', (err) => {
    logger.warn({ err: err.message }, 'Redis connection warning (running in degraded cache mode if unavailable)');
  });
} catch (e: any) {
  logger.warn({ err: e.message }, 'Failed to initialize Redis client');
}
