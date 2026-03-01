"""Provider router — cascades through Gemini → Groq → Mock with Redis caching."""
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


def _mock_blueprint(prompt: str, context: dict) -> dict[str, Any]:
    """Returns a deterministic mock blueprint for fallback."""
    institution_type = context.get("institution_type", "university")
    return {
        "workflow": {
            "name": "generated_workflow",
            "initial_state": "submitted",
            "states": {
                "submitted": {
                    "type": "initial",
                    "transitions": [{"to": "under_review", "condition": None, "emit_event": "application.submitted"}],
                },
                "under_review": {
                    "type": "intermediate",
                    "transitions": [
                        {"to": "approved", "condition": "application_data.score >= 70", "emit_event": "application.reviewed"},
                        {"to": "rejected", "condition": "application_data.score < 70", "emit_event": "application.reviewed"},
                    ],
                },
                "approved": {"type": "terminal", "transitions": []},
                "rejected": {"type": "terminal", "transitions": []},
            },
        },
        "roles": [
            {"name": "applicant", "permissions": ["application:create", "application:read"]},
            {"name": "reviewer", "permissions": ["application:read", "application:review"]},
            {"name": "admin", "permissions": ["application:*", "workflow:*"]},
        ],
        "events": [
            {"name": "application.submitted", "version": "1.0"},
            {"name": "application.reviewed", "version": "1.0"},
        ],
        "compliance_tags": ["FERPA"] if institution_type == "university" else ["GDPR"],
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

        # Gemini
        if self.settings.gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.settings.gemini_api_key)
                self._gemini_client = genai.GenerativeModel("gemini-1.5-flash")
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
Generate a JSON blueprint for the given prompt. The blueprint MUST be valid JSON with this exact structure:
{
  "workflow": {
    "name": "string",
    "initial_state": "string",
    "states": {
      "<state_name>": {
        "type": "initial|intermediate|terminal",
        "transitions": [
          {"to": "<state>", "condition": "<expr or null>", "emit_event": "<event_name>"}
        ]
      }
    }
  },
  "roles": [{"name": "string", "permissions": ["string"]}],
  "events": [{"name": "string", "version": "1.0"}],
  "compliance_tags": ["FERPA", "GDPR", "DPDP"]
}
Rules:
- initial_state must exist in states
- All transition targets must be valid state names
- At least one terminal state must exist
- No cycles in automatic transitions
- Return ONLY the JSON object, no markdown, no explanation"""

    def _try_gemini(self, prompt: str, context: dict) -> dict | None:
        if not self._gemini_client:
            return None
        try:
            user_content = json.dumps({"requirement": prompt, "institution_context": context})
            response = self._gemini_client.generate_content(
                f"{self._build_system_prompt()}\n\nRequirement: {user_content}"
            )
            text = response.text.strip()
            # Strip markdown code blocks if present
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:-1])
            return json.loads(text)
        except Exception as e:
            logger.warning("Gemini provider failed: %s", e)
            return None

    def _try_groq(self, prompt: str, context: dict) -> dict | None:
        if not self._groq_client:
            return None
        try:
            user_content = json.dumps({"requirement": prompt, "institution_context": context})
            response = self._groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": self._build_system_prompt()},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.1,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            text = response.choices[0].message.content
            return json.loads(text)
        except Exception as e:
            logger.warning("Groq provider failed: %s", e)
            return None

    def generate(self, prompt: str, institution_context: dict[str, Any]) -> dict[str, Any]:
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

        # Provider cascade
        result = None
        provider_used = "mock"

        result = self._try_gemini(prompt, institution_context)
        if result:
            provider_used = "gemini-1.5-flash"
        else:
            result = self._try_groq(prompt, institution_context)
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


# Module-level singleton
_router: ProviderRouter | None = None


def get_provider_router() -> ProviderRouter:
    global _router
    if _router is None:
        _router = ProviderRouter()
    return _router
