export interface CachedQueryOptions<T> {
	key?: string;
	autoKey?: boolean;
	prefix?: string;
	args?: any[];
	queryFn: (...args: any[]) => Promise<T>;
	ttlMs?: number;
	storeAdapter?: PersistentStoreAdapter;
	forceRefresh?: boolean;
  }

  export interface PersistentStoreAdapter {
	get<T>(key: string): Promise<T | null>;
	set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
	del(key: string): Promise<void>;
  }