import { describe, it, expect } from 'vitest';
import { runWithCache, cachedQuery } from '../src/core';
import type { PersistentStoreAdapter } from '../src/types';

class SpyAdapter implements PersistentStoreAdapter {
  data = new Map<string, any>();
  gets = 0;
  sets = 0;
  dels = 0;

  async get<T>(key: string): Promise<T | null> {
    this.gets++;
    return this.data.has(key) ? (this.data.get(key) as T) : null;
  }
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.sets++;
    this.data.set(key, value);
    // Ignoring TTL for simplicity
  }
  async del(key: string): Promise<void> {
    this.dels++;
    this.data.delete(key);
  }
}

describe('core: custom PersistentStoreAdapter', () => {
  it('should use the provided storeAdapter instead of default', async () => {
    const spy = new SpyAdapter();
    let qCount = 0;
    async function q() {
      qCount++;
      return `Z${qCount}`;
    }

    // First context: get() returns null, so q() invoked, then set()
    await runWithCache(async () => {
      const r1 = await cachedQuery({
        key: 'z',
        queryFn: q,
        ttlMs: 100,
        storeAdapter: spy,
      });
      expect(r1).toBe('Z1');
      expect(qCount).toBe(1);
      expect(spy.gets).toBe(1);
      expect(spy.sets).toBe(1);
    });

    // Second context before TTL: get() returns 'Z1', so no q() call again
    await runWithCache(async () => {
      const r2 = await cachedQuery({
        key: 'z',
        queryFn: q,
        ttlMs: 100,
        storeAdapter: spy,
      });
      expect(r2).toBe('Z1');
      expect(qCount).toBe(1);
      expect(spy.gets).toBe(2);  // second get
      expect(spy.sets).toBe(1);  // still one set
    });
  });
});