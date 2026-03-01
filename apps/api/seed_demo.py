"""Seed demo data for AdmitFlow control plane."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.database import SessionLocal, init_db
from app.models import Institution, Project, RolePermission, User, Workflow
from app.security import hash_password


def run() -> None:
    init_db()
    db: Session = SessionLocal()
    try:
        inst = db.query(Institution).filter(Institution.domain == "demo.admitflow.local").first()
        if not inst:
            inst = Institution(name="Demo University", domain="demo.admitflow.local")
            db.add(inst)
            db.commit()
            db.refresh(inst)

        project = (
            db.query(Project)
            .filter(Project.institution_id == inst.id, Project.slug == "ug-admissions")
            .first()
        )
        if not project:
            project = Project(
                institution_id=inst.id,
                name="Undergraduate Admissions",
                slug="ug-admissions",
                environment="test",
            )
            db.add(project)
            db.commit()
            db.refresh(project)

        owner = db.query(User).filter(User.email == "owner@demo.edu", User.institution_id == inst.id).first()
        if not owner:
            owner = User(
                institution_id=inst.id,
                email="owner@demo.edu",
                name="Demo Owner",
                role="owner",
                password_hash=hash_password("DemoPass123!@#"),
            )
            db.add(owner)
            db.commit()
            db.refresh(owner)

        for role, permission in [
            ("reviewer", "application:read"),
            ("reviewer", "application:write"),
            ("reviewer", "event:read"),
            ("owner", "workflow:deploy"),
        ]:
            exists = db.query(RolePermission).filter(RolePermission.role == role, RolePermission.permission == permission).first()
            if not exists:
                db.add(RolePermission(role=role, permission=permission, constraint_json={"project_scoped": True}))

        workflow = (
            db.query(Workflow)
            .filter(
                Workflow.institution_id == inst.id,
                Workflow.project_id == project.id,
                Workflow.name == "undergraduate-admissions",
                Workflow.version == 1,
            )
            .first()
        )
        if not workflow:
            db.add(
                Workflow(
                    institution_id=inst.id,
                    project_id=project.id,
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
                    deployed=True,
                    is_ai_generated=False,
                    created_by=owner.id,
                )
            )

        db.commit()
        print("Demo seed complete")
        print(f"institution_id={inst.id}")
        print(f"project_id={project.id}")
        print("owner login: owner@demo.edu / DemoPass123!@#")
    finally:
        db.close()


if __name__ == "__main__":
    run()

