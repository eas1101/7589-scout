import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { CreateSettingsRequest, UpdateSettingsRequest } from "@shared/schema";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} 驗證失敗:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async () => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("讀取設定失敗");
      return parseWithLogging(api.settings.get.responses[200], await res.json(), "settings.get");
    },
  });
}

export function useUpsertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateSettingsRequest | CreateSettingsRequest) => {
      const validated = api.settings.upsert.input.parse(data);
      const res = await fetch(api.settings.upsert.path, {
        method: api.settings.upsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.settings.upsert.responses[400], await res.json(), "settings.upsert.400");
          throw new Error(err.message);
        }
        throw new Error("儲存設定失敗");
      }
      return parseWithLogging(api.settings.upsert.responses[200], await res.json(), "settings.upsert.200");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.settings.get.path] });
    },
  });
}
