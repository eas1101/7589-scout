import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateMatchEntryRequest, UpdateMatchEntryRequest } from "@shared/schema";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} 驗證失敗:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useMatchesByTeam(teamNumber?: number) {
  return useQuery({
    enabled: Number.isFinite(teamNumber),
    queryKey: [api.matches.listByTeam.path, teamNumber ?? "none"],
    queryFn: async () => {
      const url = buildUrl(api.matches.listByTeam.path, { teamNumber: teamNumber as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("讀取比賽列表失敗");
      return parseWithLogging(api.matches.listByTeam.responses[200], await res.json(), "matches.listByTeam");
    },
  });
}

export function useUpsertMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teamNumber,
      matchNumber,
      values,
    }: { teamNumber: number; matchNumber: number } & (CreateMatchEntryRequest | UpdateMatchEntryRequest)) => {
      const validated = api.matches.upsert.input.parse({ values });
      const url = buildUrl(api.matches.upsert.path, { teamNumber, matchNumber });
      const res = await fetch(url, {
        method: api.matches.upsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.matches.upsert.responses[400], await res.json(), "matches.upsert.400");
          throw new Error(err.message);
        }
        throw new Error("儲存比賽資料失敗");
      }
      return parseWithLogging(api.matches.upsert.responses[200], await res.json(), "matches.upsert.200");
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [api.matches.listByTeam.path, variables.teamNumber] });
      qc.invalidateQueries({ queryKey: [api.teams.get.path, variables.teamNumber] });
      qc.invalidateQueries({ queryKey: [api.analytics.aggregate.path] });
    },
  });
}

export function useDeleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamNumber, matchNumber }: { teamNumber: number; matchNumber: number }) => {
      const url = buildUrl(api.matches.delete.path, { teamNumber, matchNumber });
      const res = await fetch(url, { method: api.matches.delete.method, credentials: "include" });
      if (res.status === 404) {
        const err = parseWithLogging(api.matches.delete.responses[404], await res.json(), "matches.delete.404");
        throw new Error(err.message);
      }
      if (!res.ok) throw new Error("刪除比賽資料失敗");
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [api.matches.listByTeam.path, variables.teamNumber] });
      qc.invalidateQueries({ queryKey: [api.teams.get.path, variables.teamNumber] });
      qc.invalidateQueries({ queryKey: [api.analytics.aggregate.path] });
    },
  });
}
