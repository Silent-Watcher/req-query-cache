import { describe, it, expect } from 'vitest';
import { runWithCache, cachedQuery } from '../src/core';
import { hashKey } from '../src/hashKey';

describe('core: autoKey behavior', () => {
  it('autoKey: same args produce same cache key and caching works per-request', async () => {
    // Prepare expected key manually
    const args = [{ a: 1, b: 2 }];
    const expectedHash = hashKey(JSON.stringify(args));
    const expectedKey = `myprefix:${expectedHash}`;

    let calls = 0;
    async function q(x: number, y: number) {
      calls++;
      return `res-${x}-${y}`;
    }

    // 1) First runWithCache: stores in per-request
    await runWithCache(async () => {
      const r1 = await cachedQuery({
        autoKey: true,
        prefix: 'myprefix',
        args: [1, 2],
        queryFn: () => q(1, 2),
      });
      expect(r1).toBe('res-1-2');
      expect(calls).toBe(1);
    });

    // 2) Next context (no TTL): new per-request store, so q() invoked again
    await runWithCache(async () => {
      const r2 = await cachedQuery({
        autoKey: true,
        prefix: 'myprefix',
        args: [1, 2],
        queryFn: () => q(1, 2),
      });
      expect(r2).toBe('res-1-2');
      expect(calls).toBe(2);
    });

    // 3) Now test with TTL > 0 so cross-request persistent store is used.
    let persistentHits = 0;
    async function q2(x: number, y: number) {
      persistentHits++;
      return `p-${x}-${y}`;
    }
    const autoOpts = {
      autoKey: true as const,
      prefix: 'foo',
      args: [3, 4],
      queryFn: () => q2(3, 4),
      ttlMs: 50,
    };

    // First: q2() invoked and stored in persistent
    await runWithCache(async () => {
      const v1 = await cachedQuery(autoOpts);
      expect(v1).toBe('p-3-4');
      expect(persistentHits).toBe(1);
    });
    // Immediately: new context within TTL → should be served from persistent
    await runWithCache(async () => {
      const v2 = await cachedQuery(autoOpts);
      expect(v2).toBe('p-3-4');
      expect(persistentHits).toBe(1);
    });

    // After TTL expires
    await new Promise((r) => setTimeout(r, 60));
    await runWithCache(async () => {
      const v3 = await cachedQuery(autoOpts);
      expect(v3).toBe('p-3-4');
      expect(persistentHits).toBe(2); // q2() called again
    });
  });
});