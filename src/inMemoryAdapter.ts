import type { PersistentStoreAdapter } from './types';

interface Entry<T> {
  data: T;
  expiresAt: number;
}

export class InMemoryStoreAdapter implements PersistentStoreAdapter {
  private store = new Map<string, Entry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60 * 1000);
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs && ttlMs > 0 ? Date.now() + ttlMs : 0;
    this.store.set(key, { data: value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Optional: call when shutting down to clear interval
  close() {
    clearInterval(this.cleanupInterval);
  }
}