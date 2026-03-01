from __future__ import annotations

from typing import Any


def analyze_permissions(blueprint: dict[str, Any]) -> list[str]:
    permission_errors: list[str] = []
    role_names: set[str] = set()
    for role in blueprint.get("roles", []):
        name = role.get("name")
        if name in role_names:
            permission_errors.append(f"duplicate role: {name}")
        role_names.add(name)
        perms = set(role.get("permissions", []))
        if "workflow:deploy" in perms and "project:write" not in perms:
            permission_errors.append(f"escalation risk in role {name}: deploy without project write")
    return permission_errors
