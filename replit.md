# FRC Scouting App

## Overview

This is an FRC (FIRST Robotics Competition) scouting application built for tracking team performance data across matches. The UI is fully in Chinese (Traditional). It allows users to record team-level and match-level scouting data using configurable scoring fields (grades like S/A/B/C/D/E/F, numbers, or text), view analytics with charts, compare teams side-by-side, and optionally sync data to Google Sheets via Google Apps Script.

The app operates primarily as a **local-first** application — all data (teams, matches, fields, settings) is stored in `localStorage` on the client side. A PostgreSQL database and Express backend exist in the codebase but the client hooks currently read/write directly to localStorage. Google Sheets integration is available as an optional export/import mechanism configured through the Settings page.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter with a custom `HashRouterBridge` component that maps `/#/path` style hash routes to wouter paths. This is done for GitHub Pages compatibility (avoids 404 on refresh).
- **State Management**: TanStack React Query for async state, but all query functions currently read from localStorage rather than making API calls. This makes the app work fully offline.
- **UI Library**: shadcn/ui components (New York style) built on Radix UI primitives, styled with Tailwind CSS
- **Charts**: Recharts for analytics and comparison visualizations
- **Theming**: Dark mode (black/orange tech feel) is default, light mode (blue/white) available. Theme toggle persists to localStorage under `frc.theme`. CSS variables defined in `client/src/index.css`.
- **Fonts**: IBM Plex Sans TC (body), Oxanium (display/headings)
- **Build**: Vite with React plugin

### Key Frontend Pages
- `/teams` — View/edit team-level scouting data with dynamic form fields
- `/matches` — Record per-match scouting entries for specific teams
- `/analytics` — Aggregate statistics and charts across all teams
- `/compare` — Side-by-side comparison of selected teams
- `/settings` — Configure Google Sheets endpoint, API token, and manage scoring field definitions

### Data Storage Pattern (Local-First)
- All hooks (`use-teams.ts`, `use-matches.ts`, `use-fields.ts`, `use-settings.ts`) read/write to a single localStorage key `frc_scout_data` containing `{ settings, fields, teams, matches }`.
- A separate draft system (`LocalDrafts` component) uses localStorage key `frc.drafts.v1` for unsaved work buffering.
- React Query is used for caching/invalidation but the actual "fetch" functions just read localStorage.

### Backend (Express + PostgreSQL)
- **Runtime**: Node.js with Express 5, TypeScript compiled via tsx
- **Database**: PostgreSQL via `drizzle-orm` with `node-postgres` driver
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` — four tables: `settings`, `scoring_fields`, `team_entries`, `match_entries`
- **Storage Layer**: `server/storage.ts` implements `IStorage` interface with full CRUD + aggregation logic against PostgreSQL
- **API Routes**: Defined in `server/routes.ts`, following a typed contract in `shared/routes.ts`. Seeds default scoring fields if database is empty.
- **Validation**: Zod schemas generated from Drizzle schemas via `drizzle-zod`
- **Dev Server**: Vite dev server middleware in development, static file serving in production
- **Build**: esbuild bundles server to `dist/index.cjs`, Vite builds client to `dist/public`

### Shared Code (`shared/`)
- `schema.ts` — Drizzle table definitions, Zod insert schemas, TypeScript types for API request/response
- `routes.ts` — API route contract definitions with paths, methods, and Zod response schemas

### Important Architecture Notes
- The frontend hooks are currently **not calling the backend API**. They operate entirely on localStorage. The backend API exists and is functional but the frontend would need to be wired to use `fetch` calls to `/api/*` endpoints to leverage it.
- Scoring fields are fully dynamic — users define what data points to track (scope: team or match, type: grade/number/text) through the Settings page's field editor.
- The `scoringRule` JSONB field on `scoring_fields` controls how values are aggregated (grade→numeric conversion with configurable weights, number averaging, text concatenation).

## External Dependencies

### Database
- **PostgreSQL** — Required. Connection via `DATABASE_URL` environment variable. Schema managed with Drizzle Kit (`npm run db:push`).

### Google Sheets Integration (Optional)
- Data can be exported to / imported from a Google Spreadsheet via a **Google Apps Script Web App** deployed by the user.
- The template script is in `GOOGLE_APPS_SCRIPT_TEMPLATE.js`. Users deploy it as a web app, paste the URL into Settings.
- Export sends all local data as JSON via POST. Import retrieves JSON via GET.
- Communication uses `no-cors` mode for simple POST, which limits response reading.
- An optional `apiToken` provides simple shared-secret authentication between the app and the Apps Script.

### Key NPM Packages
- `drizzle-orm` + `drizzle-zod` + `drizzle-kit` — ORM and schema management
- `express` v5 — HTTP server
- `@tanstack/react-query` — Client-side data fetching/caching
- `wouter` — Lightweight React router
- `recharts` — Charting library
- `zod` — Runtime validation
- `tailwindcss` — Utility-first CSS
- `@radix-ui/*` — Headless UI primitives (via shadcn/ui)
- `react-hook-form` + `@hookform/resolvers` — Form management
- `lucide-react` — Icon library