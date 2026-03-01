"""Utility helpers for prototype."""
import json
from typing import Any


def safe_json_loads(s: str | None) -> dict:
    if not s:
        return {}
    try:
        return json.loads(s) if isinstance(s, str) else s
    except (json.JSONDecodeError, TypeError):
        return {}


def safe_json_dumps(obj: Any) -> str:
    if obj is None:
        return "{}"
    if isinstance(obj, str):
        return obj
    try:
        return json.dumps(obj)
    except (TypeError, ValueError):
        return "{}"

