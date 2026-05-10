import IORedis from 'ioredis';
import { env } from './shared/env.js';

export const cache = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export async function getJsonCache(key) {
  const raw = await cache.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setJsonCache(key, value, ttlSeconds = 60 * 60) {
  await cache.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}
