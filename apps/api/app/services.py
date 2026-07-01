"""
Shared service instances — created once, imported everywhere.

No file should instantiate EventEngine, BlueprintGenerator,
ProviderRouter, or Redis clients directly. Import from here.

Expensive resources (Redis, AI clients) = singleton.
Cheap resources (DB session) = per-request via FastAPI Depends.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.config import get_settings

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
settings = get_settings()


# ──────────────────────────────────────────────
# Redis: single shared connection
# ──────────────────────────────────────────────
_redis_client = None
_redis_initialized = False


def get_redis():
    """Returns a shared Redis client or None if unavailable."""
    global _redis_client, _redis_initialized
    if _redis_initialized:
        return _redis_client
    _redis_initialized = True

    if not settings.redis_url:
        return None
    try:
        import redis as redis_lib
        _redis_client = redis_lib.Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        _redis_client.ping()
        logger.info("Redis connected: %s", settings.redis_url[:30])
    except Exception as e:
        logger.warning("Redis unavailable, running without cache: %s", e)
        _redis_client = None
    return _redis_client


# ──────────────────────────────────────────────
# EventEngine: shared Redis, per-request DB
# ──────────────────────────────────────────────

def get_event_engine(db: "Session"):
    """
    Returns an EventEngine that reuses the shared Redis connection.
    DB session is per-request (transaction isolation).
    Redis client is shared (connection efficiency).
    """
    from app.core.event_engine import EventEngine
    engine = EventEngine.__new__(EventEngine)
    engine.db = db
    engine.settings = settings
    engine.redis_client = get_redis()
    return engine


# ──────────────────────────────────────────────
# ProviderRouter: singleton (AI provider cascade)
# ──────────────────────────────────────────────

def get_provider_router():
    """Re-exports the existing singleton from provider_router.py."""
    from app.ai.provider_router import get_provider_router as _get
    return _get()


# ──────────────────────────────────────────────
# BlueprintGenerator: singleton
# ──────────────────────────────────────────────
_blueprint_generator = None


def get_blueprint_generator():
    global _blueprint_generator
    if _blueprint_generator is None:
        from app.ai.blueprint_generator import BlueprintGenerator
        _blueprint_generator = BlueprintGenerator()
    return _blueprint_generator


# ──────────────────────────────────────────────
# BlueprintContextBuilder: singleton
# ──────────────────────────────────────────────
_context_builder = None


def get_context_builder():
    global _context_builder
    if _context_builder is None:
        from app.ai.blueprint.context_builder import BlueprintContextBuilder
        _context_builder = BlueprintContextBuilder()
    return _context_builder


# ──────────────────────────────────────────────
# WorkflowEngine: per-request (needs DB session)
# ──────────────────────────────────────────────

def get_workflow_engine(db: "Session"):
    """
    Returns a WorkflowEngine with the given DB session.
    DB session is the expensive resource, managed by FastAPI's DI.
    """
    from app.core.workflow_engine import WorkflowEngine
    return WorkflowEngine(db)
