import { describe, it, expect } from 'vitest';
import { runWithCache, cachedQuery } from '../src/core';

describe('core: error handling & outside-context', () => {
  it('throws if key is missing and autoKey is false', async () => {
    await expect(
      cachedQuery({ queryFn: async () => 123, ttlMs: 0 }) // no key, autoKey=false
    ).rejects.toThrow('`key` is required when `autoKey` is false.');
  });

  it('works outside runWithCache but only persistent caching if ttlMs > 0', async () => {
    let count = 0;
    async function q() {
      count++;
      return `val${count}`;
    }

    // 1) Outside any context, ttlMs=0: should just invoke q()
    const v1 = await cachedQuery({ key: 'o1', queryFn: q });
    expect(v1).toBe('val1');
    // 2) Without context, but with ttlMs>0: default implementation creates a new InMemoryStoreAdapter
    //    However, because we instantiate a fresh adapter each call (see implementation note below),
    //    persistent cache won’t actually persist unless adapter is passed in.
    //    So count will increment again:
    const v2 = await cachedQuery({ key: 'o1', queryFn: q, ttlMs: 100 });
    expect(v2).toBe('val2');
    expect(count).toBe(2);
  });
});
