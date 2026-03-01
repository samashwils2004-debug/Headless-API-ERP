import asyncio

from app.core.event_engine import EventEngine
from app.models import Event


def test_execute_workflow_and_emit_transition_event(client, seeded, db_session, make_headers):
    headers = make_headers(seeded["owner"], seeded["inst1"].id, seeded["proj1"].id)
    payload = {
        "workflow_name": seeded["workflow"].name,
        "applicant_data": {"name": "Jane", "email": "jane@example.com"},
        "application_data": {"percentage": 96},
    }

    response = client.post("/api/applications", json=payload, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["current_state"] == "auto_accepted"
    assert body["status"] == "completed"

    events = db_session.query(Event).filter(Event.institution_id == seeded["inst1"].id).all()
    event_types = {event.type for event in events}
    assert "application.created" in event_types
    assert "application.auto_accepted" in event_types


def test_blueprint_deploy_creates_workflow(client, seeded, db_session, make_headers):
    from app.models import BlueprintProposal

    headers = make_headers(seeded["owner"], seeded["inst1"].id, seeded["proj1"].id)
    proposal = BlueprintProposal(
        institution_id=seeded["inst1"].id,
        project_id=seeded["proj1"].id,
        prompt="Generate undergraduate workflow",
        status="validated",
        blueprint={
            "workflow": {
                "name": "ai-generated",
                "initial_state": "submitted",
                "states": {
                    "submitted": {"transitions": [{"to": "done", "condition": "percentage >= 0"}]},
                    "done": {"transitions": []},
                },
            },
            "roles": [{"name": "ai_reviewer", "permissions": ["workflow:read"]}],
            "events": [{"type": "workflow.transitioned", "version": "1.0"}],
            "compliance_tags": ["ferpa"],
        },
        validation_result={"is_valid": True},
        compiled_by=seeded["owner"].id,
    )
    db_session.add(proposal)
    db_session.commit()
    db_session.refresh(proposal)

    response = client.post(f"/api/ai/blueprints/{proposal.id}/deploy", headers=headers)
    assert response.status_code == 200

    workflows_response = client.get("/api/workflows", headers=headers)
    assert workflows_response.status_code == 200
    names = [workflow["name"] for workflow in workflows_response.json()["workflows"]]
    assert "ai-generated" in names


def test_event_engine_redis_failure_falls_back_to_db(db_session, seeded):
    class BrokenRedis:
        def xadd(self, *args, **kwargs):
            raise RuntimeError("redis down")

    async def run():
        engine = EventEngine(db_session)
        engine.redis_client = BrokenRedis()
        await engine.emit(
            "test.redis.failure",
            institution_id=seeded["inst1"].id,
            project_id=seeded["proj1"].id,
            data={"ok": True},
        )

    asyncio.run(run())

    persisted = (
        db_session.query(Event)
        .filter(Event.type == "test.redis.failure", Event.institution_id == seeded["inst1"].id)
        .first()
    )
    assert persisted is not None

