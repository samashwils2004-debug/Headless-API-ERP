"""Provider router — cascades through Claude → Gemini → Groq → Mock with Redis caching."""
from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)

CACHE_TTL = 86400  # 24 hours


def _cache_key(prompt: str, context: dict) -> str:
    raw = json.dumps({"prompt": prompt, "context": context}, sort_keys=True)
    return f"orquestra:ai:cache:{hashlib.sha256(raw.encode()).hexdigest()}"


_MOCK_STOP_WORDS = {
    "generate", "create", "build", "make", "design", "an", "a", "the", "for",
    "with", "and", "to", "from", "in", "of", "my", "our", "please", "i", "want",
    "need", "that", "this", "erp", "platform", "workflow", "containing", "following",
    "fields", "within", "it", "having", "particular", "displaying", "is", "are",
    "portal", "portals", "module", "modules", "component", "components", "section",
}

_DOMAIN_TEMPLATES: dict[str, dict[str, Any]] = {
    "fee": {
        "prefix": "fee_payment",
        "states": ["fee_initiated", "fee_submitted", "fee_verified", "fee_approved", "fee_rejected"],
        "fields": [
            {"name": "fee_amount", "type": "number", "required": True, "min": 0, "max": 999999},
            {"name": "payment_method", "type": "string", "required": True},
            {"name": "transaction_id", "type": "string", "required": False},
        ],
        "events": ["fee.initiated", "fee.submitted", "fee.verified"],
        "roles": ["student", "accounts_officer"],
    },
    "attendance": {
        "prefix": "attendance",
        "states": ["attendance_recorded", "attendance_verified", "attendance_flagged"],
        "fields": [
            {"name": "attendance_percentage", "type": "number", "required": True, "min": 0, "max": 100},
            {"name": "total_classes", "type": "number", "required": True, "min": 0},
            {"name": "classes_attended", "type": "number", "required": True, "min": 0},
        ],
        "events": ["attendance.recorded", "attendance.verified"],
        "roles": ["faculty", "student"],
    },
    "admission": {
        "prefix": "admission",
        "states": ["application_submitted", "documents_verified", "admission_approved", "admission_rejected"],
        "fields": [
            {"name": "student_name", "type": "string", "required": True},
            {"name": "email", "type": "string", "required": True},
            {"name": "program", "type": "string", "required": True},
        ],
        "events": ["admission.submitted", "admission.verified", "admission.decided"],
        "roles": ["applicant", "registrar"],
    },
    "performance": {
        "prefix": "performance",
        "states": ["marks_submitted", "marks_reviewed", "performance_evaluated"],
        "fields": [
            {"name": "ia_marks", "type": "number", "required": True, "min": 0, "max": 100},
            {"name": "ca_marks", "type": "number", "required": True, "min": 0, "max": 100},
            {"name": "total_marks", "type": "number", "required": False, "min": 0, "max": 200},
        ],
        "events": ["marks.ia_submitted", "marks.ca_submitted", "performance.evaluated"],
        "roles": ["faculty", "hod"],
    },
    "examination": {
        "prefix": "exam",
        "states": ["exam_scheduled", "exam_conducted", "results_published"],
        "fields": [
            {"name": "exam_type", "type": "string", "required": True},
            {"name": "exam_score", "type": "number", "required": True, "min": 0, "max": 100},
        ],
        "events": ["exam.scheduled", "exam.conducted", "results.published"],
        "roles": ["faculty", "student", "exam_controller"],
    },
    "scholarship": {
        "prefix": "scholarship",
        "states": ["scholarship_applied", "scholarship_reviewed", "scholarship_granted", "scholarship_denied"],
        "fields": [
            {"name": "scholarship_type", "type": "string", "required": True},
            {"name": "financial_need_score", "type": "number", "required": True, "min": 0, "max": 100},
        ],
        "events": ["scholarship.applied", "scholarship.reviewed", "scholarship.decided"],
        "roles": ["student", "financial_aid_officer"],
    },
}

# Keywords that map to domain templates
_KEYWORD_MAP = {
    "fee": "fee", "payment": "fee", "fees": "fee", "tuition": "fee",
    "attendance": "attendance", "absent": "attendance", "present": "attendance",
    "admission": "admission", "admissions": "admission", "enroll": "admission", "enrollment": "admission",
    "performance": "performance", "marks": "performance", "grade": "performance", "grades": "performance",
    "ia": "performance", "ca": "performance", "internal": "performance", "assessment": "performance",
    "exam": "examination", "examination": "examination", "test": "examination",
    "scholarship": "scholarship", "financial": "scholarship", "aid": "scholarship",
}


