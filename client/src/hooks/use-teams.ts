import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreateTeamEntryRequest, UpdateTeamEntryRequest } from "@shared/schema";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} 驗證失敗:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useTeams() {
  return useQuery({
    queryKey: [api.teams.list.path],
    queryFn: async () => {
      const res = await fetch(api.teams.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("讀取隊伍列表失敗");
      return parseWithLogging(api.teams.list.responses[200], await res.json(), "teams.list");
    },
  });
}

export function useTeamFull(teamNumber?: number) {
  return useQuery({
    enabled: Number.isFinite(teamNumber),
    queryKey: [api.teams.get.path, teamNumber ?? "none"],
    queryFn: async () => {
      const url = buildUrl(api.teams.get.path, { teamNumber: teamNumber as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("讀取隊伍資料失敗");
      return parseWithLogging(api.teams.get.responses[200], await res.json(), "teams.get");
    },
  });
}

export function useUpsertTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teamNumber,
      values,
    }: { teamNumber: number } & (CreateTeamEntryRequest | UpdateTeamEntryRequest)) => {
      const validated = api.teams.upsert.input.parse({ values });
      const url = buildUrl(api.teams.upsert.path, { teamNumber });
      const res = await fetch(url, {
        method: api.teams.upsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.teams.upsert.responses[400], await res.json(), "teams.upsert.400");
          throw new Error(err.message);
        }
        throw new Error("儲存隊伍資料失敗");
      }
      return parseWithLogging(api.teams.upsert.responses[200], await res.json(), "teams.upsert.200");
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [api.teams.list.path] });
      qc.invalidateQueries({ queryKey: [api.teams.get.path, variables.teamNumber] });
      qc.invalidateQueries({ queryKey: [api.matches.listByTeam.path, variables.teamNumber] });
      qc.invalidateQueries({ queryKey: [api.analytics.aggregate.path] });
    },
  });
}
