# Contributing to Orquestra ERP

## Architectural Boundaries

### Environment Isolation
- Agents and automation scripts MUST NOT execute `git push`, `git reset --hard`, or modify production infrastructure configs
- All AI-assisted changes must go through PR review before merging to main
- Never commit `.env` files — use `.env.example` as the template

### Testing Standards
- Integration tests MUST hit real resources (real DB via test schema, real HTTP)
- Avoid heavy mocking that masks business logic — mock only external third-party APIs (payment, email) not internal DB or application logic
- Every new API endpoint requires at least one integration test

### Cross-Boundary Rules
- `apps/web/` MUST NOT import from `apps/api/` — all communication via HTTP through the proxy layer
- Frontend never connects directly to the database — all DB access through FastAPI
- Backend never imports from frontend packages

### Agent Execution Restrictions
- Agents may NOT: push to remote, modify CI/CD pipeline configs, alter production env vars directly
- Agents MAY: edit local files, run tests locally, create new files, suggest changes

## Code Review Checklist
- [ ] No mocked unit tests for business logic
- [ ] New API endpoints have Pydantic v2 request/response schemas
- [ ] All new SQLAlchemy relationships specify lazy loading strategy
- [ ] No hardcoded localhost URLs in production code paths
- [ ] No new packages added without justification
