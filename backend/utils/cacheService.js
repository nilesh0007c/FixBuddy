// backend/utils/cacheService.js  — NEW
const redis  = require('../config/redis');
const logger = require('../config/logger');

const DEFAULT_TTL = 300; // 5 minutes

const cache = {
  /**
   * Get from cache. Returns parsed value or null.
   */
  async get(key) {
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      logger.warn(`Cache GET error for key ${key}:`, err.message);
      return null;
    }
  },

  /**
   * Set in cache with optional TTL (seconds)
   */
  async set(key, value, ttl = DEFAULT_TTL) {
    try {
      await redis.setEx(key, ttl, JSON.stringify(value));
    } catch (err) {
      logger.warn(`Cache SET error for key ${key}:`, err.message);
    }
  },

  /**
   * Delete from cache
   */
  async del(key) {
    try { await redis.del(key); }
    catch (err) { logger.warn(`Cache DEL error for key ${key}:`, err.message); }
  },

  /**
   * Delete all keys matching pattern (e.g. 'providers:*')
   */
  async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(keys);
    } catch (err) { logger.warn(`Cache DEL pattern error:`, err.message); }
  }
};

// ── Cache key generators (centralized to avoid typos) ────────────────────────
const CacheKeys = {
  providers:     (filters) => `providers:${JSON.stringify(filters)}`,
  providerById:  (id)      => `provider:${id}`,
  dashboardStats:()        => 'admin:dashboard:stats',
  userById:      (id)      => `user:${id}`,
  bookingById:   (id)      => `booking:${id}`,
};

// ── Cache middleware factory ─────────────────────────────────────────────────
const cacheMiddleware = (keyFn, ttl = DEFAULT_TTL) => async (req, res, next) => {
  const key     = keyFn(req);
  const cached  = await cache.get(key);
  if (cached) {
    return res.json({ success: true, data: cached, fromCache: true });
  }
  // Override res.json to intercept and cache the response
  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (body?.success && body?.data) cache.set(key, body.data, ttl);
    return origJson(body);
  };
  next();
};

module.exports = { cache, CacheKeys, cacheMiddleware };

// ── Usage example in providerRoutes.js ────────────────────────────────────────
// const { cacheMiddleware, CacheKeys } = require('../utils/cacheService');
//
// router.get('/', cacheMiddleware(req => CacheKeys.providers(req.query), 120), ctrl.getProviders);
// router.get('/:id', cacheMiddleware(req => CacheKeys.providerById(req.params.id), 300), ctrl.getProvider);
//
// On update/delete, invalidate:
// await cache.delPattern('providers:*');
// await cache.del(CacheKeys.providerById(id));
