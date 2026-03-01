import pytest
from fastapi import HTTPException

from app.core.rbac_engine import RBACEngine
from app.models import ProjectRoleBinding, RolePermission


def test_rbac_default_permission(seeded, db_session):
    engine = RBACEngine(db_session)
    assert engine.has_permission("owner", "workflow:deploy") is True
    assert engine.has_permission("viewer", "workflow:deploy") is False


def test_rbac_custom_permission_override(db_session):
    db_session.add(RolePermission(role="custom", permission="workflow:deploy", constraint_json={}))
    db_session.commit()
    engine = RBACEngine(db_session)
    assert engine.has_permission("custom", "workflow:deploy") is True


def test_rbac_project_scope_assertion(seeded, db_session):
    from app.tenant import TenantContext

    engine = RBACEngine(db_session)
    tenant = TenantContext(institution_id=seeded["inst1"].id, project_id=seeded["proj1"].id)

    # reviewer has binding from seeded fixture
    engine.assert_project_scope(seeded["reviewer"].id, "reviewer", tenant)

    with pytest.raises(HTTPException):
        wrong_tenant = TenantContext(institution_id=seeded["inst1"].id, project_id=seeded["proj2"].id)
        engine.assert_project_scope(seeded["reviewer"].id, "reviewer", wrong_tenant)

