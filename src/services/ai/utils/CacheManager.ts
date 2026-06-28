interface CacheEntry {
  response: string;
  timestamp: number;
  ttlMs: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  // Default TTL: 1 hour
  private readonly DEFAULT_TTL_MS = 1000 * 60 * 60;

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  async set(key: string, response: string, ttlMs?: number): Promise<void> {
    this.cache.set(key, { 
      response, 
      timestamp: Date.now(),
      ttlMs: ttlMs ?? this.DEFAULT_TTL_MS
    });
  }

  generateKey(prompt: string, options?: any): string {
    return `${prompt}_${JSON.stringify(options || {})}`;
  }

  /** Invalidate all cache entries whose keys contain the given pattern */
  invalidate(keyPattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  /** Clear the entire cache */
  clear(): void {
    this.cache.clear();
  }
}
