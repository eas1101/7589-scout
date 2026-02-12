import { z } from "zod";
import {
  insertSettingsSchema,
  insertScoringFieldSchema,
  insertTeamEntrySchema,
  insertMatchEntrySchema,
  settings,
  scoringFields,
  teamEntries,
  matchEntries,
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  settings: {
    get: {
      method: "GET" as const,
      path: "/api/settings" as const,
      responses: {
        200: z.custom<typeof settings.$inferSelect>().nullable(),
      },
    },
    upsert: {
      method: "PUT" as const,
      path: "/api/settings" as const,
      input: insertSettingsSchema.partial().extend({
        sheetsEndpointUrl: z.string().url().optional(),
      }),
      responses: {
        200: z.custom<typeof settings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  fields: {
    list: {
      method: "GET" as const,
      path: "/api/fields" as const,
      input: z
        .object({
          scope: z.enum(["team", "match"]).optional(),
        })
        .optional(),
      responses: {
        200: z.array(z.custom<typeof scoringFields.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/fields" as const,
      input: insertScoringFieldSchema.extend({
        scope: z.enum(["team", "match"]),
        key: z.string().min(1).max(64),
        inputType: z.enum(["grade", "number", "text"]),
        enabled: z.coerce.number().int().optional(),
        order: z.coerce.number().int().optional(),
        scoringRule: z.record(z.any()).optional(),
      }),
      responses: {
        201: z.custom<typeof scoringFields.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/fields/:id" as const,
      input: insertScoringFieldSchema.partial().extend({
        scope: z.enum(["team", "match"]).optional(),
        key: z.string().min(1).max(64).optional(),
        inputType: z.enum(["grade", "number", "text"]).optional(),
        enabled: z.coerce.number().int().optional(),
        order: z.coerce.number().int().optional(),
        scoringRule: z.record(z.any()).optional(),
      }),
      responses: {
        200: z.custom<typeof scoringFields.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/fields/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  teams: {
    list: {
      method: "GET" as const,
      path: "/api/teams" as const,
      responses: {
        200: z.array(z.custom<typeof teamEntries.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/teams/:teamNumber" as const,
      responses: {
        200: z.custom<{ team: typeof teamEntries.$inferSelect | null; matches: typeof matchEntries.$inferSelect[] }>(),
      },
    },
    upsert: {
      method: "PUT" as const,
      path: "/api/teams/:teamNumber" as const,
      input: insertTeamEntrySchema.pick({ values: true }).extend({
        teamNumber: z.coerce.number().int().optional(),
      }),
      responses: {
        200: z.custom<typeof teamEntries.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  matches: {
    listByTeam: {
      method: "GET" as const,
      path: "/api/teams/:teamNumber/matches" as const,
      responses: {
        200: z.array(z.custom<typeof matchEntries.$inferSelect>()),
      },
    },
    upsert: {
      method: "PUT" as const,
      path: "/api/teams/:teamNumber/matches/:matchNumber" as const,
      input: insertMatchEntrySchema.pick({ values: true }).extend({
        teamNumber: z.coerce.number().int().optional(),
        matchNumber: z.coerce.number().int().optional(),
      }),
      responses: {
        200: z.custom<typeof matchEntries.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/teams/:teamNumber/matches/:matchNumber" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  analytics: {
    aggregate: {
      method: "GET" as const,
      path: "/api/analytics/aggregate" as const,
      input: z
        .object({
          teamNumbers: z
            .string()
            .optional()
            .transform((v) => (v ? v.split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n)) : [])),
        })
        .optional(),
      responses: {
        200: z.array(
          z.object({
            teamNumber: z.number(),
            teamAverages: z.record(z.number().nullable()),
            matchAverages: z.record(z.number().nullable()),
            matchCount: z.number(),
          }),
        ),
      },
    },
  },
  sheets: {
    // backend -> Apps Script proxy to keep CORS simple
    exportAll: {
      method: "POST" as const,
      path: "/api/sheets/export" as const,
      responses: {
        200: z.object({ ok: z.literal(true) }),
        400: errorSchemas.validation,
      },
    },
    importAll: {
      method: "POST" as const,
      path: "/api/sheets/import" as const,
      responses: {
        200: z.object({ ok: z.literal(true) }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}

export type SettingsResponse = z.infer<typeof api.settings.get.responses[200]>;
export type FieldListResponse = z.infer<typeof api.fields.list.responses[200]>;
export type TeamFullResponse = z.infer<typeof api.teams.get.responses[200]>;
export type MatchListResponse = z.infer<typeof api.matches.listByTeam.responses[200]>;
export type AggregateResponse = z.infer<typeof api.analytics.aggregate.responses[200]>;