import { pgTable, text, varchar, integer, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================
// Core data model
// ==========================

export type RatingGrade = "S" | "A" | "B" | "C" | "D" | "E" | "F";

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  // Google Apps Script Web App URL (for GitHub Pages to call)
  sheetsEndpointUrl: text("sheets_endpoint_url").notNull(),
  // Optional shared token enforced by Apps Script (simple protection)
  apiToken: text("api_token"),
});

export const scoringFields = pgTable("scoring_fields", {
  id: serial("id").primaryKey(),
  scope: varchar("scope", { length: 20 }).notNull(), // 'team' | 'match'
  key: varchar("key", { length: 64 }).notNull(),
  label: text("label").notNull(),
  inputType: varchar("input_type", { length: 20 }).notNull(), // 'grade' | 'number' | 'text'
  enabled: integer("enabled").notNull().default(1),
  order: integer("order").notNull().default(0),
  // scoringRule is used for aggregation/comparison
  // e.g. {"mode":"grade","weights":{"S":5,"A":4,"B":3,"C":2,"D":1,"E":0,"F":0}}
  // or {"mode":"number"} or {"mode":"text"}
  scoringRule: jsonb("scoring_rule").notNull().default({}),
});

export const teamEntries = pgTable("team_entries", {
  id: serial("id").primaryKey(),
  teamNumber: integer("team_number").notNull(),
  // key-value map: { [fieldKey]: value }
  values: jsonb("values").notNull().default({}),
});

export const matchEntries = pgTable("match_entries", {
  id: serial("id").primaryKey(),
  teamNumber: integer("team_number").notNull(),
  matchNumber: integer("match_number").notNull(),
  values: jsonb("values").notNull().default({}),
});

// ==========================
// Zod schemas (shared)
// ==========================

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

export const insertScoringFieldSchema = createInsertSchema(scoringFields).omit({ id: true });
export type InsertScoringField = z.infer<typeof insertScoringFieldSchema>;
export type ScoringField = typeof scoringFields.$inferSelect;

export const insertTeamEntrySchema = createInsertSchema(teamEntries).omit({ id: true });
export type InsertTeamEntry = z.infer<typeof insertTeamEntrySchema>;
export type TeamEntry = typeof teamEntries.$inferSelect;

export const insertMatchEntrySchema = createInsertSchema(matchEntries).omit({ id: true });
export type InsertMatchEntry = z.infer<typeof insertMatchEntrySchema>;
export type MatchEntry = typeof matchEntries.$inferSelect;

// ==========================
// Explicit API contract types
// ==========================

export type CreateSettingsRequest = InsertSettings;
export type UpdateSettingsRequest = Partial<InsertSettings>;

export type CreateScoringFieldRequest = InsertScoringField;
export type UpdateScoringFieldRequest = Partial<InsertScoringField>;

export type CreateTeamEntryRequest = InsertTeamEntry;
export type UpdateTeamEntryRequest = Partial<InsertTeamEntry>;

export type CreateMatchEntryRequest = InsertMatchEntry;
export type UpdateMatchEntryRequest = Partial<InsertMatchEntry>;

export type SettingsResponse = Settings;
export type ScoringFieldResponse = ScoringField;
export type TeamEntryResponse = TeamEntry;
export type MatchEntryResponse = MatchEntry;

export type TeamEntriesListResponse = TeamEntryResponse[];
export type MatchEntriesListResponse = MatchEntryResponse[];

export interface TeamQuery {
  teamNumber: number;
}

export interface MatchQuery {
  teamNumber: number;
  matchNumber?: number;
}

export interface CompareTeamsQuery {
  teamNumbers: number[]; // max 8
}

export interface AggregationResult {
  teamNumber: number;
  teamAverages: Record<string, number | null>;
  matchAverages: Record<string, number | null>;
  matchCount: number;
}

export interface TeamFullRecord {
  team: TeamEntryResponse | null;
  matches: MatchEntryResponse[];
}