def _extract_domains_from_prompt(prompt: str) -> list[str]:
    """Extract domain template keys from the user's prompt."""
    words = prompt.lower().replace(",", " ").replace(".", " ").replace("-", " ").split()
    matched: list[str] = []
    seen: set[str] = set()
    for w in words:
        domain = _KEYWORD_MAP.get(w)
        if domain and domain not in seen:
            seen.add(domain)
            matched.append(domain)
    return matched if matched else ["admission"]


def _mock_blueprint(prompt: str, context: dict) -> dict[str, Any]:
    """Returns a prompt-aware mock blueprint that covers all domains mentioned."""
    institution_type = context.get("institution_type", "university")
    domains = _extract_domains_from_prompt(prompt)

    # Build workflow name from prompt
    prompt_slug = prompt.lower().strip()[:60].replace(" ", "_")
    for ch in ".,;:!?'\"()[]{}":
        prompt_slug = prompt_slug.replace(ch, "")
    wf_name = prompt_slug or "generated_erp_workflow"

    # Assemble states from matched domains
    states: dict[str, Any] = {}
    schema_fields: list[dict] = [
        {"name": "student_name", "type": "string", "required": True},
        {"name": "student_id", "type": "string", "required": True},
        {"name": "semester", "type": "number", "required": True, "min": 1, "max": 8},
        {"name": "course_id", "type": "string", "required": True},
    ]
    all_events: list[dict] = []
    all_roles: set[str] = {"student", "admin"}

    # Initial state
    first_domain = domains[0]
    first_template = _DOMAIN_TEMPLATES.get(first_domain, _DOMAIN_TEMPLATES["admission"])
    initial_state = first_template["states"][0]
    states[initial_state] = {
        "type": "initial",
        "transitions": [{"to": first_template["states"][1], "condition": None,
                         "emit_event": first_template["events"][0]}],
    }

    prev_last_state = None
    for di, domain_key in enumerate(domains):
        tmpl = _DOMAIN_TEMPLATES.get(domain_key, _DOMAIN_TEMPLATES["admission"])
        domain_states = tmpl["states"]

        for si, s_name in enumerate(domain_states):
            if s_name in states:
                continue
            if si == 0:
                # First state of domain — connect from previous domain's last state
                if prev_last_state and prev_last_state in states:
                    existing = states[prev_last_state]
                    if existing["type"] != "terminal":
                        existing["transitions"].append(
                            {"to": s_name, "condition": None,
                             "emit_event": f"{domain_key}.started"})
                states.setdefault(s_name, {
                    "type": "initial" if di == 0 and si == 0 else "intermediate",
                    "transitions": [{"to": domain_states[1] if len(domain_states) > 1 else s_name,
                                     "condition": None,
                                     "emit_event": tmpl["events"][0] if tmpl["events"] else f"{domain_key}.processed"}],
                })
            elif si == len(domain_states) - 1:
                # Last state of this domain — intermediate (will connect to next domain)
                states[s_name] = {"type": "intermediate", "transitions": []}
            else:
                next_state = domain_states[si + 1] if si + 1 < len(domain_states) else domain_states[-1]
                evt_idx = min(si, len(tmpl["events"]) - 1)
                states[s_name] = {
                    "type": "intermediate",
                    "transitions": [{"to": next_state, "condition": None,
                                     "emit_event": tmpl["events"][evt_idx] if evt_idx >= 0 else f"{domain_key}.processed"}],
                }

        prev_last_state = domain_states[-1]

        # Collect schema fields (dedup by name)
        existing_names = {f["name"] for f in schema_fields}
        for f in tmpl["fields"]:
            if f["name"] not in existing_names:
                schema_fields.append(f)
                existing_names.add(f["name"])

        for ev in tmpl["events"]:
            all_events.append({"type": ev, "version": "1.0"})

        for r in tmpl["roles"]:
            all_roles.add(r)

    # Add terminal states
    states["completed"] = {"type": "terminal", "transitions": []}
    states["rejected"] = {"type": "terminal", "transitions": []}

    # Connect last domain's final state to terminals
    if prev_last_state and prev_last_state in states:
        states[prev_last_state]["transitions"] = [
            {"to": "completed", "condition": "total_marks >= 50", "emit_event": "workflow.completed"},
            {"to": "rejected", "condition": "total_marks < 50", "emit_event": "workflow.rejected"},
        ]

    all_events.append({"type": "workflow.completed", "version": "1.0"})
    all_events.append({"type": "workflow.rejected", "version": "1.0"})

    roles = [{"name": r, "permissions": [f"{r}:read", f"{r}:write"]} for r in sorted(all_roles)]
    roles.append({"name": "admin", "permissions": ["*:*"]})

    compliance = ["ferpa"] if institution_type == "university" else ["gdpr"]

    return {
        "workflow": {
            "name": wf_name,
            "initial_state": initial_state,
            "states": states,
            "schema": {"fields": schema_fields},
        },
        "roles": roles,
        "events": all_events,
        "compliance_tags": compliance,
    }


