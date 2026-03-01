"""API key management routes for Orquestra."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.rbac_engine import check_permission
from app.database import get_db
from app.models import APIKey
from app.schemas import APIKeyCreate, APIKeyListResponse, APIKeyResponse, APIKeyCreateResponse
from app.security import get_current_user
from app.time_utils import utcnow_naive

router = APIRouter()


def _generate_api_key() -> tuple[str, str, str]:
    """Generate key, return (full_key, key_hash, key_prefix)."""
    raw = secrets.token_urlsafe(32)
    full_key = f"sk_live_{raw}"
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    key_prefix = full_key[:12]
    return full_key, key_hash, key_prefix


@router.get("/api-keys", response_model=APIKeyListResponse)
def list_api_keys(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(check_permission("api_key:read")),
):
    keys = (
        db.query(APIKey)
        .filter(
            APIKey.institution_id == current_user.institution_id,
            APIKey.is_active == True,
        )
        .order_by(APIKey.created_at.desc())
        .all()
    )
    return {"keys": [APIKeyResponse.model_validate(k) for k in keys]}


@router.post("/api-keys", response_model=APIKeyCreateResponse, status_code=201)
def create_api_key(
    body: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(check_permission("api_key:write")),
):
    full_key, key_hash, key_prefix = _generate_api_key()
    expires_at = None
    if body.expires_in_days:
        expires_at = utcnow_naive() + timedelta(days=body.expires_in_days)

    api_key = APIKey(
        institution_id=current_user.institution_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=body.name,
        scopes=body.scopes,
        expires_at=expires_at,
        created_by=current_user.id,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    # Return full key ONLY on creation
    return APIKeyCreateResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        full_key=full_key,  # shown only once
        scopes=api_key.scopes,
        is_active=api_key.is_active,
        created_at=api_key.created_at,
        expires_at=api_key.expires_at,
    )


@router.delete("/api-keys/{key_id}", status_code=204)
def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _=Depends(check_permission("api_key:write")),
):
    key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.institution_id == current_user.institution_id,
    ).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    db.commit()
