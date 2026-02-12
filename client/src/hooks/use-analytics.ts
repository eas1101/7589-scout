import { useQuery } from "@tanstack/react-query";
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

export function useAggregate(teamNumbers?: number[]) {
  const key = (teamNumbers ?? []).slice().sort((a, b) => a - b).join(",");
  return useQuery({
    queryKey: [api.analytics.aggregate.path, key],
    queryFn: async () => {
      const url =
        teamNumbers && teamNumbers.length
          ? `${api.analytics.aggregate.path}?teamNumbers=${encodeURIComponent(teamNumbers.join(","))}`
          : api.analytics.aggregate.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("讀取統計失敗");
      return parseWithLogging(api.analytics.aggregate.responses[200], await res.json(), "analytics.aggregate");
    },
  });
}
