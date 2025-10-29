import { Redis } from '@upstash/redis';

// Detect if we're in build/static generation mode
const isStaticGeneration = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build';
const isBuildTime = process.env.CI === 'true' || isStaticGeneration;

// Initialize Redis client - only on the server side and not during build
const redis = typeof window === 'undefined' && !isBuildTime 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    })
  : null;

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  edge?: boolean; // Whether to use edge caching (Redis)
  local?: boolean; // Whether to use local storage
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Local storage cache helper
const localStorageCache = {
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const item = localStorage.getItem(`cache:${key}`);
      if (!item) return null;

      const { data, expiresAt } = JSON.parse(item) as CacheEntry<T>;
      const now = Date.now();

      // Check if cache is expired
      if (expiresAt < now) {
        localStorage.removeItem(`cache:${key}`);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  },

  set: <T>(key: string, data: T, ttl: number): void => {
    if (typeof window === 'undefined') return;
    
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttl * 1000), // Convert TTL to milliseconds
      };
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      // Handle quota exceeded or other errors
      console.warn('Failed to set localStorage cache:', error);
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`cache:${key}`);
  }
};

// Redis cache helper
const redisCache = {
  get: async <T>(key: string): Promise<T | null> => {
    // Skip Redis during build/static generation
    if (!redis || isBuildTime) return null;
    try {
      const data = await redis.get<T>(`cache:${key}`);
      return data;
    } catch (error) {
      console.warn('Failed to get from Redis cache:', error);
      return null;
    }
  },

  set: async <T>(key: string, data: T, ttl: number): Promise<void> => {
    // Skip Redis during build/static generation
    if (!redis || isBuildTime) return;
    try {
      await redis.set(`cache:${key}`, data, {
        ex: ttl
      });
    } catch (error) {
      console.warn('Failed to set Redis cache:', error);
    }
  },

  remove: async (key: string): Promise<void> => {
    // Skip Redis during build/static generation
    if (!redis || isBuildTime) return;
    try {
      await redis.del(`cache:${key}`);
    } catch (error) {
      console.warn('Failed to remove from Redis cache:', error);
    }
  }
};

/**
 * Main cache function that handles both local and edge caching
 * @param key - The cache key
 * @param fetcher - Function that returns the data to cache
 * @param options - Cache options (ttl, edge, local)
 */
export async function cache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { 
    ttl = 300, // Default 5 minutes
    edge = false,
    local = true 
  } = options;

  // Try local cache first if enabled
  if (local) {
    const localData = localStorageCache.get<T>(key);
    if (localData) {
      // console.log(`[Cache] Local HIT for key: ${key}`);
      return localData;
    }
  }

  // Try Redis cache if enabled and not in build mode
  if (edge && !isBuildTime) {
    const edgeData = await redisCache.get<T>(key);
    if (edgeData) {
      // console.log(`[Cache] Edge HIT for key: ${key}`);
      // Also update local cache if enabled
      if (local) {
        localStorageCache.set(key, edgeData, ttl);
      }
      return edgeData;
    }
  }

  // If no cache hit, fetch fresh data
  // console.log(`[Cache] MISS for key: ${key}. Fetching fresh data.`);
  const data = await fetcher();

  // Store in caches (skip Redis during build)
  if (local) {
    localStorageCache.set(key, data, ttl);
  }

  if (edge && !isBuildTime) {
    await redisCache.set(key, data, ttl);
  }

  return data;
}

/**
 * Invalidate cache entries
 * @param key - The cache key to invalidate
 * @param options - Cache options (edge, local)
 */
export async function invalidateCache(key: string, options: CacheOptions = {}): Promise<void> {
  const { edge = false, local = true } = options;

  if (local) {
    localStorageCache.remove(key);
  }

  // Skip Redis during build/static generation
  if (edge && !isBuildTime) {
    await redisCache.remove(key);
  }
}

/**
 * Generate a deterministic cache key from a base and parameters
 * @param base - The base key
 * @param params - Parameters to include in the key
 */
export function generateCacheKey(base: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  return `${base}:${JSON.stringify(sortedParams)}`;
} 