class ProviderRouter:
    """Cascades through AI providers with Redis caching and mock fallback."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._redis = None
        self._gemini_client = None
        self._groq_client = None
        self._init_clients()

    def _init_clients(self) -> None:
        # Redis cache
        if self.settings.redis_url:
            try:
                import redis as redis_lib
                self._redis = redis_lib.from_url(self.settings.redis_url, decode_responses=True)
            except Exception as e:
                logger.warning("Redis cache unavailable: %s", e)

        # Claude (The primary AI)
        if self.settings.anthropic_api_key:
            try:
                import anthropic
                self._claude_client = anthropic.Anthropic(api_key=self.settings.anthropic_api_key)
                logger.info("Claude provider initialized")
            except Exception as e:
                logger.warning("Claude init failed: %s", e)

        # Gemini
        if self.settings.gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.settings.gemini_api_key)
                self._gemini_client = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")
                logger.info("Gemini provider initialized")
            except Exception as e:
                logger.warning("Gemini init failed: %s", e)

        # Groq
        if self.settings.groq_api_key:
            try:
                from groq import Groq
                self._groq_client = Groq(api_key=self.settings.groq_api_key)
                logger.info("Groq provider initialized")
            except Exception as e:
                logger.warning("Groq init failed: %s", e)

    def _get_cache(self, key: str) -> dict | None:
        if not self._redis:
            return None
        try:
            cached = self._redis.get(key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass
        return None

    def _set_cache(self, key: str, value: dict) -> None:
        if not self._redis:
            return
        try:
            self._redis.setex(key, CACHE_TTL, json.dumps(value))
        except Exception:
            pass

    def _build_system_prompt(self) -> str:
        return """You are an institutional ERP infrastructure compiler for Orquestra.
Your job is to read the user's prompt carefully, extract EVERY domain, portal, sub-module,
and component mentioned, then generate a comprehensive workflow blueprint that represents
the FULL process flow across all of them.

CRITICAL INSTRUCTIONS:
1. Parse the prompt for ALL keywords: portal names, module names, component names, field names.
   Example: "fee payment portal, attendance portal, student performance review with IA and CA"
   → states must include: fee_payment_submitted, fee_payment_verified, attendance_recorded,
     attendance_verified, ia_marks_submitted, ca_marks_submitted, performance_reviewed, etc.
2. The workflow name must reflect the ERP domain (e.g. "undergraduate_admissions_erp").
3. Create states for EACH portal/module mentioned — not just generic "submitted/approved".
4. Schema fields must include ALL data fields implied by the prompt (student_name, fee_amount,
   attendance_percentage, ia_marks, ca_marks, semester, course_id, etc.).
5. Create roles specific to the domain (student, faculty, accounts_officer, registrar, hod, dean).
6. Events must trace each transition (fee.payment_submitted, attendance.recorded, marks.ia_submitted, etc.).

Output ONLY valid JSON with this exact structure:
{
  "workflow": {
    "name": "descriptive_snake_case_name",
    "initial_state": "string",
    "states": {
      "<state_name>": {
        "type": "initial|intermediate|terminal",
        "transitions": [
          {"to": "<state>", "condition": "<expr or null>", "emit_event": "<domain.event_name>"}
        ]
      }
    },
    "schema": {
      "fields": [
        {"name": "field_name", "type": "string|number|boolean", "required": true|false, "min": null, "max": null, "enum": null, "format": null}
      ]
    }
  },
  "roles": [{"name": "role_name", "permissions": ["domain:action"]}],
  "events": [{"type": "domain.event_name", "version": "1.0"}],
  "compliance_tags": ["ferpa", "gdpr", "dpdp"]
}

