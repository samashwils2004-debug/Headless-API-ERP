from __future__ import annotations

from typing import Any


def validate_schema(schema_engine, blueprint: dict[str, Any]) -> list[str]:
    return schema_engine.validate_blueprint(blueprint)
