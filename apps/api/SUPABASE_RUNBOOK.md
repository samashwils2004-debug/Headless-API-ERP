# Supabase Integration Runbook

## 1) Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` (Supabase Postgres, transaction pooler preferred)
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `STORAGE_BACKEND=supabase` (for storage migration)

## 2) Dependencies

```bash
python -m pip install -r requirements.txt
```

## 3) Alembic migrations

```bash
alembic upgrade head
```

For model changes:

```bash
alembic revision --autogenerate -m "your_change"
alembic upgrade head
```

## 4) Apply RLS and grants

Run `sql/supabase_rls.sql` in Supabase SQL Editor.

Run `sql/supabase_storage_policies.sql` after creating `application-documents` bucket.

## 5) Seed demo data

```bash
python seed_demo.py
```

## 6) Start backend

```bash
uvicorn app.main:app --reload
```

## 7) RLS bypass checks

1. Get backend JWT via `/api/auth/login`.
2. Get broker token via `/api/auth/supabase-token`.
3. Query `recent_applications` using Supabase JS with broker token.
4. Attempt query with another institution filter in browser console.
5. Confirm cross-tenant rows are denied by RLS.
