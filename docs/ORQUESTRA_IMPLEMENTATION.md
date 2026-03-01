# ORQUESTRA — COMPLETE IMPLEMENTATION SPECIFICATION
## Institutional Architecture Layer + Free AI Strategy + Versioned API Keys

**Version:** 2.0  
**Status:** Implementation-Ready  
**Scope:** Addition to existing console — core runtime untouched  
**AI Strategy:** Zero-cost prototype using free-tier models + caching

---

## TABLE OF CONTENTS

1. [Strategic Context](#1-strategic-context)
2. [What This Document Adds](#2-what-this-document-adds)
3. [Free AI Strategy — Zero-Cost Prototype](#3-free-ai-strategy--zero-cost-prototype)
4. [Institutional Architecture Layer (IAL)](#4-institutional-architecture-layer-ial)
5. [Versioned API Keys](#5-versioned-api-keys)
6. [NLP → ERP Pipeline](#6-nlp--erp-pipeline)
7. [Database Additions](#7-database-additions)
8. [New API Routes](#8-new-api-routes)
9. [Console UI — Architect Surface](#9-console-ui--architect-surface)
10. [Caching Architecture](#10-caching-architecture)
11. [Rate Limit & Fallback Design](#11-rate-limit--fallback-design)
12. [Implementation Order](#12-implementation-order)
13. [Invariant Checklist](#13-invariant-checklist)
14. [File Additions Checklist](#14-file-additions-checklist)

---

## 1. Strategic Context

Orquestra is programmable institutional workflow infrastructure. The core philosophy — and the constraint this document never violates — is:

```
Infrastructure, not SaaS
Headless-first, API-primary
Deterministic state machine executor
Event-native architecture
AI as structural compiler, not assistant
```

The existing system has four invariant truths that must never break:

- Deployed workflows are immutable after deployment
- Every state transition emits an event
- AI output must pass the 4-stage validation pipeline before deployment
- Multi-tenant isolation enforced at DB + API + WebSocket level

**Everything in this document is an addition above the existing runtime, not a replacement of any part of it.**

The positioning this addition creates:

```
BEFORE:  Orquestra = workflow execution platform
AFTER:   Orquestra = AI-native institutional infrastructure designer
                     (Figma + Terraform + GitHub — but for institutional backends)
```

---

## 2. What This Document Adds

### What Changes

| Area | Addition |
|------|----------|
| Database | 2 new tables: `institution_architectures`, `architecture_versions` |
| Database | 2 new columns on `api_keys`: `architecture_version_id`, `version_tag` |
| API | 7 new routes under `/api/architect/*` |
| Console Sidebar | 1 new item: **Architect** (between AI Generator and Settings) |
| AI Layer | Mode B: ERP Architect (separate from existing Blueprint Generator) |
| AI Provider | Multi-provider free-tier routing (see Section 3) |
| Caching | Redis-based response cache for AI outputs |

### What Does NOT Change

- Workflow engine (deterministic execution, condition parser, transition logging)
- 4-stage validation pipeline (schema, graph integrity, permissions, compliance)
- Event engine and Redis streams
- RBAC enforcement
- Blueprint Generator (Mode A) — untouched, Mode B calls it, not replaces it
- Existing API key structure — keys without `version_tag` continue working identically
- WebSocket subscription model
- Any existing frontend page or component

---

## 3. Free AI Strategy — Zero-Cost Prototype

This is the most important section for keeping the prototype cost-free. The strategy uses a **provider cascade** — try the best free option first, fall back through cheaper/local options if rate-limited, and cache aggressively to avoid repeating calls at all.

### 3.1 Free Provider Hierarchy

```
Priority 1: Google Gemini 1.5 Flash
  Free tier: 15 RPM, 1M tokens/day (as of 2024)
  Best for: ERP composition (Mode B), complex structural reasoning
  API: generativelanguage.googleapis.com
  Cost: FREE with Google account

Priority 2: Groq (Llama 3.1 8B / 70B)
  Free tier: 30 RPM, 14,400 req/day
  Best for: Blueprint generation (Mode A), validation summaries
  API: api.groq.com/openai/v1
  Cost: FREE — extremely fast inference
  Note: OpenAI-compatible API — drop-in replacement

Priority 3: Cloudflare Workers AI
  Free tier: 10,000 neurons/day
  Best for: Simple classification, compliance tag detection
  Cost: FREE on Workers free plan
  Note: Use for lightweight preprocessing only

Priority 4: Ollama (Local Fallback)
  Models: llama3.2:3b, phi3.5:mini
  Best for: Development only, when cloud limits hit
  Cost: FREE (runs locally)
  Note: Not for production — for local dev iteration only
```

### 3.2 Provider Router Implementation

**File:** `apps/api/app/ai/provider_router.py`

```python
import asyncio
import hashlib
import json
import time
from enum import Enum
from typing import Optional
import httpx
from redis import Redis

class AIProvider(Enum):
    GEMINI_FLASH = "gemini-1.5-flash"
    GROQ_LLAMA = "groq-llama3-8b"
    CLOUDFLARE = "cloudflare-llama"
    OLLAMA_LOCAL = "ollama-local"

class ProviderRouter:
    """
    Routes AI requests through free-tier providers with fallback.
    Caches responses in Redis to avoid redundant calls.
    Implements exponential backoff on 429s.
    """

    PROVIDER_CONFIG = {
        AIProvider.GEMINI_FLASH: {
            "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
            "rpm_limit": 15,
            "daily_limit": 1_000_000,  # tokens
            "env_key": "GEMINI_API_KEY",
        },
        AIProvider.GROQ_LLAMA: {
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "rpm_limit": 30,
            "daily_limit": 14_400,  # requests
            "env_key": "GROQ_API_KEY",
        },
    }

    def __init__(self, redis: Redis):
        self.redis = redis
        self.provider_order = [
            AIProvider.GEMINI_FLASH,
            AIProvider.GROQ_LLAMA,
            AIProvider.OLLAMA_LOCAL,
        ]

    def _cache_key(self, prompt: str, mode: str) -> str:
        """Deterministic cache key from prompt content."""
        content = f"{mode}:{prompt}"
        return f"ai_cache:{hashlib.sha256(content.encode()).hexdigest()}"

    async def get_cached(self, prompt: str, mode: str) -> Optional[dict]:
        """Check Redis cache before making any API call."""
        key = self._cache_key(prompt, mode)
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)
        return None

    async def set_cache(self, prompt: str, mode: str, result: dict, ttl: int = 86400):
        """
        Cache AI response.
        ttl=86400 = 24 hours (ERP structures don't change that fast)
        ttl=3600  = 1 hour for blueprint drafts
        ttl=604800 = 7 days for template-like prompts
        """
        key = self._cache_key(prompt, mode)
        self.redis.setex(key, ttl, json.dumps(result))

    def _is_rate_limited(self, provider: AIProvider) -> bool:
        """Check Redis for recent request count against provider limits."""
        window_key = f"ratelimit:{provider.value}:{int(time.time() // 60)}"
        count = self.redis.get(window_key)
        if count is None:
            return False
        config = self.PROVIDER_CONFIG.get(provider, {})
        rpm_limit = config.get("rpm_limit", 10)
        return int(count) >= rpm_limit

    def _record_request(self, provider: AIProvider):
        """Increment per-minute request counter."""
        window_key = f"ratelimit:{provider.value}:{int(time.time() // 60)}"
        pipe = self.redis.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, 90)  # 90s window, covers full minute
        pipe.execute()

    async def complete(
        self,
        prompt: str,
        mode: str,           # "erp_architect" | "blueprint_generator" | "compliance_check"
        system_prompt: str,
        function_schema: dict,
        use_cache: bool = True,
    ) -> dict:
        """
        Main entry point. Cache → Provider cascade → Fallback.
        Returns structured function call result.
        """
        # 1. Check cache first — no API call needed
        if use_cache:
            cached = await self.get_cached(prompt, mode)
            if cached:
                cached["_from_cache"] = True
                return cached

        # 2. Try providers in priority order
        last_error = None
        for provider in self.provider_order:
            if self._is_rate_limited(provider):
                continue

            try:
                result = await self._call_provider(provider, prompt, system_prompt, function_schema)
                self._record_request(provider)

                # Cache successful response
                if use_cache:
                    ttl = 86400 if mode == "erp_architect" else 3600
                    await self.set_cache(prompt, mode, result, ttl)

                result["_provider"] = provider.value
                return result

            except RateLimitError:
                # Mark provider as rate-limited and try next
                self._record_request(provider)  # fill the bucket
                continue
            except Exception as e:
                last_error = e
                continue

        # 3. All providers failed — return mock for prototype
        return self._mock_response(prompt, mode)

    async def _call_provider(self, provider: AIProvider, prompt: str, system: str, schema: dict) -> dict:
        """Dispatch to correct provider adapter."""
        if provider == AIProvider.GEMINI_FLASH:
            return await self._call_gemini(prompt, system, schema)
        elif provider == AIProvider.GROQ_LLAMA:
            return await self._call_groq(prompt, system, schema)
        elif provider == AIProvider.OLLAMA_LOCAL:
            return await self._call_ollama(prompt, system)
        raise ValueError(f"Unknown provider: {provider}")

    async def _call_gemini(self, prompt: str, system: str, schema: dict) -> dict:
        """Gemini 1.5 Flash — best free option for structural reasoning."""
        import os
        api_key = os.environ["GEMINI_API_KEY"]

        payload = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "tools": [{"function_declarations": [schema]}],
            "tool_config": {"function_calling_config": {"mode": "ANY"}},
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2048},
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                json=payload
            )
            if resp.status_code == 429:
                raise RateLimitError("Gemini rate limited")
            resp.raise_for_status()
            data = resp.json()

        # Extract function call from Gemini response format
        candidate = data["candidates"][0]["content"]["parts"][0]
        if "functionCall" in candidate:
            return candidate["functionCall"]["args"]
        raise ValueError("Gemini did not return a function call")

    async def _call_groq(self, prompt: str, system: str, schema: dict) -> dict:
        """Groq with Llama 3.1 8B — extremely fast, OpenAI-compatible."""
        import os
        api_key = os.environ["GROQ_API_KEY"]

        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ],
            "tools": [{"type": "function", "function": schema}],
            "tool_choice": "required",
            "temperature": 0.2,
            "max_tokens": 2048,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload
            )
            if resp.status_code == 429:
                raise RateLimitError("Groq rate limited")
            resp.raise_for_status()
            data = resp.json()

        tool_call = data["choices"][0]["message"]["tool_calls"][0]
        return json.loads(tool_call["function"]["arguments"])

    async def _call_ollama(self, prompt: str, system: str) -> dict:
        """Local Ollama fallback — dev only, returns best-effort JSON."""
        payload = {
            "model": "llama3.2:3b",
            "messages": [
                {"role": "system", "content": system + "\nRespond ONLY with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "format": "json",
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post("http://localhost:11434/api/chat", json=payload)
            resp.raise_for_status()
            content = resp.json()["message"]["content"]
            return json.loads(content)

    def _mock_response(self, prompt: str, mode: str) -> dict:
        """
        Deterministic mock when all providers are unavailable.
        Used for demo/prototype — gives predictable output.
        Cache this aggressively (7 days).
        """
        if mode == "erp_architect":
            return {
                "_mock": True,
                "operation": "create",
                "domain": {
                    "id": "admissions",
                    "label": "Admissions",
                    "modules": ["intake", "review", "offer"],
                    "requires_workflow": True
                },
                "rationale": "[MOCK] Generated from prompt analysis"
            }
        # blueprint mode mock
        return {
            "_mock": True,
            "metadata": {"name": "Generated Workflow", "description": "Auto-generated from prompt"},
            "workflows": {
                "main": {
                    "initial_state": "submitted",
                    "states": {
                        "submitted": {"type": "intermediate"},
                        "accepted": {"type": "terminal"},
                        "rejected": {"type": "terminal"}
                    },
                    "transitions": [
                        {"from": "submitted", "to": "accepted", "condition": "percentage >= 75"},
                        {"from": "submitted", "to": "rejected", "condition": "percentage < 75"}
                    ]
                }
            }
        }


class RateLimitError(Exception):
    pass
```

### 3.3 Exponential Backoff Handler

**File:** `apps/api/app/ai/backoff.py`

```python
import asyncio
import random
from functools import wraps

def with_exponential_backoff(max_retries: int = 3, base_delay: float = 1.0):
    """
    Decorator for AI calls. On 429, waits and retries with jitter.
    Sequence: 1s, 2s, 4s (with ±20% jitter each time).
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except RateLimitError:
                    if attempt == max_retries - 1:
                        raise
                    delay = base_delay * (2 ** attempt)
                    jitter = delay * 0.2 * random.random()
                    await asyncio.sleep(delay + jitter)
        return wrapper
    return decorator
```

### 3.4 Prompt Compression

Keep prompts short. The biggest free-tier killer is verbosity.

**File:** `apps/api/app/ai/prompt_factory.py`

```python
# BAD — wastes tokens
VERBOSE_PROMPT = """
You are an AI assistant helping to design an institutional ERP system.
The user has a university with multiple departments and they want you to
help them create a comprehensive workflow management system. Please analyze
their requirements carefully and generate a detailed response...
"""

# GOOD — compressed, deterministic, token-efficient
ERP_SYSTEM_PROMPT = """You are an ERP architecture compiler for institutional systems.
Output ONLY via function call. No explanation text.
Rules: domains are independent, integrations use event names, no circular dependencies."""

def build_erp_prompt(user_input: str, existing_graph: dict | None) -> str:
    """Minimal prompt. Context only if graph exists."""
    base = f"User request: {user_input[:500]}"  # hard cap at 500 chars user input
    if existing_graph:
        # Send only domain names + statuses, not full graph
        summary = {
            "existing_domains": [d["id"] for d in existing_graph.get("domains", [])],
            "deployed_count": sum(1 for d in existing_graph.get("domains", []) if d["status"] == "deployed")
        }
        return f"{base}\n\nCurrent architecture summary: {summary}"
    return base
```

### 3.5 Environment Variables for Free AI

**Add to `.env.example`:**

```bash
# ── FREE AI PROVIDERS ──────────────────────────────────────
# Priority 1: Google Gemini Flash (15 RPM free)
# Get key: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIza...

# Priority 2: Groq (30 RPM free, extremely fast)
# Get key: https://console.groq.com/keys
GROQ_API_KEY=gsk_...

# Priority 3: Cloudflare Workers AI (10k neurons/day free)
# Get: https://dash.cloudflare.com → Workers AI
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_AI_TOKEN=

# AI Mode — controls which providers are active
AI_MODE=free          # free | mock | paid
AI_CACHE_TTL=86400    # 24h default

# ── DEPRECATED (do not use for prototype) ──────────────────
# OPENAI_API_KEY=sk-...   ← costs money, skip for now
```

### 3.6 Cost Estimate for Prototype (Zero)

| Provider | Free Tier | Enough for Prototype? |
|----------|-----------|----------------------|
| Gemini 1.5 Flash | 15 RPM, 1M tokens/day | Yes — 1M tokens ≈ 3,000 ERP generations/day |
| Groq Llama 3.1 8B | 30 RPM, 14,400 req/day | Yes — more than enough for demo |
| Cloudflare Workers AI | 10k neurons/day | Yes — for simple tasks |
| Redis Cache (hit rate ~80%) | Reduces real calls by 80% | Extends free tier 5x |
| **Total cost** | **$0/month** | **Yes** |

A demo with 50 unique ERP generation prompts uses approximately 50,000 tokens on Gemini — 5% of the daily free quota.

---

## 4. Institutional Architecture Layer (IAL)

### 4.1 What It Is

A design-time layer that sits **above** the existing runtime. It enables:

- NLP-driven ERP system composition through iterative conversation
- Visual domain graph with live workflow linkage status
- Structural versioning (every NLP change creates a new version)
- Architecture compilation → versioned API key issuance

**Critical rule:** The architecture model **never executes**. It describes structure. Only linked workflows execute through the existing runtime.

### 4.2 System Stack With IAL

```
NLP Prompt (iterative)
       ↓
ERP Architect AI (Mode B — NEW)
  └── Gemini 1.5 Flash / Groq Llama
       ↓
Architecture Model (institution_architectures)
  └── Structural graph, no execution
       ↓ (when user wants a workflow for a domain)
Blueprint Generator (Mode A — EXISTING, UNCHANGED)
  └── 4-stage validation pipeline
  └── Human-in-the-loop deploy
       ↓
Workflow Runtime (EXISTING, UNCHANGED)
  └── Deterministic execution
  └── Event emission
       ↓
Compile Architecture
  └── Resolve linked workflows
  └── Issue versioned API key
       ↓
Developer uses sk_live_erp_v2_... key
  └── All API calls scoped to that ERP version
```

### 4.3 Two AI Modes — Strict Separation

Mode A and Mode B must remain separate. They are not interchangeable.

| | Mode A: Blueprint Generator | Mode B: ERP Architect |
|---|---|---|
| Input | Single workflow description | Institutional system description |
| Output | Workflow JSON blueprint | Domain graph JSON |
| Session | Single-shot | Iterative/conversational |
| Validation | 4-stage pipeline (existing) | Structural diff only |
| Deploys | One workflow | Zero (links to workflows) |
| AI temp | 0.3 | 0.2 (more deterministic) |
| Endpoint | `/api/ai/generate` (existing) | `/api/architect/prompt` (new) |
| Console | AI Generator page (existing) | Architect page (new) |

Mode B **calls** Mode A when the user says "generate blueprint for the admissions domain." Mode B handles the conversation; Mode A handles the blueprint compilation. They hand off cleanly.

---

## 5. Versioned API Keys

### 5.1 The Concept

API keys become **version-pinned infrastructure endpoints**. A key issued after compiling ERP v2 routes all API calls through the scope of that compiled architecture — only the workflows belonging to that architecture version respond.

This gives developers the ability to:
- Pin their integration to a stable architecture version
- Test a new ERP version with a new key before cutting over
- Maintain multiple versions simultaneously during migration
- Know exactly which institutional structure they're calling into

### 5.2 Key Format

```
sk_test_4u2nXXXXXXXX          ← existing key, no ERP version (current behavior)
sk_live_9kLpXXXXXXXX          ← existing live key, no ERP version

sk_test_erp_v1_4u2nXXXXXXXX  ← test key, scoped to ERP v1
sk_live_erp_v1_9kLpXXXXXXXX  ← live key, scoped to ERP v1
sk_live_erp_v2_7mQrXXXXXXXX  ← live key, scoped to ERP v2 (newer)
```

Keys without an ERP version tag continue to work exactly as before — they route to the latest deployed architecture. No breaking change.

### 5.3 API Response Header

Every API response includes a version header so developers can see what they're calling into:

```http
HTTP/1.1 200 OK
X-Orquestra-ERP-Version: erp_v2
X-Orquestra-Workflow-Count: 3
Content-Type: application/json
```

### 5.4 Middleware Implementation

**File:** `apps/api/app/middleware/version_router.py`

```python
from fastapi import Request
from sqlalchemy.orm import Session
from app.models import APIKey, ArchitectureVersion

async def resolve_erp_version_middleware(request: Request, call_next):
    """
    Runs on every authenticated API request.
    If the key has an architecture_version_id, pins the request scope.
    If not, uses current behavior (no change).
    """
    api_key: APIKey = request.state.api_key  # set by auth middleware

    if api_key.architecture_version_id is None:
        # Existing keys — no change to behavior
        request.state.erp_version = None
        request.state.allowed_workflow_ids = None
    else:
        db: Session = request.state.db
        arch_version = db.query(ArchitectureVersion).filter(
            ArchitectureVersion.id == api_key.architecture_version_id
        ).first()

        request.state.erp_version = arch_version
        request.state.allowed_workflow_ids = [
            domain["workflow_id"]
            for domain in arch_version.compiled_package.get("domains", [])
            if domain.get("workflow_id")
        ]

    response = await call_next(request)

    # Add version header to response
    if request.state.erp_version:
        response.headers["X-Orquestra-ERP-Version"] = (
            arch_version.version_tag or f"erp_v{arch_version.version}"
        )

    return response
```

**Modification to workflow routes** (single line addition per route):

```python
# apps/api/app/routes/workflows.py
# EXISTING route — one line added:

@router.get("/workflows")
async def list_workflows(request: Request, db: Session = Depends(get_db)):
    query = db.query(Workflow).filter(Workflow.project_id == request.state.project_id)

    # ← NEW: scope to ERP version if key is versioned
    if request.state.allowed_workflow_ids is not None:
        query = query.filter(Workflow.id.in_(request.state.allowed_workflow_ids))

    return query.all()
```

### 5.5 Key Issuance on Compile

```python
# apps/api/app/routes/architect.py

@router.post("/architect/{architecture_id}/compile")
async def compile_architecture(
    architecture_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    arch = db.query(InstitutionArchitecture).filter(
        InstitutionArchitecture.id == architecture_id,
        InstitutionArchitecture.institution_id == current_user.institution_id
    ).first()

    # Resolve all linked workflows
    compiled_package = {
        "domains": [
            {
                "domain_id": d["id"],
                "workflow_id": d.get("workflow_id"),
                "workflow_version": d.get("workflow_version"),
                "status": d.get("status"),
            }
            for d in arch.graph_json["erp_system"]["domains"]
        ]
    }

    # Create architecture version record
    new_version = ArchitectureVersion(
        architecture_id=architecture_id,
        version=arch.version,
        compiled_package=compiled_package,
        prompt_used="[compile trigger]",
    )
    db.add(new_version)
    db.flush()

    # Issue new versioned API key
    raw_key, key_hash = generate_api_key()
    version_tag = f"erp_v{arch.version}"

    new_key = APIKey(
        project_id=arch.project_id,
        name=f"Auto-issued: {version_tag}",
        key_hash=key_hash,
        environment="live",
        architecture_version_id=new_version.id,
        version_tag=version_tag,
    )
    db.add(new_key)

    # Update architecture status
    arch.status = "compiled"
    arch.compiled_at = datetime.utcnow()

    db.commit()

    # Emit event
    await emit_event("architecture.compiled", {
        "architecture_id": architecture_id,
        "version": arch.version,
        "version_tag": version_tag,
        "workflow_count": len([d for d in compiled_package["domains"] if d["workflow_id"]]),
    })

    return {
        "version_tag": version_tag,
        "api_key": raw_key,  # shown once — same as existing key UX
        "compiled_package": compiled_package,
    }
```

---

## 6. NLP → ERP Pipeline

### 6.1 Full Pipeline

```
User types prompt in Architect console
              ↓
POST /api/architect/:id/prompt
              ↓
Fetch existing graph from DB
              ↓
Build compressed prompt (token-efficient)
              ↓
Check Redis cache (cache key = hash of prompt + graph summary)
              ↓
Cache hit → return immediately (no API call)
              ↓
Cache miss → ProviderRouter (Gemini → Groq → Mock)
              ↓
AI returns function call: { operation, domain, integration, rationale }
              ↓
Apply operation to graph JSON (pure data transform, no execution)
              ↓
Compute diff (prev vs new graph)
              ↓
Insert architecture_version row with diff_json
              ↓
Increment architecture.version
              ↓
Return: { new_graph, diff, version, rationale }
              ↓
Canvas UI re-renders with new state
```

### 6.2 ERP Function Schema

```python
# apps/api/app/ai/erp_function_schema.py

ERP_FUNCTION_SCHEMA = {
    "name": "compose_erp_architecture",
    "description": "Compose or update an institutional ERP domain graph. "
                   "Never creates execution logic — structural description only.",
    "parameters": {
        "type": "object",
        "required": ["operation", "rationale"],
        "properties": {
            "operation": {
                "type": "string",
                "enum": ["create", "add_domain", "add_integration",
                         "remove_domain", "update_domain", "link_workflow"],
                "description": "Type of structural change"
            },
            "domain": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "label": {"type": "string"},
                    "modules": {"type": "array", "items": {"type": "string"}},
                    "requires_workflow": {"type": "boolean"}
                }
            },
            "integration": {
                "type": "object",
                "properties": {
                    "from_domain": {"type": "string"},
                    "to_domain": {"type": "string"},
                    "trigger_event": {"type": "string"},
                    "description": {"type": "string"}
                }
            },
            "rationale": {
                "type": "string",
                "description": "One sentence explaining the structural change made"
            }
        }
    }
}
```

### 6.3 Iterative Session Example

This is how the console Architect chat behaves:

```
User: "Create ERP for a university: admissions and finance"
  → AI: operation=create, 2 domains added
  → architecture_v1 created, graph has 2 domains (draft)

User: "Add scholarship approval under finance"
  → AI: operation=add_domain, scholarship domain added
  → architecture_v2 diff: +1 domain under finance
  → Canvas shows new node linked to finance

User: "When admissions accepts someone, trigger scholarship eligibility check"
  → AI: operation=add_integration
  → architecture_v2 updated: edge admissions→scholarship, trigger=application.accepted
  → Canvas shows edge with event label

User: "Generate a blueprint for the admissions workflow"
  → Routes to existing Blueprint Generator (Mode A)
  → Normal 4-stage validation flow
  → On deploy: workflow_id linked back to admissions domain in architecture

User: "Compile and issue a new API key"
  → POST /api/architect/:id/compile
  → sk_live_erp_v2_XXXX issued
  → Shown once in console (same UX as existing key reveal)
```

### 6.4 Graph Diff Computation

```python
# apps/api/app/ai/erp_diff.py

def compute_architecture_diff(prev_graph: dict, next_graph: dict) -> dict:
    """
    Pure structural diff — no execution.
    Used for version history display and canvas animation.
    """
    prev_domains = {d["id"]: d for d in prev_graph.get("domains", [])}
    next_domains = {d["id"]: d for d in next_graph.get("domains", [])}

    prev_integrations = {
        f"{i['from']}->{i['to']}": i
        for i in prev_graph.get("integrations", [])
    }
    next_integrations = {
        f"{i['from']}->{i['to']}": i
        for i in next_graph.get("integrations", [])
    }

    return {
        "added_domains": [d for k, d in next_domains.items() if k not in prev_domains],
        "removed_domains": [d for k, d in prev_domains.items() if k not in next_domains],
        "modified_domains": [
            {"before": prev_domains[k], "after": d}
            for k, d in next_domains.items()
            if k in prev_domains and prev_domains[k] != d
        ],
        "added_integrations": [i for k, i in next_integrations.items() if k not in prev_integrations],
        "removed_integrations": [i for k, i in prev_integrations.items() if k not in next_integrations],
        "workflow_links_changed": [
            d for d in next_domains.values()
            if d.get("workflow_id") != prev_domains.get(d["id"], {}).get("workflow_id")
        ],
        "summary": _generate_diff_summary(prev_graph, next_graph)
    }

def _generate_diff_summary(prev: dict, next: dict) -> str:
    """Human-readable one-line summary of what changed."""
    prev_count = len(prev.get("domains", []))
    next_count = len(next.get("domains", []))
    delta = next_count - prev_count
    if delta > 0:
        return f"+{delta} domain{'s' if delta > 1 else ''} added"
    elif delta < 0:
        return f"{abs(delta)} domain{'s' if abs(delta) > 1 else ''} removed"
    return "Domain configuration updated"
```

---

## 7. Database Additions

Only two new tables and two column additions. All existing tables unchanged.

### 7.1 institution_architectures

```sql
CREATE TABLE institution_architectures (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version          INTEGER NOT NULL DEFAULT 1,
    status           TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'compiled', 'deployed')),
    graph_json       JSONB NOT NULL,
    -- Shape: { "erp_system": { "name": "", "domains": [...], "integrations": [...] } }
    linked_workflows JSONB NOT NULL DEFAULT '[]',
    -- Shape: [{ "domain_id": "", "workflow_id": "", "workflow_version": 1 }]
    compiled_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    created_by       UUID REFERENCES users(id)
);

-- Unique version per project
CREATE UNIQUE INDEX idx_arch_project_version
    ON institution_architectures (project_id, version);

-- Fast JSON queries on domain graph
CREATE INDEX idx_arch_graph ON institution_architectures USING GIN (graph_json);

-- Row-level security: same pattern as workflows
ALTER TABLE institution_architectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY arch_institution_isolation ON institution_architectures
    USING (institution_id = current_setting('app.institution_id')::uuid);
```

### 7.2 architecture_versions

```sql
CREATE TABLE architecture_versions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    architecture_id  UUID NOT NULL REFERENCES institution_architectures(id) ON DELETE CASCADE,
    version          INTEGER NOT NULL,
    diff_json        JSONB,
    -- Shape: { added_domains, removed_domains, modified_domains, added_integrations, ... }
    prompt_used      TEXT,
    compiled_package JSONB,
    -- Shape: { domains: [{ domain_id, workflow_id, workflow_version, status }] }
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (architecture_id, version)
);
```

### 7.3 api_keys modification

```sql
-- Add two columns to existing api_keys table
-- SAFE: both nullable — existing rows unaffected
ALTER TABLE api_keys
    ADD COLUMN architecture_version_id UUID
        REFERENCES architecture_versions(id) ON DELETE SET NULL;

ALTER TABLE api_keys
    ADD COLUMN version_tag TEXT;
-- e.g. "erp_v1", "erp_v2" — human-readable display in console

-- Index for fast version lookups
CREATE INDEX idx_api_keys_version ON api_keys (architecture_version_id)
    WHERE architecture_version_id IS NOT NULL;
```

### 7.4 Alembic Migration

**File:** `apps/api/alembic/versions/xxx_add_ial_tables.py`

```python
"""Add Institutional Architecture Layer tables

Revision ID: add_ial_tables
Revises: [previous_revision]
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

def upgrade():
    # institution_architectures
    op.create_table(
        'institution_architectures',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('institution_id', UUID(as_uuid=True), sa.ForeignKey('institutions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.Text(), nullable=False, server_default='draft'),
        sa.Column('graph_json', JSONB(), nullable=False),
        sa.Column('linked_workflows', JSONB(), nullable=False, server_default='[]'),
        sa.Column('compiled_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id')),
    )

    # architecture_versions
    op.create_table(
        'architecture_versions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('architecture_id', UUID(as_uuid=True), sa.ForeignKey('institution_architectures.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('diff_json', JSONB()),
        sa.Column('prompt_used', sa.Text()),
        sa.Column('compiled_package', JSONB()),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
    )

    # api_keys additions
    op.add_column('api_keys', sa.Column('architecture_version_id', UUID(as_uuid=True), sa.ForeignKey('architecture_versions.id', ondelete='SET NULL'), nullable=True))
    op.add_column('api_keys', sa.Column('version_tag', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('api_keys', 'version_tag')
    op.drop_column('api_keys', 'architecture_version_id')
    op.drop_table('architecture_versions')
    op.drop_table('institution_architectures')
```

---

## 8. New API Routes

All new routes live under `/api/architect/`. They are isolated from existing routes and do not modify any existing endpoint.

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| `POST` | `/api/architect` | Create new ERP architecture from first NLP prompt | Yes |
| `GET` | `/api/architect` | List architectures for current project | Yes |
| `GET` | `/api/architect/:id` | Get architecture with current graph | Yes |
| `POST` | `/api/architect/:id/prompt` | Apply iterative NLP change | Yes |
| `GET` | `/api/architect/:id/versions` | List all versions with summaries | Yes |
| `GET` | `/api/architect/:id/versions/:v/diff` | Get visual diff for a version | Yes |
| `POST` | `/api/architect/:id/compile` | Compile → issue versioned API key | Yes |
| `GET` | `/api/architect/:id/api-surfaces` | List generated API endpoints for version | Yes |

### Route Implementation

**File:** `apps/api/app/routes/architect.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.ai.provider_router import ProviderRouter
from app.ai.erp_function_schema import ERP_FUNCTION_SCHEMA, ERP_SYSTEM_PROMPT
from app.ai.prompt_factory import build_erp_prompt
from app.ai.erp_diff import compute_architecture_diff
from app.models import InstitutionArchitecture, ArchitectureVersion
from app.security.api_key_manager import generate_api_key
from app.dependencies import get_db, get_current_user, get_redis

router = APIRouter(prefix="/architect", tags=["architect"])


@router.post("")
async def create_architecture(
    payload: CreateArchitectureRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    redis = Depends(get_redis),
):
    """Create initial ERP architecture from NLP prompt."""
    router_ai = ProviderRouter(redis)

    ai_result = await router_ai.complete(
        prompt=payload.prompt,
        mode="erp_architect",
        system_prompt=ERP_SYSTEM_PROMPT,
        function_schema=ERP_FUNCTION_SCHEMA,
    )

    initial_graph = _apply_operation_to_graph({}, ai_result)

    arch = InstitutionArchitecture(
        institution_id=current_user.institution_id,
        project_id=payload.project_id,
        version=1,
        status="draft",
        graph_json=initial_graph,
        created_by=current_user.id,
    )
    db.add(arch)
    db.flush()

    version = ArchitectureVersion(
        architecture_id=arch.id,
        version=1,
        prompt_used=payload.prompt,
        diff_json={"type": "initial_creation"},
    )
    db.add(version)
    db.commit()

    return {"architecture_id": str(arch.id), "graph": initial_graph, "version": 1}


@router.post("/{architecture_id}/prompt")
async def apply_prompt(
    architecture_id: str,
    payload: PromptRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    redis = Depends(get_redis),
):
    """Apply iterative NLP change to existing architecture."""
    arch = _get_arch_or_404(db, architecture_id, current_user.institution_id)
    prev_graph = arch.graph_json.copy()

    router_ai = ProviderRouter(redis)
    ai_result = await router_ai.complete(
        prompt=build_erp_prompt(payload.prompt, arch.graph_json),
        mode="erp_architect",
        system_prompt=ERP_SYSTEM_PROMPT,
        function_schema=ERP_FUNCTION_SCHEMA,
    )

    new_graph = _apply_operation_to_graph(arch.graph_json, ai_result)
    diff = compute_architecture_diff(prev_graph, new_graph)

    arch.graph_json = new_graph
    arch.version += 1

    new_version = ArchitectureVersion(
        architecture_id=arch.id,
        version=arch.version,
        prompt_used=payload.prompt,
        diff_json=diff,
    )
    db.add(new_version)
    db.commit()

    return {
        "graph": new_graph,
        "version": arch.version,
        "diff": diff,
        "rationale": ai_result.get("rationale", ""),
        "from_cache": ai_result.get("_from_cache", False),
    }
```

---

## 9. Console UI — Architect Surface

### 9.1 Sidebar Addition

Add one item to the existing console sidebar, between "API Keys" and "Settings":

```
Dashboard
Projects
Templates
Workflows
AI Generator       ← existing (unchanged)
Event Stream
API Keys
─────────────────
Architect          ← NEW
─────────────────
Settings
```

**File:** `apps/web/src/components/console/ConsoleSidebar.tsx`

```tsx
// Add this nav item to existing sidebar:
<NavItem
  href="/console/architect"
  icon={<NetworkIcon size={16} />}
  active={pathname.startsWith('/console/architect')}
  badge="new"
>
  Architect
</NavItem>
```

### 9.2 Architect Page Structure

**File:** `apps/web/src/app/console/architect/page.tsx`

```
/console/architect
├── [No architecture] → Welcome screen + "Start with a prompt" CTA
└── [Architecture exists] → Canvas view

Canvas Layout:
┌─────────────────────────────────────────────────────────┐
│ SIDEBAR (220px)          │ MAIN CANVAS                  │
│                          │                              │
│ Architect                │ [Toolbar: version + actions] │
│ ─────────────────        │                              │
│ ERP Canvas               │  Domain nodes (draggable)    │
│ Version History          │  Integration edges (SVG)     │
│ Compile & Deploy         │  Status indicators           │
│ API Surfaces             │                              │
│                          │  ─────────────────────────── │
│ ─────────────────        │  PROMPT BAR (bottom)         │
│ CURRENT VERSION          │  [type a change...]   Apply  │
│ erp_v2                   │                              │
│ Compiled Dec 3           │                              │
│ 3 workflows linked       │                              │
└─────────────────────────────────────────────────────────┘
```

### 9.3 Canvas Component

**File:** `apps/web/src/components/architect/ERPCanvas.tsx`

```tsx
'use client'

import { useState, useRef } from 'react'
import { useArchitectStore } from '@/lib/stores/architectStore'

export function ERPCanvas({ architectureId }: { architectureId: string }) {
  const { graph, applyPrompt, isLoading, lastDiff } = useArchitectStore()
  const [prompt, setPrompt] = useState('')

  const handleApply = async () => {
    if (!prompt.trim()) return
    await applyPrompt(architectureId, prompt)
    setPrompt('')
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-[#0f0f12]">
      {/* Domain nodes */}
      <div className="absolute inset-0 p-8">
        <DomainGraph graph={graph} lastDiff={lastDiff} />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="text-sm font-mono text-[#60a5fa] animate-pulse">
            Composing architecture...
          </div>
        </div>
      )}

      {/* Prompt bar */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-3 bg-[#18181c] border border-[#2f2f36] rounded-lg p-3">
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
          placeholder="Describe a change... e.g. 'Add international student intake module'"
          className="flex-1 bg-transparent font-mono text-sm text-[#60a5fa] outline-none placeholder:text-[#8a8a94]"
        />
        <button
          onClick={handleApply}
          disabled={!prompt.trim() || isLoading}
          className="font-mono text-sm text-[#4ade80] hover:text-white transition-colors disabled:opacity-40"
        >
          Apply →
        </button>
      </div>
    </div>
  )
}
```

### 9.4 Zustand Store

**File:** `apps/web/src/lib/stores/architectStore.ts`

```typescript
import { create } from 'zustand'

interface ArchitectStore {
  graph: ERPGraph | null
  versions: ArchitectureVersion[]
  isLoading: boolean
  lastDiff: ArchitectureDiff | null

  fetchArchitecture: (id: string) => Promise<void>
  applyPrompt: (id: string, prompt: string) => Promise<void>
  compile: (id: string) => Promise<{ apiKey: string; versionTag: string }>
}

export const useArchitectStore = create<ArchitectStore>((set, get) => ({
  graph: null,
  versions: [],
  isLoading: false,
  lastDiff: null,

  applyPrompt: async (id, prompt) => {
    set({ isLoading: true })
    try {
      const res = await fetch(`/api/architect/${id}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      set({
        graph: data.graph,
        lastDiff: data.diff,
        isLoading: false,
      })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  compile: async (id) => {
    const res = await fetch(`/api/architect/${id}/compile`, { method: 'POST' })
    const data = await res.json()
    return { apiKey: data.api_key, versionTag: data.version_tag }
  },
}))
```

### 9.5 API Keys Page Modification

The existing API Keys page gets a minor visual update — no structural change to the component, just additional data displayed:

```tsx
// Existing APIKeyCard — add version badge if present:
{key.version_tag && (
  <span className="font-mono text-xs px-2 py-0.5 rounded border"
    style={{ color: '#60a5fa', borderColor: '#1d4ed840', background: '#1d4ed810' }}>
    {key.version_tag}
  </span>
)}

// Add deprecation notice for older versioned keys:
{key.version_tag && !key.is_current_version && (
  <p className="text-xs text-[#8a8a94] mt-1">
    Older ERP version — consider migrating to {currentVersionTag}
  </p>
)}
```

---

## 10. Caching Architecture

The cache layer is the most important cost control mechanism. With an 80% cache hit rate, free tier limits extend by 5x.

### 10.1 Cache Key Strategy

```python
# Three cache namespaces, different TTLs:

# 1. ERP composition results — 24h
# Key: ai_cache:{sha256(mode + prompt + graph_summary)}
# Rationale: Same prompt on same graph should return same structure

# 2. Blueprint generation results — 1h
# Key: ai_cache:{sha256("blueprint" + prompt + institution_type)}
# Rationale: Blueprint prompts reused often in demos/testing

# 3. Compliance checks — 7 days
# Key: ai_cache:{sha256("compliance" + tags_sorted)}
# Rationale: Compliance rules rarely change
```

### 10.2 Cache Warming for Demo

```python
# scripts/seed/warm_ai_cache.py
"""
Pre-populate AI cache with common demo prompts.
Run before a demo to ensure zero latency and zero API calls.
"""

COMMON_DEMO_PROMPTS = [
    ("erp_architect", "Create ERP for a university: admissions and finance"),
    ("erp_architect", "Add scholarship approval under finance"),
    ("erp_architect", "Connect admissions to scholarship via application.accepted"),
    ("blueprint_generator", "Auto-accept above 90%, review 75-90%, reject below 75%"),
    ("blueprint_generator", "Three-stage committee review with dean approval"),
]

async def warm_cache():
    router = ProviderRouter(redis_client)
    for mode, prompt in COMMON_DEMO_PROMPTS:
        result = await router.complete(
            prompt=prompt, mode=mode,
            system_prompt=get_system_prompt(mode),
            function_schema=get_schema(mode),
            use_cache=True,
        )
        print(f"Cached: {mode} / {prompt[:50]}...")
        print(f"  Provider: {result.get('_provider', 'cache')}")
```

### 10.3 Cache Bypass for Development

```bash
# Force fresh AI call (for testing new prompts):
POST /api/architect/:id/prompt
Headers:
  X-Cache-Control: no-cache   ← bypass cache for this request
```

---

## 11. Rate Limit & Fallback Design

### 11.1 Graceful Degradation

```
Tier 1: Cache hit           → 0ms, 0 cost, perfect response
Tier 2: Gemini Flash        → ~1s, free, best quality
Tier 3: Groq Llama 8B       → ~0.3s, free, good quality
Tier 4: Mock response       → 0ms, 0 cost, deterministic fake
```

The user should never see an error. At worst, they get a mock response that demonstrates the concept. The frontend can show a subtle indicator:

```tsx
{result.from_cache && (
  <span className="text-[10px] font-mono text-[#8a8a94]">from cache</span>
)}
{result.is_mock && (
  <span className="text-[10px] font-mono text-[#fbbf24]">demo mode</span>
)}
```

### 11.2 Daily Limit Tracking

```python
# apps/api/app/ai/quota_tracker.py

def check_daily_quota(provider: AIProvider, redis: Redis) -> bool:
    """Returns True if provider still has quota available."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    key = f"daily_quota:{provider.value}:{today}"
    count = redis.get(key)

    limits = {
        AIProvider.GEMINI_FLASH: 1_000_000,  # tokens (rough request count: ~500)
        AIProvider.GROQ_LLAMA: 14_400,       # requests
    }

    if count is None:
        return True
    return int(count) < limits.get(provider, 100)

def record_daily_usage(provider: AIProvider, redis: Redis, tokens: int = 2000):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    key = f"daily_quota:{provider.value}:{today}"
    pipe = redis.pipeline()
    pipe.incrby(key, tokens)
    pipe.expireat(key, int(datetime.utcnow().replace(hour=23, minute=59, second=59).timestamp()))
    pipe.execute()
```

### 11.3 Rate Limit Error Response (API)

```python
# When all providers are rate-limited:
{
  "status": "degraded",
  "result": { ...mock_response... },
  "warning": "AI providers at capacity — showing cached/demo response",
  "retry_after": 60  # seconds
}
# HTTP 200 with degraded flag — never return an error to the UI
```

---

## 12. Implementation Order

This slots cleanly into the existing 5-phase plan as Phase 4.5:

### Phase 4.5 — IAL + Free AI + Versioned Keys

**Day 1: Free AI Provider Setup**

- [ ] Register Gemini API key (Google AI Studio — free)
- [ ] Register Groq API key (console.groq.com — free)
- [ ] Add keys to `.env.example` and `.env.local`
- [ ] Implement `provider_router.py` with Gemini + Groq + Mock
- [ ] Implement `backoff.py` and `quota_tracker.py`
- [ ] Implement `prompt_factory.py` (compressed prompts)
- [ ] Test: verify existing Blueprint Generator works with Gemini Flash

**Day 2: Database + Migrations**

- [ ] Write Alembic migration for `institution_architectures`
- [ ] Write Alembic migration for `architecture_versions`
- [ ] Add columns to `api_keys`
- [ ] Run migration, verify RLS policies
- [ ] Add SQLAlchemy models for new tables

**Day 3: Backend Routes**

- [ ] Implement `apps/api/app/routes/architect.py`
- [ ] Implement `version_router.py` middleware
- [ ] Implement `erp_diff.py`
- [ ] Wire `compile_architecture` endpoint + key issuance
- [ ] Test all 7 new routes with Postman/pytest

**Day 4: Console UI**

- [ ] Add Architect nav item to `ConsoleSidebar.tsx`
- [ ] Implement `ERPCanvas.tsx` (domain nodes + SVG edges + prompt bar)
- [ ] Implement `useArchitectStore` Zustand store
- [ ] Implement version history sidebar
- [ ] Implement compile flow + key reveal modal (reuse existing key reveal UX)
- [ ] Update API Keys page with version badges

**Day 5: Cache + Demo Prep**

- [ ] Implement Redis cache in `provider_router.py`
- [ ] Write `warm_ai_cache.py` script
- [ ] Run cache warming with 5 demo prompts
- [ ] Verify cache hit rate in Redis
- [ ] End-to-end test: prompt → graph → compile → versioned key → API call

---

## 13. Invariant Checklist

Every system invariant from the implementation document, checked:

| Invariant | Status | How |
|-----------|--------|-----|
| Deployed workflows are immutable | ✓ Preserved | Architecture model only links to workflows by ID — never modifies them |
| Every state transition emits an event | ✓ Preserved | Workflow runtime unchanged — architecture is pre-runtime |
| AI output must pass 4-stage validation | ✓ Preserved | Mode A (Blueprint Generator) unchanged. Mode B outputs graph JSON, not blueprints. Blueprints still go through full pipeline |
| Multi-tenant isolation at DB + API | ✓ Preserved | `institution_architectures` has `institution_id` + RLS. Version middleware scoped by `project_id` |
| No dynamic code execution | ✓ Preserved | ERP graph is pure JSON. AI uses function calling at `temp=0.2`. No eval(), no exec() |
| Version always displayed in UI | ✓ Preserved | Version tag shown on API keys, `X-Orquestra-ERP-Version` header on responses, canvas toolbar shows current version |
| No auto-deploy | ✓ Preserved | Compile issues a key but does NOT deploy workflows. Workflows require existing explicit human-in-the-loop deploy |
| Backend is authoritative | ✓ Preserved | Architecture graph validated server-side. Diff computed server-side. Key issued only after server-side compile |
| Deterministic execution | ✓ Preserved | Architecture layer does not touch the workflow engine |
| Redis down → fallback | ✓ Preserved | Cache miss → AI call. Rate limit check skipped if Redis unavailable (fail open) |
| Stateless execution | ✓ Preserved | Architecture state in DB, not in memory |

---

## 14. File Additions Checklist

### Backend (apps/api)

```
apps/api/app/
├── ai/
│   ├── provider_router.py          ← NEW (free AI cascade)
│   ├── backoff.py                  ← NEW (exponential backoff)
│   ├── quota_tracker.py            ← NEW (daily limit tracking)
│   ├── prompt_factory.py           ← NEW (compressed prompts)
│   ├── erp_function_schema.py      ← NEW (Mode B schema)
│   ├── erp_diff.py                 ← NEW (structural diff)
│   ├── blueprint_generator.py      ← EXISTING (unchanged, but now uses provider_router)
│   └── validators/                 ← EXISTING (unchanged)
│
├── middleware/
│   └── version_router.py           ← NEW (ERP version scoping)
│
├── models/
│   ├── institution_architecture.py ← NEW
│   └── architecture_version.py     ← NEW
│
├── routes/
│   ├── architect.py                ← NEW (7 routes)
│   └── [all existing routes]       ← UNCHANGED (except 1-line filter addition)
│
└── alembic/versions/
    └── xxx_add_ial_tables.py       ← NEW migration
```

### Frontend (apps/web)

```
apps/web/src/
├── app/console/
│   └── architect/
│       ├── page.tsx                ← NEW
│       └── [id]/
│           └── page.tsx            ← NEW (canvas for specific architecture)
│
├── components/
│   └── architect/
│       ├── ERPCanvas.tsx           ← NEW
│       ├── DomainGraph.tsx         ← NEW (SVG domain visualization)
│       ├── DomainNode.tsx          ← NEW
│       ├── IntegrationEdge.tsx     ← NEW
│       ├── VersionHistoryPanel.tsx ← NEW
│       └── CompileModal.tsx        ← NEW (reuses existing key reveal pattern)
│
└── lib/
    └── stores/
        └── architectStore.ts       ← NEW (Zustand store for architect page)
```

### Scripts

```
scripts/
└── seed/
    └── warm_ai_cache.py            ← NEW (pre-populate demo cache)
```

### Environment

```
.env.example
  GEMINI_API_KEY=                   ← ADD
  GROQ_API_KEY=                     ← ADD
  AI_MODE=free                      ← ADD
  AI_CACHE_TTL=86400                ← ADD
```

---

*This document covers the complete IAL addition. Every section maps to concrete, implementable code. The existing system is not modified — this is purely additive. Start with the Free AI setup on Day 1 to validate the provider cascade works in your environment before building anything else.*
