import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import {
  InsertUser,
  users,
  applianceModels,
  diagramSections,
  parts,
  searchHistory,
} from "../drizzle/schema";

// ─── Primary DB — neon-purple-parts ──────────────────────────────────────────
// Holds: appliance_models, diagram_sections, parts, search_history, BOM data

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const sql = neon(url);
    _db = drizzle(sql);
  }
  return _db;
}

// ─── Secondary DB — neon-rose-xylophone ──────────────────────────────────────
// Holds: service_orders, leads, employees, inventory

let _dbSecondary: ReturnType<typeof drizzle> | null = null;

export function getDbSecondary() {
  if (!_dbSecondary) {
    const url = process.env.DATABASE_URL_SECONDARY;
    if (!url) throw new Error("DATABASE_URL_SECONDARY is not set");
    const sql = neon(url);
    _dbSecondary = drizzle(sql);
  }
  return _dbSecondary;
}

// ─── User operations ──────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.authUserId) {
    throw new Error("User authUserId is required for upsert");
  }

  const db = getDb();

  const updateSet: Partial<InsertUser> = {};
  if (user.name !== undefined) updateSet.name = user.name;
  if (user.email !== undefined) updateSet.email = user.email;
  if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod;
  if (user.role !== undefined) updateSet.role = user.role;
  updateSet.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.updatedAt = new Date();

  await db
    .insert(users)
    .values({ ...user, lastSignedIn: updateSet.lastSignedIn, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: users.authUserId,
      set: updateSet,
    });
}

export async function getUserByAuthId(authUserId: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.authUserId, authUserId))
    .limit(1);
  return result[0] ?? null;
}

// ─── Appliance model operations ───────────────────────────────────────────────

export async function getOrCreateModel(modelNumber: string, dlPartsLookupId: string) {
  const db = getDb();

  const existing = await db
    .select()
    .from(applianceModels)
    .where(eq(applianceModels.modelNumber, modelNumber))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(applianceModels)
    .values({ modelNumber, dlPartsLookupId })
    .onConflictDoUpdate({
      target: applianceModels.modelNumber,
      set: { dlPartsLookupId, updatedAt: new Date() },
    })
    .returning();

  return inserted[0];
}

export async function getDiagramsAndParts(modelId: number) {
  const db = getDb();

  const sections = await db
    .select()
    .from(diagramSections)
    .where(eq(diagramSections.modelId, modelId))
    .orderBy(diagramSections.sectionOrder);

  const sectionsWithParts = await Promise.all(
    sections.map(async (section) => {
      const sectionParts = await db
        .select()
        .from(parts)
        .where(eq(parts.sectionId, section.id));
      return { ...section, parts: sectionParts };
    })
  );

  return sectionsWithParts;
}

// ─── Search history ───────────────────────────────────────────────────────────

export async function addSearchHistory(
  userId: number,
  modelNumber: string,
  modelId?: number
) {
  const db = getDb();
  await db.insert(searchHistory).values({ userId, modelNumber, modelId });
}

export async function getSearchHistory(userId: number, limit = 20) {
  const db = getDb();
  return db
    .select()
    .from(searchHistory)
    .where(eq(searchHistory.userId, userId))
    .orderBy(desc(searchHistory.searchedAt))
    .limit(limit);
}
