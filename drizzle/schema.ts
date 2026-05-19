import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table — app-level profile linked to Neon Auth (neon_auth.user).
 * Neon Auth manages the neon_auth.user table; this public.users table stores
 * app-level profile data linked by the Neon Auth user ID.
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  /** Surrogate PK — use for FK relations between tables. */
  id: serial("id").primaryKey(),
  /** Neon Auth user ID — linked to neon_auth.user table. */
  authUserId: varchar("auth_user_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const applianceModels = pgTable("appliance_models", {
  id: serial("id").primaryKey(),
  modelNumber: varchar("model_number", { length: 64 }).notNull().unique(),
  brand: varchar("brand", { length: 128 }),
  modelName: varchar("model_name", { length: 256 }),
  applianceType: varchar("appliance_type", { length: 64 }),
  dlPartsLookupId: varchar("dl_parts_lookup_id", { length: 64 }).notNull(),
  lastFetched: timestamp("last_fetched", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ApplianceModel = typeof applianceModels.$inferSelect;
export type InsertApplianceModel = typeof applianceModels.$inferInsert;

export const diagramSections = pgTable("diagram_sections", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id")
    .notNull()
    .references(() => applianceModels.id),
  sectionName: varchar("section_name", { length: 256 }).notNull(),
  sectionOrder: integer("section_order").notNull(),
  diagramImageUrl: text("diagram_image_url").notNull(),
  diagramImageKey: varchar("diagram_image_key", { length: 256 }),
  dlPartsSectionId: varchar("dl_parts_section_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DiagramSection = typeof diagramSections.$inferSelect;
export type InsertDiagramSection = typeof diagramSections.$inferInsert;

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id")
    .notNull()
    .references(() => diagramSections.id),
  itemNumber: varchar("item_number", { length: 64 }),
  partNumber: varchar("part_number", { length: 128 }).notNull(),
  description: text("description"),
  price: varchar("price", { length: 64 }),
  availability: varchar("availability", { length: 256 }),
  dlPartsId: varchar("dl_parts_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Part = typeof parts.$inferSelect;
export type InsertPart = typeof parts.$inferInsert;

export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  modelNumber: varchar("model_number", { length: 64 }).notNull(),
  modelId: integer("model_id").references(() => applianceModels.id),
  searchedAt: timestamp("searched_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = typeof searchHistory.$inferInsert;