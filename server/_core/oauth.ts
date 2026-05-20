import { SignJWT } from "jose";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

function parseState(state: unknown) {
  if (typeof state !== "string" || !state) return "/";

  try {
    return Buffer.from(state, "base64").toString("utf-8");
  } catch {
    return "/";
  }
}

function readProfile(req: Request) {
  const authUserId =
    String(req.query.userId ?? req.query.sub ?? req.query.id ?? "").trim();

  if (!authUserId) return null;

  return {
    authUserId,
    email: typeof req.query.email === "string" ? req.query.email : null,
    name: typeof req.query.name === "string" ? req.query.name : null,
    loginMethod: "oauth",
  };
}

async function createSessionToken(authUserId: string) {
  const secret = new TextEncoder().encode(ENV.cookieSecret);

  return new SignJWT({ sub: authUserId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(secret);
}

async function handleOAuthCallback(req: Request, res: Response) {
  const redirectTarget = parseState(req.query.state);
  const profile = readProfile(req);

  if (!profile || !ENV.cookieSecret) {
    res.redirect("/");
    return;
  }

  await upsertUser(profile);

  const token = await createSessionToken(profile.authUserId);
  res.cookie(COOKIE_NAME, token, getSessionCookieOptions(req));
  res.redirect(redirectTarget);
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", (req, res, next) => {
    handleOAuthCallback(req, res).catch(next);
  });
}
