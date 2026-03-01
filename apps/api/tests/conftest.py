from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal, engine
from app.main import app
from app.models import Base, Institution, Project, ProjectRoleBinding, User, Workflow
from app.security import create_access_token, hash_password


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def seeded(db_session):
    inst1 = Institution(name="Tenant One", domain="tenant1.local")
    inst2 = Institution(name="Tenant Two", domain="tenant2.local")
    db_session.add_all([inst1, inst2])
    db_session.commit()
    db_session.refresh(inst1)
    db_session.refresh(inst2)

    proj1 = Project(institution_id=inst1.id, name="UG Admissions", slug="ug", environment="test")
    proj2 = Project(institution_id=inst2.id, name="PG Admissions", slug="pg", environment="test")
    db_session.add_all([proj1, proj2])
    db_session.commit()
    db_session.refresh(proj1)
    db_session.refresh(proj2)

    owner = User(
        institution_id=inst1.id,
        email="owner@tenant1.local",
        name="Owner",
        role="owner",
        password_hash=hash_password("OwnerPass123!"),
    )
    reviewer = User(
        institution_id=inst1.id,
        email="reviewer@tenant1.local",
        name="Reviewer",
        role="reviewer",
        password_hash=hash_password("ReviewerPass123!"),
    )
    outsider_owner = User(
        institution_id=inst2.id,
        email="owner@tenant2.local",
        name="Owner 2",
        role="owner",
        password_hash=hash_password("OwnerPass123!"),
    )
    db_session.add_all([owner, reviewer, outsider_owner])
    db_session.commit()
    db_session.refresh(owner)
    db_session.refresh(reviewer)
    db_session.refresh(outsider_owner)

    db_session.add(
        ProjectRoleBinding(
            institution_id=inst1.id,
            project_id=proj1.id,
            user_id=reviewer.id,
            role="reviewer",
        )
    )

    workflow = Workflow(
        institution_id=inst1.id,
        project_id=proj1.id,
        name="undergraduate-admissions",
        version=1,
        definition={
            "name": "undergraduate-admissions",
            "initial_state": "submitted",
            "states": {
                "submitted": {
                    "transitions": [
                        {
                            "to": "auto_accepted",
                            "condition": "percentage >= 90",
                            "emit_event": "application.auto_accepted",
                        },
                        {
                            "to": "under_review",
                            "condition": "percentage < 90",
                            "emit_event": "application.under_review",
                        },
                    ]
                },
                "auto_accepted": {"transitions": []},
                "under_review": {"transitions": []},
            },
        },
        is_ai_generated=False,
        deployed=True,
        created_by=owner.id,
    )
    db_session.add(workflow)
    db_session.commit()
    db_session.refresh(workflow)

    return {
        "inst1": inst1,
        "inst2": inst2,
        "proj1": proj1,
        "proj2": proj2,
        "owner": owner,
        "reviewer": reviewer,
        "outsider_owner": outsider_owner,
        "workflow": workflow,
    }


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def make_headers():
    def _make_headers(user, institution_id: str, project_id: str):
        token = create_access_token(user)
        return {
            "Authorization": f"Bearer {token}",
            "X-Institution-Id": institution_id,
            "X-Project-Id": project_id,
        }

    return _make_headers

