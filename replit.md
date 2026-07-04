# LocoNet Fault Monitor

Full-stack Indian Railways LocoNet Fault Monitoring System — real-time fault data tracking, 8 analytics charts, WhatsApp Cloud API alerts for Category A faults, audit logging, and full CRUD user management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/dashboard run dev` — run the React frontend (port 23183, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Recharts

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts (35+ endpoints)
- `lib/api-client-react/src/generated/api.ts` — auto-generated React Query hooks (do not edit manually)
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, faults, alert_logs, api_logs, login_history, settings)
- `artifacts/api-server/src/` — Express backend with routes, middleware, scheduler, whatsapp & loconet services
- `artifacts/dashboard/src/pages/` — Dashboard, Faults, Charts, Alerts, Audit, Settings, Users pages

## Architecture decisions

- Contract-first API design: OpenAPI spec → Orval codegen → typed React Query hooks
- JWT auth with Bearer tokens stored in localStorage (not cookies) to avoid CSRF issues in proxy environments
- node-cron scheduler fires every 2 minutes by default (configurable) to pull from LocoNet REST API
- WhatsApp alerts only fire for Category A faults and check alert_logs table to prevent duplicates
- All mutations that Orval didn't generate (updateUser, deleteUser, updateSchedulerInterval) use direct authenticated fetch calls

## Product

- **Login** — JWT-secured login with admin/user roles; default admin/admin123
- **Dashboard** — KPI cards (total/active/cat-A/recovered faults), category pie, trend area chart, top locos
- **Fault Data** — Full 19-column paginated table with search, category/zone/status filters, CSV/Excel/PDF export
- **Analytics** — 8 chart types: pie, donut, horizontal bar, vertical bar, area, line, radar, stacked bar
- **WhatsApp Alerts** — Category A auto-alerts via WhatsApp Cloud API; alert history log; test button
- **Audit Logs** — Full API call log with method, path, status, IP, duration
- **Settings** — LocoNet API URL/key, WhatsApp credentials, scheduler interval, manual sync trigger
- **Users** — Admin can create/edit/delete users; role assignment (admin/user)

## User preferences

- No Python/FastAPI — use Node.js/Express exclusively
- Personal phone for WhatsApp alerts via Cloud API placeholder credentials

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml` — the frontend imports the generated hooks directly
- `useLogin`, `useCreateUser`, `useUpdateSettings`, `useTriggerFetch` are the mutation hooks Orval generated — the rest use direct fetch with `getToken()`
- The seeded admin password hash must be regenerated with bcryptjs from the api-server directory: `node -e "import('bcryptjs').then(m => m.default.hash('yourpassword', 10).then(console.log))"`
- Do NOT run `pnpm dev` at root — use workflow restart or individual `--filter` commands

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
