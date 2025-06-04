import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryStoreAdapter } from '../src/inMemoryAdapter';

let adapter: InMemoryStoreAdapter;

beforeEach(() => {
  adapter = new InMemoryStoreAdapter();
});

describe('InMemoryStoreAdapter', () => {
  it('should set and get before TTL expires', async () => {
    await adapter.set('key1', 'value1', 1000);
    const val = await adapter.get<string>('key1');
    expect(val).toBe('value1');
  });

  it('should return null after TTL expires', async () => {
    await adapter.set('key2', 'value2', 10);
    // Wait for 20ms to ensure expiration
    await new Promise((r) => setTimeout(r, 20));
    const val = await adapter.get<string>('key2');
    expect(val).toBeNull();
  });

  it('should delete a key', async () => {
    await adapter.set('key3', 'value3', 1000);
    await adapter.del('key3');
    const val = await adapter.get<string>('key3');
    expect(val).toBeNull();
  });

  it('should delete and return null for expired entries', async () => {
	const adapter = new InMemoryStoreAdapter();

	const key = 'test-expired';
	adapter['store'].set(key, {
	  data: 'old-data',
	  expiresAt: Date.now() - 1000, // expired
	});

	const result = await adapter.get(key);
	expect(result).toBeNull();
	expect(adapter['store'].has(key)).toBe(false); // confirm deletion
  });

  it('should clear cleanup interval on close', () => {
	const adapter = new InMemoryStoreAdapter();

	const spy = vi.spyOn(global, 'clearInterval');
	adapter.close();

	expect(spy).toHaveBeenCalledWith(adapter['cleanupInterval']);
	spy.mockRestore();
  });
});