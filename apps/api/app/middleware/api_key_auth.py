"""Runtime API authentication via versioned API key (Bearer sk_erp_v{n}_...)."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import APIKey, ArchWorkflow
from app.time_utils import utcnow_naive


@dataclass
class RuntimeAuthContext:
    institution_id: str
    project_id: str
    api_key_id: str
    accessible_workflow_ids: list[str] = field(default_factory=list)


def get_runtime_auth(
    authorization: str | None = None,
    db: Session = Depends(get_db),
) -> RuntimeAuthContext:
    from fastapi import Request

    # This dependency is called differently — see note below
    raise NotImplementedError("Use get_runtime_auth_from_request instead")


async def get_runtime_auth_from_request(request, db: Session) -> RuntimeAuthContext:
    """
    Extract Bearer token, hash it, look up APIKey, load accessible workflow IDs.
    Used as a manual dependency in runtime routes.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    raw_key = auth_header[7:]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    api_key = db.query(APIKey).filter(
        APIKey.key_hash == key_hash,
        APIKey.is_active == True,  # noqa: E712
    ).first()

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    from app.time_utils import utcnow_naive
    api_key.last_used_at = utcnow_naive()
    db.commit()

    if api_key.expires_at and api_key.expires_at < utcnow_naive():
        raise HTTPException(status_code=401, detail="API key has expired")

    # Load accessible workflow IDs from the linked architecture version
    accessible_workflow_ids: list[str] = []
    if api_key.architecture_version_id:
        arch_workflows = db.query(ArchWorkflow).filter(
            ArchWorkflow.architecture_version_id == api_key.architecture_version_id,
        ).all()
        accessible_workflow_ids = [aw.workflow_id for aw in arch_workflows]

    return RuntimeAuthContext(
        institution_id=api_key.institution_id,
        project_id=api_key.project_id or "",
        api_key_id=api_key.id,
        accessible_workflow_ids=accessible_workflow_ids,
    )
