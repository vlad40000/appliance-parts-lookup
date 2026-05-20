import express, { type Express } from "express";
import fs from "fs";
import { createServer as createViteServer, createLogger } from "vite";
import type { Server } from "http";
import path from "path";

const viteLogger = createLogger();
const root = path.resolve(import.meta.dirname, "..", "..");

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    configFile: path.resolve(root, "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const templatePath = path.resolve(root, "client", "index.html");
      let template = await fs.promises.readFile(templatePath, "utf-8");

      template = await vite.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(root, "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find static build directory: ${distPath}`);
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
