import type {
	CallHandler,
	ExecutionContext,
	NestInterceptor,
} from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { from, lastValueFrom, Observable } from "rxjs";
import { runWithCache } from "./core";

/**
 * NestJS interceptor that wraps each request in a per-request cache context.
 */
@Injectable()
export class RequestCacheInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		// Wrap in runWithCache so all cachedQuery calls see the same store
		return new Observable((subscriber) => {
			runWithCache(async () => {
				// Await the handler using lastValueFrom
				const data = await lastValueFrom(next.handle());
				subscriber.next(data);
				subscriber.complete();
			}).catch((err) => {
				subscriber.error(err);
			});
		});
	}
}
