"""Redis sliding-window rate limiter middleware for Orquestra."""
from __future__ import annotations

import logging
import time
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Rate limit config: (requests, window_seconds)
LIMITS = {
    "ai": (10, 60),           # 10 req/min for AI endpoints
    "auth": (20, 60),         # 20 req/min for auth
    "authenticated": (600, 60),  # 600 req/min for authenticated users
    "unauthenticated": (100, 60),  # 100 req/min for unauthenticated
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str = ""):
        super().__init__(app)
        self._redis = None
        if redis_url:
            try:
                import redis as redis_lib
                self._redis = redis_lib.from_url(redis_url, decode_responses=True)
            except Exception as e:
                logger.warning("Rate limit Redis unavailable: %s", e)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _is_rate_limited(self, key: str, limit: int, window: int) -> tuple[bool, int, int]:
        """Sliding window rate limit check. Returns (is_limited, remaining, reset_at)."""
        if not self._redis:
            return False, limit, int(time.time()) + window
        try:
            now = time.time()
            window_start = now - window
            pipe = self._redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, window)
            results = pipe.execute()
            count = results[2]
            remaining = max(0, limit - count)
            reset_at = int(now) + window
            return count > limit, remaining, reset_at
        except Exception:
            return False, limit, int(time.time()) + window

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Skip rate limiting for health/metrics
        if path in ("/health", "/metrics", "/"):
            return await call_next(request)

        ip = self._get_client_ip(request)
        auth_header = request.headers.get("Authorization", "")
        is_authenticated = auth_header.startswith("Bearer ")

        # Determine rate limit tier
        if "/api/ai/" in path:
            limit_name = "ai"
            limit, window = LIMITS["ai"]
            key = f"orquestra:rl:ai:{ip}"
        elif "/api/auth/" in path:
            limit_name = "auth"
            limit, window = LIMITS["auth"]
            key = f"orquestra:rl:auth:{ip}"
        elif is_authenticated:
            limit_name = "authenticated"
            limit, window = LIMITS["authenticated"]
            # Use token prefix for per-user limiting
            token_prefix = auth_header[7:17]
            key = f"orquestra:rl:user:{token_prefix}:{ip}"
        else:
            limit_name = "unauthenticated"
            limit, window = LIMITS["unauthenticated"]
            key = f"orquestra:rl:anon:{ip}"

        is_limited, remaining, reset_at = self._is_rate_limited(key, limit, window)

        if is_limited:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please slow down."},
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_at),
                    "Retry-After": str(window),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_at)
        return response
