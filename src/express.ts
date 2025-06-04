import type { NextFunction, Request, RequestHandler, Response } from "express";
import { runWithCache } from "./core";

/**
 * Express middleware that starts a new per-request AsyncLocalStorage context
 * so that calls to `cachedQuery(...)` inside each handler use the same request‐scoped store.
 */
export function expressRequestCache(): RequestHandler {
	return (req: Request, res: Response, next: NextFunction) => {
		// Wrap the rest of the request‐handling chain in runWithCache
		runWithCache(async () => {
			// Simply call next() so downstream middleware/handlers run inside this context
			next();
			// No need to await anything else—once the response ends, the AsyncLocalStorage context is gone.
		}).catch((err) => {
			// If runWithCache itself throws, forward the error
			next(err);
		});
	};
}
