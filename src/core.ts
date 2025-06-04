import { AsyncLocalStorage } from "node:async_hooks";
import { hashKey } from "./hashKey";
import { InMemoryStoreAdapter } from "./inMemoryAdapter";
import type { CachedQueryOptions, PersistentStoreAdapter } from "./types";

/**
 * Per-request store: maps string keys to arbitrary values.
 */
type RequestStore = Map<string, any>;
const requestStore = new AsyncLocalStorage<RequestStore>();

/**
 * Module-level singleton for the default in-memory adapter.
 */
let defaultInMemoryAdapter: InMemoryStoreAdapter | null = null;
function getDefaultAdapter(): InMemoryStoreAdapter {
	if (!defaultInMemoryAdapter) {
		defaultInMemoryAdapter = new InMemoryStoreAdapter();
	}
	return defaultInMemoryAdapter;
}

/**
 * If needed (e.g. in tests), close the singleton’s cleanup interval.
 */
export function closeDefaultAdapter() {
	if (defaultInMemoryAdapter) {
		defaultInMemoryAdapter.close();
		defaultInMemoryAdapter = null;
	}
}

/**
 * Starts a new per-request context. Use this to wrap each Express handler or NestJS execution.
 */
export function runWithCache<T>(fn: () => Promise<T>): Promise<T> {
	const store = new Map<string, any>();
	return requestStore.run(store, fn);
}

/**
 * Retrieves the current per-request store, or undefined if not in a context.
 */
function getRequestStore(): RequestStore | undefined {
	return requestStore.getStore();
}

/**
 * Main cachedQuery function. Handles per-request and optional cross-request (TTL) caching.
 */
export async function cachedQuery<T>(
	options: CachedQueryOptions<T>,
): Promise<T> {
	const {
		key,
		autoKey = false,
		prefix = "",
		args = [],
		queryFn,
		ttlMs = 0,
		storeAdapter,
		forceRefresh = false,
	} = options;

	// Determine key: either user-provided or auto-generated
	let finalKey: string;
	if (autoKey) {
		const raw = JSON.stringify(args);
		const hashed = hashKey(raw);
		finalKey =  prefix ? `${prefix}:${hashed}` : hashed;;
	} else {
		if (!key) {
			throw new Error("`key` is required when `autoKey` is false.");
		}
		finalKey = key;
	}

	// Per-request caching
	const reqStore = getRequestStore();
	if (reqStore && !forceRefresh) {
		if (reqStore.has(finalKey)) {
			return reqStore.get(finalKey) as T;
		}
	}

	// Cross-request (persistent) cache if ttlMs > 0
	let persistentAdapter: PersistentStoreAdapter | null = null;
	if (ttlMs > 0) {
		persistentAdapter = storeAdapter || getDefaultAdapter();
		if (!forceRefresh) {
			const cached = await persistentAdapter.get<T>(finalKey);
			if (cached !== null) {
				// Store into per-request for subsequent calls
				if (reqStore) {
					reqStore.set(finalKey, cached);
				}
				return cached;
			}
		}
	}

	// If we reach here, we need to invoke the query
	const result = await queryFn(...args);

	// Store in per-request
	if (reqStore) {
		reqStore.set(finalKey, result);
	}

	// Store in persistent store if applicable
	if (persistentAdapter && ttlMs > 0) {
		await persistentAdapter.set(finalKey, result, ttlMs);
	}

	return result;
}
