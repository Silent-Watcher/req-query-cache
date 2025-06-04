import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runWithCache, cachedQuery } from '../src/core';

// Dummy query function that counts invocations
let invocationCount = 0;
async function dummyQuery(): Promise<string> {
  invocationCount++;
  return `data-${invocationCount}`;
}

beforeEach(() => {
  invocationCount = 0;
});

describe('core: per-request caching', () => {
  it('should cache within a single runWithCache context', async () => {
    await runWithCache(async () => {
      const first = await cachedQuery({ key: 'foo', queryFn: dummyQuery });
      const second = await cachedQuery({ key: 'foo', queryFn: dummyQuery });

      expect(first).toBe('data-1');
      expect(second).toBe('data-1');
      expect(invocationCount).toBe(1);
    });
  });

  it('should not cache across separate contexts without TTL', async () => {
    await runWithCache(async () => {
      const a = await cachedQuery({ key: 'bar', queryFn: dummyQuery });
      expect(a).toBe('data-1');
    });
    await runWithCache(async () => {
      const b = await cachedQuery({ key: 'bar', queryFn: dummyQuery });
      expect(b).toBe('data-2');
    });
    expect(invocationCount).toBe(2);
  });
});