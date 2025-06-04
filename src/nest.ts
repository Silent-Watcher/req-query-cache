import type {
	CallHandler,
	ExecutionContext,
	NestInterceptor,
} from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { from, Observable } from "rxjs";
import { runWithCache } from "./core";

/**
 * NestJS interceptor that wraps each request in a per-request cache context.
 */
@Injectable()
export class RequestCacheInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		// Wrap the handling in runWithCache so all cachedQuery calls use the same store
		return from(
			runWithCache(async () => {
				// Convert Observable to Promise, then back to Observable
				const data = await next.handle().toPromise();
				return data;
			}),
		);
	}
}
