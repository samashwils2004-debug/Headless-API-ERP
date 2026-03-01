from app.models import BlueprintProposal


def test_cross_tenant_data_leakage_blocked(client, seeded, make_headers):
    # User belongs to tenant1 but attempts tenant2 scope.
    headers = make_headers(seeded["owner"], seeded["inst2"].id, seeded["proj2"].id)
    response = client.get("/api/workflows", headers=headers)
    assert response.status_code == 403


def test_permission_escalation_blocked_for_reviewer(client, seeded, make_headers):
    headers = make_headers(seeded["reviewer"], seeded["inst1"].id, seeded["proj1"].id)
    response = client.post(f"/api/workflows/{seeded['workflow'].id}/deploy", headers=headers)
    assert response.status_code == 403


def test_ai_malformed_output_injection_rejected_on_deploy(client, seeded, db_session, make_headers):
    headers = make_headers(seeded["owner"], seeded["inst1"].id, seeded["proj1"].id)

    proposal = BlueprintProposal(
        institution_id=seeded["inst1"].id,
        project_id=seeded["proj1"].id,
        prompt="malformed",
        status="validated",
        blueprint={
            "workflow": {
                "name": "unsafe",
                "initial_state": "start",
                "states": {
                    "start": {"transitions": [{"to": "start"}]}
                },
            },
            "roles": [{"name": "r1", "permissions": ["workflow:deploy"]}],
            "events": [{"type": "x", "version": "1.0"}],
            "compliance_tags": ["unknown_tag"],
        },
        validation_result={"is_valid": True},
        compiled_by=seeded["owner"].id,
    )
    db_session.add(proposal)
    db_session.commit()
    db_session.refresh(proposal)

    response = client.post(f"/api/ai/blueprints/{proposal.id}/deploy", headers=headers)
    assert response.status_code == 409

    db_session.refresh(proposal)
    assert proposal.status == "pending"

