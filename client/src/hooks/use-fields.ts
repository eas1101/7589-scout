import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type {
  CreateScoringFieldRequest,
  UpdateScoringFieldRequest,
  ScoringFieldResponse,
} from "@shared/schema";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} 驗證失敗:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useFields(scope?: "team" | "match") {
  return useQuery({
    queryKey: [api.fields.list.path, scope ?? "all"],
    queryFn: async () => {
      const url = scope ? `${api.fields.list.path}?scope=${encodeURIComponent(scope)}` : api.fields.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("讀取評分項目失敗");
      return parseWithLogging(api.fields.list.responses[200], await res.json(), "fields.list");
    },
  });
}

export function useCreateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateScoringFieldRequest) => {
      const validated = api.fields.create.input.parse(data);
      const res = await fetch(api.fields.create.path, {
        method: api.fields.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.fields.create.responses[400], await res.json(), "fields.create.400");
          throw new Error(err.message);
        }
        throw new Error("新增評分項目失敗");
      }
      return parseWithLogging(api.fields.create.responses[201], await res.json(), "fields.create.201");
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: [api.fields.list.path] });
      qc.invalidateQueries({ queryKey: [api.fields.list.path, (created as ScoringFieldResponse).scope] });
    },
  });
}

export function useUpdateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateScoringFieldRequest) => {
      const validated = api.fields.update.input.parse(updates);
      const url = buildUrl(api.fields.update.path, { id });
      const res = await fetch(url, {
        method: api.fields.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.fields.update.responses[400], await res.json(), "fields.update.400");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const err = parseWithLogging(api.fields.update.responses[404], await res.json(), "fields.update.404");
          throw new Error(err.message);
        }
        throw new Error("更新評分項目失敗");
      }
      return parseWithLogging(api.fields.update.responses[200], await res.json(), "fields.update.200");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.fields.list.path] });
    },
  });
}

export function useDeleteField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.fields.delete.path, { id });
      const res = await fetch(url, { method: api.fields.delete.method, credentials: "include" });
      if (res.status === 404) {
        const err = parseWithLogging(api.fields.delete.responses[404], await res.json(), "fields.delete.404");
        throw new Error(err.message);
      }
      if (!res.ok) throw new Error("刪除評分項目失敗");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.fields.list.path] });
    },
  });
}
