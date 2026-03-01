"""Observability primitives: Prometheus metrics and optional Sentry integration."""
from __future__ import annotations

import re
from time import perf_counter

from fastapi import Request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import Response

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "path", "status_code"],
)

REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
)

WORKFLOW_EXECUTION_TIME_MS = Histogram(
    "workflow_execution_time",
    "Workflow execution time in milliseconds",
    buckets=(1, 5, 10, 20, 50, 100, 200, 500, 1000),
)

EVENTS_EMITTED = Counter(
    "events_emitted",
    "Number of emitted domain events",
    ["event_type"],
)

EVENT_STREAM_APPEND_FAILURES = Counter(
    "event_stream_append_failures",
    "Number of Redis stream append failures",
)

BLUEPRINT_VALIDATION_FAILURES = Counter(
    "blueprint_validation_failures",
    "Number of AI blueprint validation failures",
    ["stage"],
)

UUID_PATH_RE = re.compile(r"/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
NUMERIC_PATH_RE = re.compile(r"/\d+")
EVENT_TYPE_RE = re.compile(r"^[a-z0-9_.:-]{1,64}$")


def metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


def normalize_path(request: Request) -> str:
    route = request.scope.get("route")
    if route is not None and getattr(route, "path", None):
        return route.path

    path = request.url.path
    path = UUID_PATH_RE.sub("/{id}", path)
    path = NUMERIC_PATH_RE.sub("/{id}", path)
    return path


def normalize_event_type(value: str) -> str:
    event_type = (value or "").strip().lower()
    if EVENT_TYPE_RE.fullmatch(event_type):
        return event_type
    return "invalid_event_type"


async def record_http_metrics(request: Request, call_next):
    start = perf_counter()
    response = await call_next(request)
    duration = perf_counter() - start
    path = normalize_path(request)
    REQUEST_COUNT.labels(
        method=request.method,
        path=path,
        status_code=str(response.status_code),
    ).inc()
    REQUEST_DURATION_SECONDS.labels(method=request.method, path=path).observe(duration)
    return response

