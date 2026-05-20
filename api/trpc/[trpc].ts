import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

type VercelRequest = Parameters<typeof nodeHTTPRequestHandler>[0]["req"] & {
  query?: Record<string, string | string[] | undefined>;
};

type VercelResponse = Parameters<typeof nodeHTTPRequestHandler>[0]["res"];

function getTrpcPath(req: VercelRequest) {
  const path = req.query?.trpc;

  if (Array.isArray(path)) return path.join("/");
  return path ?? "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await nodeHTTPRequestHandler({
    router: appRouter,
    req,
    res,
    path: getTrpcPath(req),
    createContext: ({ req, res }) => createContext({ req, res } as Parameters<typeof createContext>[0]),
  });
}
