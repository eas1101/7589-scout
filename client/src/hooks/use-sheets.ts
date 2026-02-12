import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} 驗證失敗:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useExportAllToSheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.sheets.exportAll.path, {
        method: api.sheets.exportAll.method,
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.sheets.exportAll.responses[400], await res.json(), "sheets.export.400");
          throw new Error(err.message);
        }
        throw new Error("匯出到試算表失敗");
      }
      return parseWithLogging(api.sheets.exportAll.responses[200], await res.json(), "sheets.export.200");
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useImportAllFromSheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.sheets.importAll.path, {
        method: api.sheets.importAll.method,
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.sheets.importAll.responses[400], await res.json(), "sheets.import.400");
          throw new Error(err.message);
        }
        throw new Error("從試算表匯入失敗");
      }
      return parseWithLogging(api.sheets.importAll.responses[200], await res.json(), "sheets.import.200");
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