Rules:
- initial_state must exist in states
- All transition targets must be valid state names
- At least one terminal state (with empty transitions array) must exist
- NO cycles — the graph must be a DAG
- Use flat field names in conditions (score >= 70, not application_data.score)
- Generate 8-20 states for complex prompts — cover every portal/module mentioned
- Schema must have 8-15 fields capturing all data from the prompt
- compliance_tags must be lowercase
- events must use "type" key (not "name")
- If existing workflows are described in PROJECT CONTEXT, reuse their field names and role names
- Return ONLY the JSON object, no markdown, no explanation"""

    def _try_claude(self, prompt: str, context: dict, system_prompt: str | None = None) -> dict | None:
        if not self._claude_client:
            return None
        try:
            sys = system_prompt or self._build_system_prompt()
            user_content = json.dumps({"requirement": prompt, "institution_context": context})
            message = self._claude_client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=8192,
                system=sys,
                messages=[{"role": "user", "content": user_content}],
            )
            text = message.content[0].text.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:-1])
            return json.loads(text)
        except Exception as e:
            logger.warning("Claude provider failed: %s", e)
            return None
    
    def _try_gemini(self, prompt: str, context: dict, system_prompt: str | None = None) -> dict | None:
        if not self._gemini_client:
            return None
        try:
            sys = system_prompt or self._build_system_prompt()
            user_content = json.dumps({"requirement": prompt, "institution_context": context})
            response = self._gemini_client.generate_content(
                f"{sys}\n\nRequirement: {user_content}",
                generation_config={"response_mime_type": "application/json", "temperature": 0.3},
            )
            text = response.text.strip()
            # Strip markdown code blocks if present (defensive)
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:-1])
            return json.loads(text)
        except Exception as e:
            logger.warning("Gemini provider failed: %s", e)
            return None

    def _try_groq(self, prompt: str, context: dict, system_prompt: str | None = None) -> dict | None:
        if not self._groq_client:
            return None
        try:
            sys = system_prompt or self._build_system_prompt()
            user_content = json.dumps({"requirement": prompt, "institution_context": context})
            response = self._groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": sys},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.1,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )
            text = response.choices[0].message.content
            return json.loads(text)
        except Exception as e:
            logger.warning("Groq provider failed: %s", e)
            return None

    def generate(
        self,
        prompt: str,
        institution_context: dict[str, Any],
        system_prompt: str | None = None,
    ) -> dict[str, Any]:
        """
        Generate a blueprint using the provider cascade.
        Returns: {result, provider_used, is_mock, cached}
        """
        cache_key = _cache_key(prompt, institution_context)

        # Try cache first
        cached = self._get_cache(cache_key)
        if cached:
            logger.info("AI response served from cache")
            return {"result": cached["result"], "provider_used": cached["provider_used"], "is_mock": False, "cached": True}

        # Provider cascade: Claude → Gemini → Groq → Mock
        result = None
        provider_used = "mock"

        result = self._try_claude(prompt, institution_context, system_prompt)
        if result:
            provider_used = "claude-sonnet-4-5"
        else:
            result = self._try_gemini(prompt, institution_context, system_prompt)
            if result:
                provider_used = "gemini-2.5-flash"
            else:
                result = self._try_groq(prompt, institution_context, system_prompt)
                if result:
                    provider_used = "groq-llama-3.1"

        is_mock = result is None
        if is_mock:
            result = _mock_blueprint(prompt, institution_context)
            provider_used = "mock"
            logger.warning("All AI providers failed — serving mock blueprint")

        response = {"result": result, "provider_used": provider_used, "is_mock": is_mock, "cached": False}

        # Cache non-mock results
        if not is_mock:
            self._set_cache(cache_key, {"result": result, "provider_used": provider_used})

        return response

    def reinit_if_stale(self) -> None:
        """Re-read settings and reinitialize providers if new keys are available."""
        from app.config import get_settings
        get_settings.cache_clear()
        fresh = get_settings()
        changed = False
        if fresh.anthropic_api_key and not getattr(self, "_claude_client", None):
            try:
                import anthropic
                self._claude_client = anthropic.Anthropic(api_key=fresh.anthropic_api_key)
                logger.info("Claude provider initialized (late-load from updated .env)")
                changed = True
            except Exception as e:
                logger.warning("Claude late-init failed: %s", e)
        if fresh.groq_api_key and not self._groq_client:
            try:
                from groq import Groq
                self._groq_client = Groq(api_key=fresh.groq_api_key)
                logger.info("Groq provider initialized (late-load from updated .env)")
                changed = True
            except Exception as e:
                logger.warning("Groq late-init failed: %s", e)
        if fresh.gemini_api_key and not self._gemini_client:
            try:
                import google.generativeai as genai
                genai.configure(api_key=fresh.gemini_api_key)
                self._gemini_client = genai.GenerativeModel("gemini-2.5-flash-preview-05-20")
                logger.info("Gemini provider initialized (late-load from updated .env)")
                changed = True
            except Exception as e:
                logger.warning("Gemini late-init failed: %s", e)
        if changed:
            self.settings = fresh


# Module-level singleton
_router: ProviderRouter | None = None


def get_provider_router() -> ProviderRouter:
    global _router
    if _router is None:
        _router = ProviderRouter()
    else:
        _router.reinit_if_stale()
    return _router
