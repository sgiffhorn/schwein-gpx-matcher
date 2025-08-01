// src/cacheService.js
import NodeCache from 'node-cache';

const ttl = parseInt(process.env.CACHE_TTL || '3600', 10);
const cache = new NodeCache({ stdTTL: ttl });

export function getCache(key) {
  return cache.get(key);
}
export function setCache(key, val) {
  cache.set(key, val);
}
export function deleteCache(key) {
  cache.del(key);
}