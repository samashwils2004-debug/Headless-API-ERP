# Claude Code Guardrails for Orquestra ERP

## Hard Blocks (Never Do)
- `git push` to any remote
- `git reset --hard` or `git clean -f`
- Deleting migration files in `apps/api/alembic/versions/`
- Modifying `apps/api/.env` or `apps/web/.env.local` directly (only `.env.example`)
- Running `DROP TABLE` or destructive SQL against any real database
- Installing packages globally — always use `npm install --save` or `pip install` in virtualenv

## Evaluation Criteria for Tests
A test is ACCEPTABLE if:
- It connects to a real (test) database or uses real application logic
- It mocks only external third-party APIs (Gemini, Groq, Stripe etc.)

A test is UNACCEPTABLE if:
- It mocks the SQLAlchemy session entirely
- It mocks FastAPI's dependency injection to bypass real route logic
- It never actually calls the function being tested (pure mock chain)

## Sandbox Protocol
- Always work in a feature branch
- Never commit directly to main/master
- Validate all changes with `mypy` (Python) and `tsc --noEmit` (TypeScript) before committing
