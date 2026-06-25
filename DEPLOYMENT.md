# Orquestra ERP Deployment Guide

## Architecture

```
Browser → Vercel (Next.js 14)
              ↓  /api/* proxy routes
         FastAPI Backend (Render / Railway / Fly.io)
              ↓
         Neon PostgreSQL  +  Redis (optional, for rate-limiting & AI cache)
```

AI provider cascade (no single point of failure):
```
Gemini 2.5 Flash  →  Groq Llama 3.1  →  Deterministic Mock
```

---

## Environment Variables

### Vercel (Frontend) — Required

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Deployed FastAPI backend URL | `https://your-api.onrender.com` |
| `NEXT_PUBLIC_WS_BASE_URL` | WebSocket URL (must use `wss://` in production) | `wss://your-api.onrender.com` |
| `NEXT_PUBLIC_ENABLE_REALTIME` | Enable real-time event stream | `true` |

**Do NOT add any of the following to Vercel:** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME`, `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY`,
or `STITCH_API_KEY`. Those belong on the backend host only.

### Backend Host (Render / Railway / Fly.io) — Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string — use `postgresql+psycopg2://` scheme |
| `SECRET_KEY` | JWT signing key — minimum 32 characters, cryptographically random |
| `CORS_ORIGINS` | JSON array of allowed frontend origins |
| `CONSOLE_ORIGIN` | Primary frontend origin for CSRF validation |
| `ENVIRONMENT` | Set to `production` |
| `DEBUG` | Set to `false` |

### Backend Host — AI Providers (at least one required for non-mock operation)

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini 2.5 Flash (primary AI provider) |
| `GROQ_API_KEY` | Groq Llama 3.1 (fallback AI provider) |
| `ANTHROPIC_API_KEY` | Anthropic Claude (optional third cascade level) |

If none are set, the system falls back to the deterministic mock blueprint (functional but not AI-generated).

### Backend Host — Optional

| Variable | Description | Default |
|---|---|---|
| `REDIS_URL` | Redis for rate-limiting and AI response cache (24h TTL) | _(disabled)_ |
| `SENTRY_DSN` | Sentry error tracking | _(disabled)_ |
| `DB_POOL_SIZE` | SQLAlchemy connection pool size | `5` |
| `DB_MAX_OVERFLOW` | Pool overflow limit | `10` |
| `DB_POOL_TIMEOUT` | Pool checkout timeout (seconds) | `30` |
| `DB_POOL_RECYCLE` | Connection recycle interval (seconds) | `1800` |
| `DB_STATEMENT_TIMEOUT_MS` | Per-statement timeout in ms | `30000` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiry | `10080` (7 days) |
| `BCRYPT_ROUNDS` | Password hash cost factor | `12` |

---

## CORS Configuration Example

Backend `CORS_ORIGINS` must include every origin that your Vercel deployment uses.
Vercel assigns both a stable production URL and preview URLs. Set this on the backend:

```
CORS_ORIGINS=["https://orquestra.vercel.app","https://orquestra-git-main-yourteam.vercel.app"]
CONSOLE_ORIGIN=https://orquestra.vercel.app
```

---

## Pre-Deployment Checklist

### Backend

- [ ] `DATABASE_URL` uses Neon (not Aiven, not localhost SQLite)
- [ ] `DATABASE_URL` uses `postgresql+psycopg2://` scheme (not `asyncpg`, not bare `postgresql://`)
- [ ] `SECRET_KEY` is a strong random value — minimum 32 characters — not `CHANGE_ME_USE_ENV`
- [ ] `CORS_ORIGINS` includes the Vercel production URL
- [ ] `CONSOLE_ORIGIN` matches the primary Vercel URL
- [ ] `ENVIRONMENT=production` is set
- [ ] `DEBUG=false` is set
- [ ] Alembic migrations have been run: `alembic upgrade head`
- [ ] No `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, or `AZURE_CLIENT_SECRET` env vars remain set
- [ ] No `AIVEN_URL` or `AIVEN_*` env vars remain set (legacy — not used by current stack)
- [ ] No `STITCH_API_KEY` is present anywhere

### Frontend (Vercel)

- [ ] `NEXT_PUBLIC_API_BASE_URL` points to the deployed FastAPI URL (not `localhost`)
- [ ] `NEXT_PUBLIC_WS_BASE_URL` uses `wss://` (not `ws://`) for production
- [ ] No `DB_*` or `DATABASE_URL` variables are set in Vercel
- [ ] No `SECRET_KEY`, `GEMINI_API_KEY`, or `GROQ_API_KEY` in Vercel env vars
- [ ] No `STITCH_API_KEY` in Vercel env vars
- [ ] `@google/stitch-sdk` dependency can be removed from `package.json` once Stitch is fully cut
- [ ] `serverExternalPackages: ["@google/stitch-sdk"]` can be removed from `next.config.js` once Stitch is cut

