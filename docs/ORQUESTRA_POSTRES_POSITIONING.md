# Orquestra — PostgreSQL Integration & Database Finalization Plan

## 1. PostgreSQL positioning

**Primary:** Aiven PostgreSQL (free tier → $5/mo Developer → Professional)
**Local dev fallback:** SQLite via `sqlite:///./admissions.db` (already configured in `config.py` as default)

The `database.py` already handles both dialects cleanly — QueuePool + SSL + statement timeouts for PostgreSQL, `check_same_thread=False` for SQLite. No code changes needed for dual support.

**Aiven free tier constraints to respect:**

| Limit              | Value         | Mitigation                                             |
| ------------------ | ------------- | ------------------------------------------------------ |
| Storage            | 5 GB          | Sufficient for 500K+ applications                      |
| Connections        | 20 max        | Set `DB_POOL_SIZE=3`, `DB_MAX_OVERFLOW=2` (total 5)    |
| Connection pooling | Not included  | SQLAlchemy QueuePool handles this (already configured) |
| Region             | Auto-assigned | Acceptable for prototype; upgrade to pick region       |

**The `.env` is already configured correctly:**

```
DATABASE_URL=postgresql+psycopg2://avnadmin:AVNS_...@pg-2343082a-samashwils2004-59b0.e.aivencloud.com:17475/defaultdb?sslmode=require
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
```

Reduce `DB_POOL_SIZE` to 3 and `DB_MAX_OVERFLOW` to 2 to stay safe under the 20-connection ceiling on the free tier.

---

## 2. Current model inventory (14 tables)

All models live in a single file: `apps/api/app/models/__init__.py`

| #      | Model                   | Table                     | Domain           | Status                                   |
| ------ | ----------------------- | ------------------------- | ---------------- | ---------------------------------------- |
| 1      | Institution             | institutions              | auth             | Complete                                 |
| 2      | Project                 | projects                  | control_plane    | Complete                                 |
| 3      | User                    | users                     | auth             | Complete                                 |
| 4      | Workflow                | workflows                 | control_plane    | Needs `ai_prompt` column                 |
| 5      | Application             | applications              | control_plane    | Complete                                 |
| 6      | Event                   | events                    | control_plane    | Complete                                 |
| 7      | BlueprintProposal       | blueprint_proposals       | ai               | Complete                                 |
| 8      | RolePermission          | role_permissions          | core             | Complete                                 |
| 9      | ProjectRoleBinding      | project_role_bindings     | core             | Complete                                 |
| 10     | APIKey                  | api_keys                  | control_plane    | Needs architecture link + webhook fields |
| 11     | WorkflowTemplate        | workflow_templates        | control_plane    | Complete                                 |
| 12     | InstitutionArchitecture | institution_architectures | architecture     | Complete                                 |
| 13     | ArchitectureVersion     | architecture_versions     | architecture     | Complete                                 |
| 14     | TemplateCustomization   | template_customizations   | ai               | Complete                                 |
| **15** | **ArchWorkflow**        | **arch_workflows**        | **architecture** | **NEW — must create**                    |

---

## 3. Gap analysis — what's missing for the prototype flow

### Gap 1: No junction table linking ArchitectureVersion → Workflows

The compile flow requires knowing which workflows are included in each architecture version. Currently `ArchitectureVersion` stores a `graph_snapshot` JSON blob, but there are no foreign key links to specific `Workflow` records. This means:

- You can't query "which workflows are in architecture version X?"
- You can't enforce referential integrity between compiled architectures and their workflows
- The Architect UI can't reliably display which workflows are linked

**Fix:** Add `ArchWorkflow` junction table.

### Gap 2: APIKey is not linked to ArchitectureVersion

The prototype flow compiles an architecture version and issues a versioned API key (`sk_test_erp_v1_...`). Currently `APIKey` is scoped to institution only. It has no:

- `architecture_version_id` (which compiled version this key grants access to)
- `environment` field (test vs live)
- `webhook_secret_hash` / `webhook_secret_prefix` (Stripe-pattern separated secrets)
- `project_id` scoping (currently institution-level only)

