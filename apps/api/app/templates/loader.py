from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.templates.registry import TEMPLATE_REGISTRY


def _templates_dir() -> Path:
    # .../ERP project/apps/api/app/templates/loader.py -> repo root at parents[4]
    root = Path(__file__).resolve().parents[4]
    return root / "packages" / "templates"


def load_template(template_name: str) -> dict[str, Any]:
    filename = TEMPLATE_REGISTRY.get(template_name)
    if not filename:
        raise KeyError(f"Unknown template: {template_name}")

    path = _templates_dir() / filename
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {path}")

    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)
