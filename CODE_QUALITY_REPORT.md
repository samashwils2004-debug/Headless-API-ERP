# Code Quality Report — Orquestra ERP

Generated: 2026-06-25

---

## 1. Frontend Unused Dependencies (`apps/web/package.json`)

### Confirmed unused — safe to remove

| Package | Reason |
|---|---|
| `react-dnd` | No import found anywhere in `apps/web/src/` |
| `react-dnd-html5-backend` | No import found anywhere in `apps/web/src/` |
| `react-slick` | No import found anywhere in `apps/web/src/` |
| `react-responsive-masonry` | No import found anywhere in `apps/web/src/` |
| `@popperjs/core` | No import found anywhere in `apps/web/src/` |
| `react-popper` | No import found anywhere in `apps/web/src/` |
| `shiki` | No import found anywhere in `apps/web/src/` |
| `@mui/material` | No import found anywhere in `apps/web/src/` |
| `@mui/icons-material` | No import found anywhere in `apps/web/src/` |
| `@emotion/react` | No import found anywhere in `apps/web/src/` (MUI peer dep) |
| `@emotion/styled` | No import found anywhere in `apps/web/src/` (MUI peer dep) |
| `date-fns` | `react-day-picker` v8 peer dep — `Calendar` component (`ui/calendar.tsx`) exists but is never imported outside itself; entire calendar subsystem is unused |
| `react-day-picker` | `ui/calendar.tsx` wraps it but `Calendar` is never imported by any console page |

### Potentially orphaned — investigate before removing

| Package | Status | Notes |
|---|---|---|
| `kysely` | **Orphaned file** | Used only in `apps/web/src/lib/db.ts` and `apps/web/src/types/db.ts`. The `db.ts` file is **never imported** by any other module. This was a Supabase-era direct-DB layer that was superseded by the FastAPI proxy pattern. Both files can be deleted along with the packages. |
| `pg` | **Orphaned file** | Only used in `apps/web/src/lib/db.ts` via `require('pg').Pool`. Same conclusion as `kysely`. |
| `@google/stitch-sdk` | **Active but optional** | Used in `apps/web/src/app/api/stitch/generate/route.ts` via a dynamic import with a graceful fallback. `console-api.ts` calls the `/api/stitch/generate` endpoint. The feature is active but requires `STITCH_API_KEY` env var. Keep if Stitch UI generation is intended; safe to drop if not. |
| `@supabase/supabase-js` | **No import found** | Package in `dependencies` but zero imports in `apps/web/src/`. A `/api/auth/supabase-token/route.ts` route exists but only uses `NextRequest`/`NextResponse`, no Supabase client. Safe to remove unless a Supabase auth integration is planned. |
| `motion` | **Active** | Used in `apps/web/src/components/interactive/ConsoleOutput.tsx` and `apps/web/src/components/console/ERPPreview.tsx`. **Keep.** |

### Packages confirmed in use

`@monaco-editor/react`, `monaco-editor`, `@xyflow/react`, `recharts`, `zustand`, `sonner`,
`next-themes` (used by `ui/sonner.tsx`), `clsx`, `tailwind-merge`, `class-variance-authority`,
`lucide-react`, `react-hook-form`, `react-resizable-panels`, `vaul`, `cmdk`, `input-otp`,
`embla-carousel-react`, `tw-animate-css` (via `@import` in `tailwind.css`), all `@radix-ui/*`
components (used via shadcn UI wrappers in `apps/web/src/components/ui/`).

---

## 2. Backend Unused Dependencies (`apps/api/requirements.txt`)

### Confirmed unused — safe to remove

| Package | Reason |
|---|---|
| `openai` | Zero `import openai` / `from openai` statements anywhere in `apps/api/app/`. Listed in `requirements.txt` and referenced in legacy config comments, but never instantiated. The provider cascade is Gemini → Groq → Mock only. |

### Active but conditional

| Package | Status | Notes |
|---|---|---|
| `agent-framework` | **Conditional** | Imported in `apps/api/app/ai/erp_agent_evaluator.py` and that file is called from `apps/api/app/routes/architect.py` (generate-design endpoint). However, `agent-framework>=1.0.0` is a Microsoft-specific package. The evaluator has a full fallback path — if `azure_client_id/secret/tenant_id` are not set, it falls back to a deterministic spec. **Keep** if the Azure multi-agent pipeline is intended; otherwise the evaluator file itself is the candidate for removal. |
| `azure-identity` | **Conditional** | Same as above — used exclusively in `erp_agent_evaluator.py` for `ClientSecretCredential`. Safe to drop only if `agent-framework` and `erp_agent_evaluator.py` are removed together. |
| `anthropic` | **Conditional** | Imported lazily inside `apps/api/app/ai/provider_router.py` via `import anthropic` inside the `if self.settings.anthropic_api_key:` block. No `ANTHROPIC_API_KEY` is present in `.env.test`. **Keep** — it enables a fourth AI provider (Claude) when the key is provided. |

### Packages confirmed in use