**Fix:** Add columns to existing `APIKey` model.

### Gap 3: Workflow missing `ai_prompt` field

When the AI generates a workflow, storing the original prompt enables regeneration, auditing, and the workflow builder's "Generated with AI" display. The `is_ai_generated` boolean exists but the prompt itself isn't captured on the workflow record.

**Fix:** Add `ai_prompt` column to `Workflow`.

---

## 4. Exact changes to `apps/api/app/models/__init__.py`

### 4a. Add `ArchWorkflow` class (after `ArchitectureVersion`)

```python
class ArchWorkflow(Base):
    """Junction: links architecture versions to their constituent workflows."""
    __tablename__ = "arch_workflows"
    __table_args__ = (
        UniqueConstraint(
            "architecture_version_id", "workflow_id",
            name="uq_arch_version_workflow",
        ),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    architecture_version_id = Column(
        String,
        ForeignKey("architecture_versions.id"),
        nullable=False,
        index=True,
    )
    workflow_id = Column(
        String,
        ForeignKey("workflows.id"),
        nullable=False,
        index=True,
    )
    display_order = Column(Integer, nullable=False, default=0)

    architecture_version = relationship(
        "ArchitectureVersion", backref="linked_workflows"
    )
    workflow = relationship("Workflow")
```

### 4b. Add columns to `APIKey`

```python
# Add these columns inside the existing APIKey class:

project_id = Column(
    String,
    ForeignKey("projects.id"),
    nullable=True,
    index=True,
)
architecture_version_id = Column(
    String,
    ForeignKey("architecture_versions.id"),
    nullable=True,
    index=True,
)
environment = Column(String(32), nullable=False, default="test")
webhook_secret_hash = Column(String(64), nullable=True)
webhook_secret_prefix = Column(String(24), nullable=True)

# Add relationship:
architecture_version = relationship(
    "ArchitectureVersion", backref="api_key"
)
project = relationship("Project", backref="api_keys")
```

### 4c. Add `ai_prompt` to `Workflow`

```python
# Add inside the existing Workflow class, after is_ai_generated:

ai_prompt = Column(Text, nullable=True)
```

---

## 5. Migration procedure

From `apps/api/` directory:

```bash
# 1. Generate migration
alembic revision --autogenerate -m "add arch_workflows junction, link api_keys to architecture, add ai_prompt to workflows"

# 2. Review the generated file in alembic/versions/
#    Verify it shows:
#    - CREATE TABLE arch_workflows (...)
#    - ALTER TABLE api_keys ADD COLUMN project_id ...
#    - ALTER TABLE api_keys ADD COLUMN architecture_version_id ...
#    - ALTER TABLE api_keys ADD COLUMN environment ...
#    - ALTER TABLE api_keys ADD COLUMN webhook_secret_hash ...
#    - ALTER TABLE api_keys ADD COLUMN webhook_secret_prefix ...
#    - ALTER TABLE workflows ADD COLUMN ai_prompt ...

# 3. Apply to Aiven
alembic upgrade head

# 4. Verify via Aiven PG Studio
#    https://console.aiven.io/account/.../pg-studio
#    Check arch_workflows table exists
#    Check api_keys has new columns
#    Check workflows has ai_prompt column
```

---

## 6. Complete prototype flow chain after changes

```
User (auth)
  └─ belongs to → Institution (auth)
      └─ has → Project (control_plane)
          ├─ contains → Workflow (control_plane)
          │   └─ may have → ai_prompt (if AI-generated)
          │   └─ may come from → BlueprintProposal (ai)
          │   └─ may come from → WorkflowTemplate (control_plane)
          │   └─ may come from → TemplateCustomization (ai)
          │
          ├─ has → InstitutionArchitecture (architecture)
          │   └─ has → ArchitectureVersion (architecture)
          │       ├─ links → ArchWorkflow → Workflow (NEW junction)
          │       └─ issues → APIKey (control_plane, UPDATED)
          │           ├─ key_hash + key_prefix (shown once)
          │           ├─ webhook_secret_hash + prefix (separate)
          │           └─ environment (test | live)
          │
          ├─ logs → Event (control_plane)
          │
          └─ receives → Application (control_plane, via runtime API)
              └─ authenticated by → APIKey
              └─ executed by → Workflow
```

