import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedIfEmpty() {
  const existingFields = await storage.listFields();
  if (existingFields.length === 0) {
    await storage.createField({
      scope: "team",
      key: "drive_train",
      label: "底盤/驅動類型",
      inputType: "text",
      enabled: 1,
      order: 1,
      scoringRule: { mode: "text" },
    });

    await storage.createField({
      scope: "team",
      key: "team_notes",
      label: "隊伍備註",
      inputType: "text",
      enabled: 1,
      order: 2,
      scoringRule: { mode: "text" },
    });

    await storage.createField({
      scope: "match",
      key: "auto_score",
      label: "自動期得分",
      inputType: "number",
      enabled: 1,
      order: 1,
      scoringRule: { mode: "number" },
    });

    await storage.createField({
      scope: "match",
      key: "teleop_score",
      label: "手動期得分",
      inputType: "number",
      enabled: 1,
      order: 2,
      scoringRule: { mode: "number" },
    });

    await storage.createField({
      scope: "match",
      key: "defense_grade",
      label: "防守評分 (S~F)",
      inputType: "grade",
      enabled: 1,
      order: 3,
      scoringRule: {
        mode: "grade",
        weights: { S: 5, A: 4, B: 3, C: 2, D: 1, E: 0, F: 0 },
      },
    });
  }

  const teams = await storage.listTeams();
  if (teams.length === 0) {
    await storage.upsertTeam(254, { values: { drive_train: "Swerve", team_notes: "機構穩定、控球好" } });
    await storage.upsertTeam(971, { values: { drive_train: "Swerve", team_notes: "自動期路線成熟" } });
    await storage.upsertTeam(1678, { values: { drive_train: "West Coast", team_notes: "配合度高" } });

    await storage.upsertMatch(254, 1, { values: { auto_score: 12, teleop_score: 25, defense_grade: "B" } });
    await storage.upsertMatch(254, 2, { values: { auto_score: 15, teleop_score: 23, defense_grade: "A" } });
    await storage.upsertMatch(971, 1, { values: { auto_score: 18, teleop_score: 20, defense_grade: "A" } });
    await storage.upsertMatch(1678, 1, { values: { auto_score: 10, teleop_score: 28, defense_grade: "C" } });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedIfEmpty();

  app.get(api.settings.get.path, async (_req, res) => {
    const s = await storage.getSettings();
    res.json(s);
  });

  app.put(api.settings.upsert.path, async (req, res) => {
    try {
      const input = api.settings.upsert.input.parse(req.body);
      if (input.sheetsEndpointUrl === undefined) {
        const existing = await storage.getSettings();
        if (!existing?.sheetsEndpointUrl) {
          return res.status(400).json({ message: "請填寫試算表連結 URL", field: "sheetsEndpointUrl" });
        }
      }
      const saved = await storage.upsertSettings(input);
      res.json(saved);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.get(api.fields.list.path, async (req, res) => {
    const parsed = api.fields.list.input?.safeParse(req.query);
    const scope = parsed?.success ? parsed.data?.scope : undefined;
    const fields = await storage.listFields(scope as any);
    res.json(fields);
  });

  app.post(api.fields.create.path, async (req, res) => {
    try {
      const input = api.fields.create.input.parse(req.body);
      const created = await storage.createField(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.put(api.fields.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(404).json({ message: "找不到此項目" });
      const input = api.fields.update.input.parse(req.body);
      const updated = await storage.updateField(id, input);
      if (!updated) return res.status(404).json({ message: "找不到此項目" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.delete(api.fields.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(404).json({ message: "找不到此項目" });
    const ok = await storage.deleteField(id);
    if (!ok) return res.status(404).json({ message: "找不到此項目" });
    res.status(204).send();
  });

  app.get(api.teams.list.path, async (_req, res) => {
    const teams = await storage.listTeams();
    res.json(teams);
  });

  app.get(api.teams.get.path, async (req, res) => {
    const teamNumber = Number(req.params.teamNumber);
    if (!Number.isFinite(teamNumber)) return res.json({ team: null, matches: [] });
    const record = await storage.getTeam(teamNumber);
    res.json(record);
  });

  app.put(api.teams.upsert.path, async (req, res) => {
    try {
      const teamNumber = Number(req.params.teamNumber);
      if (!Number.isFinite(teamNumber)) {
        return res.status(400).json({ message: "隊伍編號不正確", field: "teamNumber" });
      }
      const input = api.teams.upsert.input.parse(req.body);
      const saved = await storage.upsertTeam(teamNumber, input);
      res.json(saved);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.get(api.matches.listByTeam.path, async (req, res) => {
    const teamNumber = Number(req.params.teamNumber);
    if (!Number.isFinite(teamNumber)) return res.json([]);
    const matches = await storage.listMatchesByTeam(teamNumber);
    res.json(matches);
  });

  app.put(api.matches.upsert.path, async (req, res) => {
    try {
      const teamNumber = Number(req.params.teamNumber);
      const matchNumber = Number(req.params.matchNumber);
      if (!Number.isFinite(teamNumber) || !Number.isFinite(matchNumber)) {
        return res.status(400).json({ message: "隊伍或場次不正確" });
      }
      const input = api.matches.upsert.input.parse(req.body);
      const saved = await storage.upsertMatch(teamNumber, matchNumber, input);
      res.json(saved);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.delete(api.matches.delete.path, async (req, res) => {
    const teamNumber = Number(req.params.teamNumber);
    const matchNumber = Number(req.params.matchNumber);
    if (!Number.isFinite(teamNumber) || !Number.isFinite(matchNumber)) {
      return res.status(404).json({ message: "找不到此比賽" });
    }
    const ok = await storage.deleteMatch(teamNumber, matchNumber);
    if (!ok) return res.status(404).json({ message: "找不到此比賽" });
    res.status(204).send();
  });

  app.get(api.analytics.aggregate.path, async (req, res) => {
    const parsed = api.analytics.aggregate.input?.safeParse(req.query);
    const teamNumbers = parsed?.success ? parsed.data?.teamNumbers ?? [] : [];
    const limited = teamNumbers.length > 0 ? teamNumbers.slice(0, 8) : undefined;
    const agg = await storage.aggregate(limited);
    res.json(agg);
  });

  // Placeholder endpoints for import/export. Frontend can show buttons; wiring is via Apps Script.
  app.post(api.sheets.exportAll.path, async (_req, res) => {
    res.json({ ok: true });
  });

  app.post(api.sheets.importAll.path, async (_req, res) => {
    res.json({ ok: true });
  });

  return httpServer;
}
