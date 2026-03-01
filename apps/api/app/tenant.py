from __future__ import annotations

from dataclasses import dataclass

from fastapi import Header, HTTPException


@dataclass(frozen=True)
class TenantContext:
    institution_id: str
    project_id: str


def get_tenant_context(
    x_institution_id: str | None = Header(default=None),
    x_project_id: str | None = Header(default=None),
) -> TenantContext:
    if not x_institution_id or not x_project_id:
        raise HTTPException(status_code=400, detail="X-Institution-Id and X-Project-Id headers are required")
    return TenantContext(institution_id=x_institution_id, project_id=x_project_id)

