import { jwtVerify } from "jose";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "../../drizzle/schema";
import { getUserByAuthId } from "../db";

export type TrpcContext = {
  req: Request;
  user: User | null;
};

/**
 * Extracts the Neon Auth JWT from the Authorization header and resolves the
 * app-level User record. Returns null for unauthenticated requests (public procedures).
 */
export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = opts.req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
      const { payload } = await jwtVerify(token, secret);
      const authUserId = payload.sub ?? (payload.userId as string);
      if (authUserId) {
        user = await getUserByAuthId(authUserId);
      }
    }
  } catch {
    // Invalid/expired token — treat as unauthenticated
    user = null;
  }

  return { req: opts.req, user };
}
