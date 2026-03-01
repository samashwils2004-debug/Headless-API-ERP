"""RBAC engine with action-level and project-scoped checks."""
from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ProjectRoleBinding, RolePermission
from app.security import get_current_user
from app.tenant import TenantContext, get_tenant_context

DEFAULT_PERMISSIONS: dict[str, set[str]] = {
    "owner": {
        "project:read",
        "project:write",
        "workflow:read",
        "workflow:write",
        "workflow:deploy",
        "application:read",
        "application:write",
        "event:read",
        "blueprint:compile",
        "blueprint:deploy",
    },
    "reviewer": {
        "project:read",
        "workflow:read",
        "application:read",
        "application:write",
        "event:read",
        "blueprint:compile",
    },
    "viewer": {"project:read", "workflow:read", "application:read", "event:read"},
}


class RBACEngine:
    def __init__(self, db: Session):
        self.db = db

    def has_permission(self, role: str, permission: str) -> bool:
        explicit = (
            self.db.query(RolePermission)
            .filter(RolePermission.role == role, RolePermission.permission == permission)
            .first()
        )
        if explicit:
            return True
        return permission in DEFAULT_PERMISSIONS.get(role, set())

    def assert_project_scope(self, user_id: str, role: str, tenant: TenantContext) -> None:
        if role == "owner":
            return
        binding = (
            self.db.query(ProjectRoleBinding)
            .filter(
                ProjectRoleBinding.user_id == user_id,
                ProjectRoleBinding.institution_id == tenant.institution_id,
                ProjectRoleBinding.project_id == tenant.project_id,
                ProjectRoleBinding.role == role,
            )
            .first()
        )
        if not binding:
            raise HTTPException(status_code=403, detail="Project-scope role not granted")


def check_permission(permission: str):
    def dependency(
        user=Depends(get_current_user),
        tenant: TenantContext = Depends(get_tenant_context),
        db: Session = Depends(get_db),
    ):
        if user.institution_id != tenant.institution_id:
            raise HTTPException(status_code=403, detail="Cross-tenant access denied")

        engine = RBACEngine(db)
        engine.assert_project_scope(user.id, user.role, tenant)
        if not engine.has_permission(user.role, permission):
            raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")
        return user

    return dependency

