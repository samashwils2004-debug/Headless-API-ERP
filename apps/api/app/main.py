from __future__ import annotations

import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db
from app.observability import metrics_response, record_http_metrics
from app.routes import ai, applications, auth, events, projects, workflows
from app.ws import hub

settings = get_settings()

if settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=settings.app_version,
        traces_sample_rate=0.2,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
    )

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Headless-first deterministic workflow infrastructure",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.console_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Institution-Id", "X-Project-Id"],
)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.url.path.startswith("/api"):
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")
        if csrf_cookie and csrf_cookie != csrf_header:
            return JSONResponse(status_code=403, content={"detail": "CSRF token mismatch"})

    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if "csrf_token" not in request.cookies:
        response.set_cookie(
            "csrf_token",
            secrets.token_urlsafe(24),
            httponly=False,
            secure=settings.environment == "production",
            samesite="lax",
        )
    return response


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    return await record_http_metrics(request, call_next)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    detail = "Internal server error" if not settings.debug else str(exc)
    return JSONResponse(status_code=500, content={"detail": detail})


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(workflows.router, prefix="/api", tags=["workflows"])
app.include_router(applications.router, prefix="/api", tags=["applications"])
app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(ai.router, prefix="/api", tags=["ai"])


@app.get("/health")
def health():
    return {"status": "ok", "version": settings.app_version, "environment": settings.environment}


@app.get("/metrics")
def metrics():
    return metrics_response()


@app.websocket("/api/events/ws")
async def events_ws(websocket: WebSocket):
    institution_id = websocket.query_params.get("institution_id")
    project_id = websocket.query_params.get("project_id")
    if not institution_id or not project_id:
        await websocket.close(code=1008)
        return

    await hub.connect(websocket, institution_id, project_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(websocket, institution_id, project_id)

@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "invariants": {
            "workflow_immutability": True,
            "transition_event_emission": True,
            "ai_four_stage_validation": True,
            "multi_tenant_isolation": True,
            "dynamic_code_execution": False,
        },
    }

