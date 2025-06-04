export interface CachedQueryOptions<T> {
	/**
	 * If `autoKey` is false (default), this string key is required.
	 * If `autoKey` is true, this is ignored.
	 */
	key?: string;

	/**
	 * If true, generate cache key from `args` via SHA-256 hashing.
	 * Default: false.
	 */
	autoKey?: boolean;

	/**
	 * A string prefix for auto-generated keys. E.g. `prefix = "users"`.
	 * If omitted or empty string, final key is just the hash.
	 */
	prefix?: string;

	/**
	 * Used only when `autoKey = true`. Arguments to pass into `queryFn`.
	 */
	args?: any[];

	/**
	 * The function that actually runs your query. May take arguments (spread).
	 */
	queryFn: (...args: any[]) => Promise<T>;

	/**
	 * TTL (in milliseconds) for the persistent, cross-request cache.
	 * If <= 0 (default), cross-request caching is disabled.
	 */
	ttlMs?: number;

	/**
	 * Custom persistent-store adapter. Must implement `get(key): Promise<T|null>`,
	 * `set(key, value, ttlMs?): Promise<void>`, `del(key): Promise<void>`.
	 * If omitted and `ttlMs > 0`, a module-level, in-memory adapter is used.
	 */
	storeAdapter?: PersistentStoreAdapter;

	/**
	 * If true, ignore any cached values (per-request or TTL) and run `queryFn` anew.
	 * Default: false.
	 */
	forceRefresh?: boolean;
}

export interface PersistentStoreAdapter {
	/** Return stored value or null if none/expired. */
	get<T>(key: string): Promise<T | null>;

	/** Set `value` under `key` with optional TTL in ms (0 = no expiration). */
	set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

	/** Delete any stored entry for `key`. */
	del(key: string): Promise<void>;
}