`fastapi`, `uvicorn`, `python-multipart`, `sqlalchemy`, `alembic`, `psycopg2-binary`, `pydantic`,
`pydantic-settings`, `jsonschema`, `python-jose`, `bcrypt`, `redis`, `google-generativeai`, `groq`,
`tenacity`, `email-validator`, `python-dotenv`, `sentry-sdk`, `prometheus-client`.

---

## 3. Code Duplication Patterns

### 3.1 `EventEngine(db)` instantiated inline in every route — HIGH PRIORITY

Six separate route files instantiate `EventEngine(db)` directly:

- `apps/api/app/routes/workflows.py` (lines 119, 158)
- `apps/api/app/routes/applications.py` (lines 57, 137)
- `apps/api/app/routes/ai.py` (line 128)
- `apps/api/app/routes/architect.py` (line 495)

Each creates a fresh Redis connection per request, leaking connections under load.
The `CLAUDE.md` implementation plan already defines `get_event_engine(db)` in `app/services.py`
as the fix. Until that phase is applied, every route is duplicating the same construction pattern
and the same Redis-connection side-effect.

**Recommendation:** Apply Phase 3f–3g from the implementation plan; replace all `EventEngine(db)`
calls with `get_event_engine(db)` from `app/services`.

### 3.2 Proxy route boilerplate — LOW RISK (by design)

All Next.js API proxy routes in `apps/web/src/app/api/` follow an identical two-handler pattern:

```ts
export async function GET(request: NextRequest) {
  const proxied = await proxyJson("/api/<resource>", request, "GET");
  return NextResponse.json(proxied.body, { status: proxied.status });
}
export async function POST(request: NextRequest) {
  const body = await request.json();
  const proxied = await proxyJson("/api/<resource>", request, "POST", body);
  return NextResponse.json(proxied.body, { status: proxied.status });
}
```

This pattern appears in at least 8 route files (`workflows`, `projects`, `architect`, `api-keys`,
`applications`, `templates`, `events`, `ai/compile`). The repetition is low-risk boilerplate
for a Next.js App Router proxy, but a factory helper like `makeProxyRoute("/api/workflows")`
could eliminate it.

### 3.3 Hard-coded design colour constants — MEDIUM PRIORITY

The six core design tokens (`#0f0f12`, `#141418`, `#1b1b24`, `#25252b`, `#f4f4f5`, `#3b82f6`)
appear in **275 occurrences across 23 files**, including:

- Tailwind config (`tailwind.css`, `theme.css`) — appropriate
- Console page components (`ConsoleShell`, `WorkflowGraphSVG`, `ERPDesign`, `StitchDesign`,
  `ERPPreview`, `ConsoleOutput`) — appropriate for tailored SVG rendering
- **Inline in the Stitch prompt builder** (`apps/web/src/app/api/stitch/generate/route.ts`) — this
  duplicates the values from `lib/constants.ts` and `styles/theme.css` into a string template.
  A single `DESIGN_TOKENS` object in `lib/constants.ts` should be the source of truth and imported
  into the prompt builder.

### 3.4 Orphaned legacy database layer

`apps/web/src/lib/db.ts` and `apps/web/src/types/db.ts` define a Kysely + `pg` direct-database
connection that is **never imported**. The app uses the FastAPI proxy exclusively. These two files
are dead code carrying two npm packages as unnecessary weight.

### 3.5 Dead Supabase auth route

`apps/web/src/app/api/auth/supabase-token/route.ts` exists but `@supabase/supabase-js` is never
imported in any source file. The route itself only uses Next.js types. The package is unused.

---

## 4. Recommendations by Priority

### Safe to remove immediately (no source changes needed beyond `package.json`)

**Frontend:**
- `react-dnd`, `react-dnd-html5-backend`
- `react-slick`
- `react-responsive-masonry`
- `@popperjs/core`, `react-popper`
- `shiki`
- `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`
- `@supabase/supabase-js`

**Backend:**
- `openai`

### Remove after deleting orphaned files

1. Delete `apps/web/src/lib/db.ts` and `apps/web/src/types/db.ts`, then remove `kysely` and `pg`.
2. Confirm `react-day-picker` and `date-fns` are truly unused (the `Calendar` component and all
   pages that might use it) before removing.

### Remove only as a bundle if Azure pipeline is dropped

- `agent-framework` + `azure-identity` + `apps/api/app/ai/erp_agent_evaluator.py`

### Investigate / optional

- `@google/stitch-sdk` — keep if Stitch design generation feature is intended; drop otherwise.
- `motion` — confirmed in use; keep.

### Code quality fixes (no dependency changes)

1. Replace all `EventEngine(db)` direct instantiations with `get_event_engine(db)` from `app/services`.
2. Extract `DESIGN_TOKENS` from `lib/constants.ts` and import into `stitch/generate/route.ts`
   instead of duplicating hex values.
3. Consider a `makeProxyRoute(path)` factory to de-duplicate Next.js proxy handlers.

---

## Guardrail Config Files Created

- `e:\cursor projects\ERP project\.jscpd.json` — clone detection config (jscpd tool)
- `e:\cursor projects\ERP project\apps\web\.depcheckrc` — depcheck config for frontend
