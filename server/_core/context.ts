import { jwtVerify } from "jose";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { getUserByAuthId } from "../db";

export type TrpcContext = {
  req: Request;
  res: Response;
  user: User | null;
};

/**
 * Extracts the Neon Auth JWT from the Authorization header and resolves the
 * app-level User record. Returns null for unauthenticated requests (public procedures).
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const rawAuthHeader = opts.req.headers.authorization;
    const authHeader = Array.isArray(rawAuthHeader)
      ? rawAuthHeader[0]
      : rawAuthHeader ?? "";
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

  return { req: opts.req, res: opts.res, user };
}
