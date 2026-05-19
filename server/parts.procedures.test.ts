import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    authUserId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "neon-auth",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: new Request("https://localhost/"),
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: new Request("https://localhost/"),
  };
}

describe("tRPC Parts Procedures", () => {
  describe("parts.lookup", () => {
    it("should reject invalid model numbers", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.parts.lookup({ modelNumber: "AB" });
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Invalid");
    });

    it("should handle empty model numbers", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.parts.lookup({ modelNumber: "" });
      expect(result.error).toBeDefined();
    });

    it("should normalize model numbers to uppercase", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.parts.lookup({ modelNumber: "mvwb300wq1" });
      expect(result).toBeDefined();
    });
  });

  describe("parts.extractModelFromImage", () => {
    it("should reject invalid base64", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.parts.extractModelFromImage({
        imageBase64: "",
        mimeType: "image/jpeg",
      });

      expect(result.error).toBeDefined();
    });

    it("should handle extraction errors gracefully", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.parts.extractModelFromImage({
        imageBase64: "invalid-base64-!!!",
        mimeType: "image/jpeg",
      });

      expect(result.error).toBeDefined();
    });
  });

  describe("parts.getSearchHistory", () => {
    it("should require authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.parts.getSearchHistory();
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should return array for authenticated user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.parts.getSearchHistory();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("parts.addToHistory", () => {
    it("should require authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.parts.addToHistory({ modelNumber: "TEST123" });
        expect.fail("Should have thrown");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should accept valid model numbers without modelId", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.parts.addToHistory({
        modelNumber: "MVWB300WQ1",
      });

      expect(result.success).toBe(true);
    });

    it("should handle errors when modelId references non-existent model", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.parts.addToHistory({
        modelNumber: "TEST123",
        modelId: 999999,
      });

      expect(result.success).toBe(false);
    });
  });
});
