import type { Express } from "express";
import { storageGetSignedUrl } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res, next) => {
    try {
      const key = req.path.replace(/^\/manus-storage\/?/, "");
      const url = await storageGetSignedUrl(key);
      res.redirect(url);
    } catch (error) {
      next(error);
    }
  });
}
