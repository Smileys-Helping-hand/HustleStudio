/**
 * Simple in-memory cache with TTL support
 */

class CacheEntry {
  constructor(value, ttl) {
    this.value = value;
    this.expiresAt = ttl ? Date.now() + ttl : null;
  }

  isExpired() {
    return this.expiresAt !== null && Date.now() > this.expiresAt;
  }
}

class SimpleCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    if (entry.isExpired()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = null) {
    const entry = new CacheEntry(value, ttl ?? this.defaultTTL);
    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * Remove expired entries
   */
  prune() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton cache instances
export const documentCache = new SimpleCache(10 * 60 * 1000); // 10 minutes for documents
export const aiResponseCache = new SimpleCache(5 * 60 * 1000); // 5 minutes for AI responses

// Auto-prune every 5 minutes
setInterval(() => {
  documentCache.prune();
  aiResponseCache.prune();
}, 5 * 60 * 1000);

/**
 * Generate cache key from object
 * @param {Object} obj - Object to generate key from
 * @returns {string} Cache key
 */
export function generateCacheKey(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Memoize an async function with caching
 * @param {Function} fn - Async function to memoize
 * @param {Object} options - Options
 * @param {SimpleCache} options.cache - Cache instance to use
 * @param {Function} options.keyGenerator - Function to generate cache key from arguments
 * @param {number} options.ttl - TTL for cached values
 * @returns {Function} Memoized function
 */
export function memoizeAsync(fn, options = {}) {
  const {
    cache = aiResponseCache,
    keyGenerator = (...args) => generateCacheKey(args),
    ttl = null
  } = options;

  return async function(...args) {
    const key = keyGenerator(...args);
    
    // Check cache
    const cached = cache.get(key);
    if (cached !== undefined) {
      console.log('[Cache] Hit:', key.substring(0, 50) + '...');
      return cached;
    }

    // Cache miss - call function
    console.log('[Cache] Miss:', key.substring(0, 50) + '...');
    const result = await fn(...args);
    
    // Store in cache
    cache.set(key, result, ttl);
    return result;
  };
}
