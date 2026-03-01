from __future__ import annotations

from datetime import UTC, datetime


def utcnow() -> datetime:
    return datetime.now(UTC)


def utcnow_naive() -> datetime:
    # Keep DB DateTime fields naive-UTC for compatibility with existing schema.
    return datetime.now(UTC).replace(tzinfo=None)

