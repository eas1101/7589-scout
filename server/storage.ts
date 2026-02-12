import { db } from "./db";
import { settings, scoringFields, teamEntries, matchEntries } from "@shared/schema";
import type {
  SettingsResponse,
  CreateSettingsRequest,
  UpdateSettingsRequest,
  ScoringFieldResponse,
  CreateScoringFieldRequest,
  UpdateScoringFieldRequest,
  TeamEntryResponse,
  CreateTeamEntryRequest,
  UpdateTeamEntryRequest,
  MatchEntryResponse,
  CreateMatchEntryRequest,
  UpdateMatchEntryRequest,
  TeamFullRecord,
  AggregationResult,
} from "@shared/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

export interface IStorage {
  getSettings(): Promise<SettingsResponse | null>;
  upsertSettings(req: CreateSettingsRequest | UpdateSettingsRequest): Promise<SettingsResponse>;

  listFields(scope?: "team" | "match"): Promise<ScoringFieldResponse[]>;
  createField(req: CreateScoringFieldRequest): Promise<ScoringFieldResponse>;
  updateField(id: number, req: UpdateScoringFieldRequest): Promise<ScoringFieldResponse | undefined>;
  deleteField(id: number): Promise<boolean>;

  listTeams(): Promise<TeamEntryResponse[]>;
  getTeam(teamNumber: number): Promise<TeamFullRecord>;
  upsertTeam(teamNumber: number, req: CreateTeamEntryRequest | UpdateTeamEntryRequest): Promise<TeamEntryResponse>;

  listMatchesByTeam(teamNumber: number): Promise<MatchEntryResponse[]>;
  upsertMatch(
    teamNumber: number,
    matchNumber: number,
    req: CreateMatchEntryRequest | UpdateMatchEntryRequest,
  ): Promise<MatchEntryResponse>;
  deleteMatch(teamNumber: number, matchNumber: number): Promise<boolean>;

  aggregate(teamNumbers?: number[]): Promise<AggregationResult[]>;
}

function gradeToScore(grade: unknown): number | null {
  if (typeof grade !== "string") return null;
  const g = grade.trim().toUpperCase();
  const weights: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1, E: 0, F: 0 };
  return g in weights ? weights[g] : null;
}

function valueToNumber(fieldInputType: string, value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (fieldInputType === "number") {
    const n = typeof value === "number" ? value : Number(String(value));
    return Number.isFinite(n) ? n : null;
  }
  if (fieldInputType === "grade") {
    return gradeToScore(value);
  }
  return null;
}

export class DatabaseStorage implements IStorage {
  async getSettings(): Promise<SettingsResponse | null> {
    const rows = await db.select().from(settings).limit(1);
    return rows[0] ?? null;
  }

  async upsertSettings(req: CreateSettingsRequest | UpdateSettingsRequest): Promise<SettingsResponse> {
    const existing = await this.getSettings();
    if (!existing) {
      const [created] = await db.insert(settings).values(req as CreateSettingsRequest).returning();
      return created;
    }
    const [updated] = await db
      .update(settings)
      .set(req)
      .where(eq(settings.id, existing.id))
      .returning();
    return updated;
  }

  async listFields(scope?: "team" | "match"): Promise<ScoringFieldResponse[]> {
    if (scope) {
      return await db
        .select()
        .from(scoringFields)
        .where(eq(scoringFields.scope, scope))
        .orderBy(asc(scoringFields.order), asc(scoringFields.id));
    }
    return await db.select().from(scoringFields).orderBy(asc(scoringFields.order), asc(scoringFields.id));
  }

  async createField(req: CreateScoringFieldRequest): Promise<ScoringFieldResponse> {
    const [created] = await db.insert(scoringFields).values(req).returning();
    return created;
  }

  async updateField(id: number, req: UpdateScoringFieldRequest): Promise<ScoringFieldResponse | undefined> {
    const [updated] = await db.update(scoringFields).set(req).where(eq(scoringFields.id, id)).returning();
    return updated;
  }

  async deleteField(id: number): Promise<boolean> {
    const rows = await db.delete(scoringFields).where(eq(scoringFields.id, id)).returning();
    return rows.length > 0;
  }

  async listTeams(): Promise<TeamEntryResponse[]> {
    return await db.select().from(teamEntries).orderBy(asc(teamEntries.teamNumber));
  }

