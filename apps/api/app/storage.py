"""
Storage helpers for document uploads/downloads.
Supports local filesystem and Supabase Storage.
"""
import os
import uuid
from datetime import timedelta

from fastapi import HTTPException

from app.config import get_settings

try:
    from supabase import create_client
except ImportError:  # pragma: no cover
    create_client = None


settings = get_settings()


def _get_supabase_client():
    if create_client is None:
        raise HTTPException(500, "supabase library is not installed")
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(500, "Supabase storage credentials are not configured")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def save_document(content: bytes, extension: str, institution_id: str, application_id: str) -> str:
    """
    Save document and return storage key/path.
    """
    if settings.storage_backend == "supabase":
        client = _get_supabase_client()
        file_name = f"{uuid.uuid4().hex}{extension}"
        object_path = f"{institution_id}/{application_id}/{file_name}"
        result = client.storage.from_(settings.storage_bucket).upload(
            object_path,
            content,
            {"content-type": "application/octet-stream", "upsert": "false"},
        )
        if getattr(result, "error", None):
            raise HTTPException(500, f"Supabase upload failed: {result.error}")
        return object_path

    upload_dir = os.path.abspath(settings.upload_dir)
    os.makedirs(upload_dir, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex}{extension}"
    file_path = os.path.join(upload_dir, safe_filename)
    with open(file_path, "wb") as f:
        f.write(content)
    return file_path


def get_signed_url(storage_key: str, user, app, document_id: str) -> str:
    """
    Generate secure URL for document access.
    """
    if app.institution_id != user.institution_id:
        raise HTTPException(404, "Document not found")

    if settings.storage_backend == "supabase":
        client = _get_supabase_client()
        expires_in = int(timedelta(minutes=15).total_seconds())
        result = client.storage.from_(settings.storage_bucket).create_signed_url(
            storage_key,
            expires_in,
        )
        signed_url = result.get("signedURL")
        if not signed_url:
            raise HTTPException(500, "Failed to generate signed URL")
        return signed_url

    if not os.path.isfile(storage_key):
        raise HTTPException(404, "File not found on disk")
    return f"/api/documents/{document_id}"

