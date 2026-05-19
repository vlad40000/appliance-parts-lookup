import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const applianceModels = mysqlTable("appliance_models", {
  id: int("id").autoincrement().primaryKey(),
  modelNumber: varchar("model_number", { length: 64 }).notNull().unique(),
  brand: varchar("brand", { length: 128 }),
  modelName: varchar("model_name", { length: 256 }),
  applianceType: varchar("appliance_type", { length: 64 }),
  dlPartsLookupId: varchar("dl_parts_lookup_id", { length: 64 }).notNull(),
  lastFetched: timestamp("last_fetched"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ApplianceModel = typeof applianceModels.$inferSelect;
export type InsertApplianceModel = typeof applianceModels.$inferInsert;

export const diagramSections = mysqlTable("diagram_sections", {
  id: int("id").autoincrement().primaryKey(),
  modelId: int("model_id").notNull().references(() => applianceModels.id),
  sectionName: varchar("section_name", { length: 256 }).notNull(),
  sectionOrder: int("section_order").notNull(),
  diagramImageUrl: text("diagram_image_url").notNull(),
  diagramImageKey: varchar("diagram_image_key", { length: 256 }),
  dlPartsSectionId: varchar("dl_parts_section_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DiagramSection = typeof diagramSections.$inferSelect;
export type InsertDiagramSection = typeof diagramSections.$inferInsert;

export const parts = mysqlTable("parts", {
  id: int("id").autoincrement().primaryKey(),
  sectionId: int("section_id").notNull().references(() => diagramSections.id),
  itemNumber: varchar("item_number", { length: 64 }),
  partNumber: varchar("part_number", { length: 128 }).notNull(),
  description: text("description"),
  price: varchar("price", { length: 64 }),
  availability: varchar("availability", { length: 256 }),
  dlPartsId: varchar("dl_parts_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Part = typeof parts.$inferSelect;
export type InsertPart = typeof parts.$inferInsert;

export const searchHistory = mysqlTable("search_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  modelNumber: varchar("model_number", { length: 64 }).notNull(),
  modelId: int("model_id").references(() => applianceModels.id),
  searchedAt: timestamp("searched_at").defaultNow().notNull(),
});

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;