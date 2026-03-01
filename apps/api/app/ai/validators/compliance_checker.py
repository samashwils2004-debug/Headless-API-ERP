from __future__ import annotations

from typing import Any


def check_compliance(blueprint: dict[str, Any]) -> list[str]:
    compliance_errors: list[str] = []
    allowed_tags = {"ferpa", "gdpr", "dpdp", "iso27001", "soc2"}
    tags = set(blueprint.get("compliance_tags", []))
    bad_tags = tags - allowed_tags
    if bad_tags:
        compliance_errors.append(f"invalid compliance tags: {sorted(bad_tags)}")
    return compliance_errors
