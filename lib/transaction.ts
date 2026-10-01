import { AsyncLocalStorage } from "node:async_hooks";
import mongoose, { type ClientSession } from "mongoose";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { ApiErrors } from "@/lib/api-response";

mongoose.set("transactionAsyncLocalStorage", true);
const context = new AsyncLocalStorage<{ session: ClientSession; effects: (() => void)[] }>();
export function transactionSession() { return context.getStore()?.session; }
export function afterCommit(effect: () => void) {
  const current = context.getStore();
  if (current) current.effects.push(effect);
  else effect();
}
export function rethrowTransient(error: unknown) {
  if (error && typeof error === "object" && "hasErrorLabel" in error &&
      typeof error.hasErrorLabel === "function" && error.hasErrorLabel("TransientTransactionError")) throw error;
}
class AbortResponse extends Error {
  constructor(public response: Response) { super("Request aborted"); }
}

/** All Mongoose operations inherit this session. Native collection operations
 * must pass transactionSession() explicitly. Never run parallel DB operations
 * inside the callback. Retries receive a fresh copy of the request body. */
export function transactional<A extends unknown[]>(handler: (request: NextRequest, ...args: A) => Promise<Response>) {
  return async (request: NextRequest, ...args: A): Promise<Response> => {
    try {
      const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
      await connectDB();
      let effects: (() => void)[] = [];
      const response = await mongoose.connection.transaction(async (session) => {
        effects = [];
        return context.run({ session, effects }, async () => {
          const retryRequest = new NextRequest(request.url, {
            method: request.method, headers: new Headers(request.headers),
            ...(body ? { body } : {}),
          });
          const result = await handler(retryRequest, ...args);
          if (result.status >= 400) throw new AbortResponse(result);
          return result;
        });
      });
      for (const effect of effects) {
        try { effect(); } catch (error) { console.error("Post-commit socket update failed", error); }
      }
      return response;
    } catch (error) {
      if (error instanceof AbortResponse) return error.response;
      console.error("Transaction failed", error);
      return ApiErrors.internalError();
    }
  };
}
