// In-Memory High-Speed Cache Middleware for TradingView Dashboard Backend
// Prevents event-loop blocking from repeated disk reads & heavy analytics JSON parsing

const cacheStore = new Map();
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Express middleware for high-speed in-memory response caching
 * @param {number} ttlSeconds - Time-to-live in seconds
 */
export function cacheResponse(ttlSeconds = 60) {
  const ttlMs = ttlSeconds * 1000;
  
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const now = Date.now();
    const entry = cacheStore.get(key);

    if (entry && (now - entry.timestamp < entry.ttlMs)) {
      cacheHits++;
      const ageSec = Math.round((now - entry.timestamp) / 1000);
      const remainingSec = Math.max(1, Math.round((entry.ttlMs - (now - entry.timestamp)) / 1000));
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=' + remainingSec);
      if (entry.isJson) {
        return res.json(entry.body);
      }
      if (entry.contentType) {
        res.setHeader('Content-Type', entry.contentType);
      }
      return res.send(entry.body);
    }

    cacheMisses++;
    res.setHeader('X-Cache', 'MISS');

    // Intercept res.json
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(key, {
          timestamp: Date.now(),
          ttlMs,
          body: data,
          isJson: true
        });
      }
      return originalJson(data);
    };

    // Intercept res.send
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && typeof body === 'string') {
        cacheStore.set(key, {
          timestamp: Date.now(),
          ttlMs,
          body,
          isJson: false,
          contentType: res.getHeader('Content-Type')
        });
      }
      return originalSend(body);
    };

    next();
  };
}

/**
 * Purge cache keys matching a substring or regex pattern
 */
export function invalidateCache(pattern) {
  let purgedCount = 0;
  for (const key of cacheStore.keys()) {
    if (!pattern || key.includes(pattern) || (pattern instanceof RegExp && pattern.test(key))) {
      cacheStore.delete(key);
      purgedCount++;
    }
  }
  return purgedCount;
}

/**
 * Get cache engine metrics
 */
export function getCacheMetrics() {
  const total = cacheHits + cacheMisses;
  const hitRatio = total > 0 ? ((cacheHits / total) * 100).toFixed(1) + '%' : '0.0%';
  return {
    cachedEntries: cacheStore.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRatio
  };
}

// Background cleaner to evict expired items every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (now - entry.timestamp >= entry.ttlMs) {
      cacheStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