  async getTeam(teamNumber: number): Promise<TeamFullRecord> {
    const teamRows = await db
      .select()
      .from(teamEntries)
      .where(eq(teamEntries.teamNumber, teamNumber))
      .limit(1);
    const matchesRows = await this.listMatchesByTeam(teamNumber);
    return { team: teamRows[0] ?? null, matches: matchesRows };
  }

  async upsertTeam(
    teamNumber: number,
    req: CreateTeamEntryRequest | UpdateTeamEntryRequest,
  ): Promise<TeamEntryResponse> {
    const existing = await db
      .select()
      .from(teamEntries)
      .where(eq(teamEntries.teamNumber, teamNumber))
      .limit(1);

    if (!existing[0]) {
      const [created] = await db
        .insert(teamEntries)
        .values({ teamNumber, values: (req as any).values ?? {} })
        .returning();
      return created;
    }

    const newValues = (req as any).values ?? existing[0].values;
    const [updated] = await db
      .update(teamEntries)
      .set({ values: newValues })
      .where(eq(teamEntries.teamNumber, teamNumber))
      .returning();
    return updated;
  }

  async listMatchesByTeam(teamNumber: number): Promise<MatchEntryResponse[]> {
    return await db
      .select()
      .from(matchEntries)
      .where(eq(matchEntries.teamNumber, teamNumber))
      .orderBy(asc(matchEntries.matchNumber), asc(matchEntries.id));
  }

  async upsertMatch(
    teamNumber: number,
    matchNumber: number,
    req: CreateMatchEntryRequest | UpdateMatchEntryRequest,
  ): Promise<MatchEntryResponse> {
    const existing = await db
      .select()
      .from(matchEntries)
      .where(and(eq(matchEntries.teamNumber, teamNumber), eq(matchEntries.matchNumber, matchNumber)))
      .limit(1);

    if (!existing[0]) {
      const [created] = await db
        .insert(matchEntries)
        .values({ teamNumber, matchNumber, values: (req as any).values ?? {} })
        .returning();
      return created;
    }

    const newValues = (req as any).values ?? existing[0].values;
    const [updated] = await db
      .update(matchEntries)
      .set({ values: newValues })
      .where(and(eq(matchEntries.teamNumber, teamNumber), eq(matchEntries.matchNumber, matchNumber)))
      .returning();
    return updated;
  }

  async deleteMatch(teamNumber: number, matchNumber: number): Promise<boolean> {
    const rows = await db
      .delete(matchEntries)
      .where(and(eq(matchEntries.teamNumber, teamNumber), eq(matchEntries.matchNumber, matchNumber)))
      .returning();
    return rows.length > 0;
  }

  async aggregate(teamNumbers?: number[]): Promise<AggregationResult[]> {
    const enabledTeamFields = (await this.listFields("team")).filter((f) => f.enabled === 1);
    const enabledMatchFields = (await this.listFields("match")).filter((f) => f.enabled === 1);

    const teams = teamNumbers && teamNumbers.length > 0
      ? await db.select().from(teamEntries).where(inArray(teamEntries.teamNumber, teamNumbers))
      : await db.select().from(teamEntries);

    const results: AggregationResult[] = [];

    for (const t of teams) {
      const matches = await this.listMatchesByTeam(t.teamNumber);

      const teamAverages: Record<string, number | null> = {};
      for (const field of enabledTeamFields) {
        const v = (t.values as any)?.[field.key];
        const num = valueToNumber(field.inputType, v);
        teamAverages[field.key] = num;
      }

      const matchAverages: Record<string, number | null> = {};
      for (const field of enabledMatchFields) {
        let sum = 0;
        let cnt = 0;
        for (const m of matches) {
          const v = (m.values as any)?.[field.key];
          const num = valueToNumber(field.inputType, v);
          if (num !== null) {
            sum += num;
            cnt += 1;
          }
        }
        matchAverages[field.key] = cnt > 0 ? sum / cnt : null;
      }

      results.push({
        teamNumber: t.teamNumber,
        teamAverages,
        matchAverages,
        matchCount: matches.length,
      });
    }

    return results.sort((a, b) => a.teamNumber - b.teamNumber);
  }
}

export const storage = new DatabaseStorage();
