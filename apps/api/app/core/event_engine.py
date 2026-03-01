"""Event-native engine: persist in PostgreSQL, append Redis stream, broadcast via WebSocket."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Event
from app.observability import EVENT_STREAM_APPEND_FAILURES, EVENTS_EMITTED, normalize_event_type
from app.time_utils import utcnow_naive
from app.ws import hub

try:
    import redis
except Exception:  # pragma: no cover
    redis = None


class EventEngine:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.redis_client = None
        if redis and self.settings.redis_url:
            try:
                self.redis_client = redis.Redis.from_url(self.settings.redis_url, decode_responses=True)
            except Exception:
                self.redis_client = None

    async def emit(self, event_type: str, institution_id: str, project_id: str, data: dict, version: str = "1.0") -> Event:
        event = Event(
            type=event_type,
            version=version,
            timestamp=utcnow_naive(),
            institution_id=institution_id,
            project_id=project_id,
            data=data,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)

        # Failure mode: Redis down -> DB persistence still succeeds.
        stream_name = f"events:{institution_id}:{project_id}"
        if self.redis_client:
            try:
                self.redis_client.xadd(
                    stream_name,
                    {
                        "id": event.id,
                        "type": event.type,
                        "version": event.version,
                        "timestamp": event.timestamp.isoformat(),
                        "institution_id": event.institution_id,
                        "project_id": event.project_id,
                        "data": str(event.data),
                    },
                    maxlen=20000,
                    approximate=True,
                )
            except Exception:
                EVENT_STREAM_APPEND_FAILURES.inc()
                pass

        await hub.broadcast(
            institution_id,
            project_id,
            {
                "id": event.id,
                "type": event.type,
                "version": event.version,
                "timestamp": event.timestamp.isoformat(),
                "institution_id": event.institution_id,
                "project_id": event.project_id,
                "data": event.data,
            },
        )
        EVENTS_EMITTED.labels(event_type=normalize_event_type(event_type)).inc()
        return event