---

## Deployment Steps

### 1. Provision Neon PostgreSQL

1. Create a Neon project at https://neon.tech
2. Copy the connection string — select the **psycopg2** format
3. It will look like: `postgresql+psycopg2://user:pass@host.neon.tech/dbname?sslmode=require`

### 2. Deploy FastAPI Backend

**Render (recommended for simplicity):**

1. Create a new Web Service pointing at `apps/api/`
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add all required environment variables listed above

**Railway / Fly.io:** equivalent steps; consult each platform's FastAPI deployment docs.

### 3. Run Database Migrations

After the backend service is running, open a shell (Render shell / Railway CLI / Fly SSH) and run:

```bash
cd apps/api
alembic upgrade head
```

This creates all tables. Do this before the frontend goes live.

### 4. Seed Workflow Templates (optional)

```bash
cd apps/api
python seed_templates.py
```

### 5. Deploy Frontend to Vercel

1. Import the `apps/web/` directory into a Vercel project
2. Framework: Next.js (auto-detected)
3. Set environment variables:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://your-backend.onrender.com`
   - `NEXT_PUBLIC_WS_BASE_URL` = `wss://your-backend.onrender.com`
   - `NEXT_PUBLIC_ENABLE_REALTIME` = `true`
4. Deploy

### 6. Post-Deploy Smoke Test

Run these checks after deploying:

```bash
# 1. Backend health
curl https://your-api.onrender.com/api/health

# 2. Login (replace with a seeded user)
curl -X POST https://your-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourinstitution.edu","password":"yourpassword"}'

# 3. Verify CORS header is present
curl -I https://your-api.onrender.com/api/health \
  -H "Origin: https://orquestra.vercel.app"
# Should see: Access-Control-Allow-Origin: https://orquestra.vercel.app

# 4. Confirm WebSocket (browser devtools network tab)
# Navigate to /console/events — the event stream should connect
```

---

## Rollback Procedure

### Frontend (Vercel)

1. Go to Vercel dashboard → Deployments
2. Find the previous stable deployment
3. Click "..." → "Promote to Production"

### Backend

1. In Render/Railway, redeploy the previous commit/tag
2. If the start command or env vars changed, restore them first

### Database

If a migration caused issues:

```bash
# Roll back one migration
alembic downgrade -1

# Roll back to a specific revision
alembic downgrade <revision_id>

# Check current revision
alembic current

# See migration history
alembic history
```

**Important:** Downgrading destructive migrations (those that drop columns or tables) may cause
data loss. Always take a Neon backup snapshot before running `alembic upgrade head` on production.

---

## Known Issues / Cleanup Items

### next.config.js — Stitch SDK reference (do not modify — handled by separate agent)

`next.config.js` currently has `serverExternalPackages: ["@google/stitch-sdk"]`. This can be
removed once `@google/stitch-sdk` is removed from `package.json`. Until then, leave it to avoid
build errors.

### config.py — Legacy Aiven/Azure fields

`apps/api/app/config.py` contains the following fields that refer to removed services:

| Field | Issue |
|---|---|
| `aiven_url`, `aiven_publishable_key`, `aiven_service_role_key`, `aiven_jwt_secret`, `aiven_token_expire_minutes` | Aiven is not used by the current stack. These are dead config. |
| `azure_tenant_id`, `azure_client_id`, `azure_client_secret` | Azure AD auth is not implemented. These are dead config. |

These fields are safe to ignore at deploy time (they default to empty strings). A separate agent
is removing them from `config.py`. Do not set these env vars on the backend host.

### config.py — SECRET_KEY validation

`SECRET_KEY` is validated (min 32 chars, not default) only when `ENVIRONMENT=production`.
The validator fires at startup, so a misconfigured key will prevent the app from starting —
which is the intended behaviour.

---

## Workflow Blueprint Validation

Orquestra validates AI-generated workflow blueprints through a 4-stage pipeline:

| Stage | Validator | What it checks |
|---|---|---|
| 1 | Schema | Blueprint structure matches `BLUEPRINT_SCHEMA` in `schema_engine.py` |
| 2 | Graph integrity | States are reachable; no orphaned states; terminal states exist |
| 3 | Permission analysis | All transitions reference a role with appropriate permissions |
| 4 | Compliance | `compliance_tags` are populated and valid |

A JSON Schema file for external tooling (linting, CI, editor validation) is at:
`apps/api/app/schemas/workflow_schema.json`

A Python utility for programmatic validation is at:
`apps/api/app/schemas/schema_validator.py`

```python
from app.schemas.schema_validator import validate_workflow_blueprint

is_valid, errors = validate_workflow_blueprint(my_blueprint)
if not is_valid:
    print(errors)
```

Requires `pip install jsonschema`. If `jsonschema` is not installed, the function returns
`(True, [])` gracefully so the app continues to work.
