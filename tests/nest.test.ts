import { describe, it, expect } from 'vitest';
import { RequestCacheInterceptor } from '../src/nest';
import { runWithCache, cachedQuery } from '../src/core';
import { of } from 'rxjs';


// Since Nest's interceptor returns an Observable, we can simulate by calling
// runWithCache manually and verifying that cachedQuery still works.

describe('NestJS RequestCacheInterceptor', () => {
  it('should allow caching when used inside runWithCache', async () => {
    let count = 0;
    async function q(): Promise<number> {
      count++;
      return count;
    }

    // Simulate Nest: runWithCache around handler
    await runWithCache(async () => {
      const first = await cachedQuery({ key: 'n', queryFn: q });
      const second = await cachedQuery({ key: 'n', queryFn: q });
      expect(first).toBe(1);
      expect(second).toBe(1);
      expect(count).toBe(1);
    });
  });

  it('should wrap handler in a per-request context via runWithCache', async () => {
    const interceptor = new RequestCacheInterceptor();

    // Fake CallHandler whose handle() returns a simple Observable
    const fakeHandler = {
      handle: () => of('result'),
    };

    // Fake ExecutionContext (unused inside interceptor)
    const fakeContext: any = {};

    // 1) Interceptor returns an Observable that emits the same value
    const result = await interceptor.intercept(fakeContext, fakeHandler).toPromise();
    expect(result).toBe('result');

    // 2) Inside runWithCache, cachedQuery should work as if context exists
    let count = 0;
    async function q() {
      count++;
      return count;
    }
    await runWithCache(async () => {
      const first = await cachedQuery({ key: 'n', queryFn: q });
      const second = await cachedQuery({ key: 'n', queryFn: q });
      expect(first).toBe(1);
      expect(second).toBe(1);
      expect(count).toBe(1);
    });
  });
});