---

## 7. Compile endpoint flow (new)

When user clicks "Compile" in the Architect UI, this is the backend sequence:

```
POST /api/architect/{architecture_id}/compile

1. Load InstitutionArchitecture by id
2. Validate all linked workflows are status=deployed
3. Create new ArchitectureVersion:
   - version = previous.version + 1
   - graph_snapshot = current graph_json
   - prompt = compile trigger context
4. Create ArchWorkflow rows for each linked workflow
5. Generate API key:
   - raw_key = f"sk_{environment}_erp_v{version}_{secrets.token_hex(16)}"
   - key_hash = sha256(raw_key)
   - key_prefix = raw_key[:20] + "..."
6. Generate webhook secret:
   - raw_secret = f"whsec_erp_{secrets.token_hex(16)}"
   - webhook_secret_hash = sha256(raw_secret)
   - webhook_secret_prefix = raw_secret[:16] + "..."
7. Create APIKey record linked to architecture_version_id
8. Emit event: architecture.compiled
9. Return {raw_key, raw_secret, version} — shown once, never stored raw
```

---

## 8. Runtime API authentication flow

When an external developer calls the API with their key:

```
POST /api/v1/applications
Headers: Authorization: Bearer sk_test_erp_v1_a8f3...
Body: { "workflow_id": "...", "applicant_data": {...} }

1. Extract key from Authorization header
2. Hash it: sha256(key)
3. Query: SELECT * FROM api_keys WHERE key_hash = ? AND is_active = true
4. If not found or expired → 401
5. Load architecture_version via api_key.architecture_version_id
6. Query arch_workflows: verify workflow_id is linked to this architecture
7. If not linked → 403 "Workflow not available in this architecture version"
8. Load workflow definition
9. Execute workflow engine (core/workflow_engine.py)
10. Create Application record
11. Emit event: application.submitted + workflow.transitioned
12. Update api_key.last_used_at
13. Return { application_id, current_state, events_emitted }
```

---

## 9. File locations for new code

| What                     | Where                                                       |
| ------------------------ | ----------------------------------------------------------- |
| Model changes            | `apps/api/app/models/__init__.py`                           |
| Compile endpoint         | `apps/api/app/routes/architect.py` (or `architecture/`)     |
| Key generation utilities | `apps/api/app/core/api_key_utils.py` (new)                  |
| Runtime auth middleware  | `apps/api/app/middleware/api_key_auth.py` (new or existing) |
| Compile service logic    | `apps/api/app/architecture/compiler/compiler.py` (existing) |
| Migration                | `apps/api/alembic/versions/` (auto-generated)               |
| Environment config       | `apps/api/.env` (already configured)                        |

---

## 10. Environment variable checklist

| Variable        | Current value     | Action needed                          |
| --------------- | ----------------- | -------------------------------------- |
| DATABASE_URL    | Aiven PostgreSQL  | Done                                   |
| DB_POOL_SIZE    | 5                 | Reduce to 3 (free tier safety)         |
| DB_MAX_OVERFLOW | 10                | Reduce to 2 (free tier safety)         |
| GEMINI_API_KEY  | empty             | Add when ready for AI integration      |
| SECRET_KEY      | dev-secret-key... | Change for production                  |
| SUPABASE\_\*    | empty             | Leave empty — no longer using Supabase |

---

## 11. Validation checklist

After applying changes:

- [ ] `alembic upgrade head` succeeds against Aiven
- [ ] `arch_workflows` table visible in PG Studio
- [ ] `api_keys` table has new columns (architecture_version_id, environment, webhook fields)
- [ ] `workflows` table has `ai_prompt` column
- [ ] Existing data (if any) is preserved
- [ ] Backend starts without errors: `uvicorn app.main:app --reload`
- [ ] `GET /api/health` returns 200
- [ ] SQLite fallback still works: set `DATABASE_URL=sqlite:///./admissions.db` and restart
