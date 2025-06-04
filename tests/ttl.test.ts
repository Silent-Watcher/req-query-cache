import { describe, it, expect } from 'vitest';
import { runWithCache, cachedQuery } from '../src/core';

describe('core: cross-request TTL caching', () => {
  it('should cache across contexts when ttlMs > 0, then expire after TTL', async () => {
    let hits = 0;
    async function q() {
      hits++;
      return `v${hits}`;
    }

    // 1) First context: should call q() once and store per-request + persistent
    await runWithCache(async () => {
      const a1 = await cachedQuery({ key: 'x', queryFn: q, ttlMs: 50 });
      expect(a1).toBe('v1');
      expect(hits).toBe(1);
    });

    // 2) Immediately: new context with same key+ttl => served from persistent store
    await runWithCache(async () => {
      const a2 = await cachedQuery({ key: 'x', queryFn: q, ttlMs: 50 });
      expect(a2).toBe('v1');          // no new call
      expect(hits).toBe(1);
    });

    // 3) Wait past TTL
    await new Promise((r) => setTimeout(r, 60));

    // 4) After expiration: new context should invoke q() again
    await runWithCache(async () => {
      const a3 = await cachedQuery({ key: 'x', queryFn: q, ttlMs: 50 });
      expect(a3).toBe('v2');
      expect(hits).toBe(2);
    });
  });

  it('forceRefresh should bypass both per-request and persistent stores', async () => {
    let hits = 0;
    async function q() {
      hits++;
      return `v${hits}`;
    }

    // Seed TTL store
    await runWithCache(async () => {
      const v1 = await cachedQuery({ key: 'y', queryFn: q, ttlMs: 100 });
      expect(v1).toBe('v1');
    });
    expect(hits).toBe(1);

    // New context with forceRefresh: should bypass persistent cache and run q() again
    await runWithCache(async () => {
      const bypassed = await cachedQuery({
        key: 'y',
        queryFn: q,
        ttlMs: 100,
        forceRefresh: true,
      });
      expect(bypassed).toBe('v2');
      expect(hits).toBe(2);
    });

    // Immediately after, persistent store now holds v2, so no new call in a fresh context
    await runWithCache(async () => {
      const served = await cachedQuery({ key: 'y', queryFn: q, ttlMs: 100 });
      expect(served).toBe('v2');
      expect(hits).toBe(2);
    });
  });
});