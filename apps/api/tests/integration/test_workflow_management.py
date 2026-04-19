def test_update_draft_workflow(client, seeded, make_headers):
    headers = make_headers(seeded["owner"], seeded["inst1"].id, seeded["proj1"].id)
    create_response = client.post(
        "/api/workflows",
        json={
            "name": "draft-workflow",
            "definition": {
                "initial_state": "submitted",
                "states": {
                    "submitted": {"transitions": [{"to": "done"}]},
                    "done": {"transitions": []},
                },
            },
            "is_ai_generated": False,
        },
        headers=headers,
    )
    assert create_response.status_code == 200
    workflow_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/workflows/{workflow_id}",
        json={
            "name": "draft-workflow-updated",
            "definition": {
                "initial_state": "submitted",
                "states": {
                    "submitted": {"transitions": [{"to": "review"}]},
                    "review": {"transitions": [{"to": "done"}]},
                    "done": {"transitions": []},
                },
            },
            "is_ai_generated": False,
        },
        headers=headers,
    )
    assert update_response.status_code == 200
    body = update_response.json()
    assert body["name"] == "draft-workflow-updated"
    assert body["definition"]["states"]["review"]["transitions"][0]["to"] == "done"
    assert body["deployed"] is False


def test_undeploy_allows_deployed_workflow_to_be_deleted(client, seeded, make_headers):
    headers = make_headers(seeded["owner"], seeded["inst1"].id, seeded["proj1"].id)

    undeploy_response = client.post(f"/api/workflows/{seeded['workflow'].id}/undeploy", headers=headers)
    assert undeploy_response.status_code == 200
    assert undeploy_response.json()["deployed"] is False

    delete_response = client.delete(f"/api/workflows/{seeded['workflow'].id}", headers=headers)
    assert delete_response.status_code == 204

    list_response = client.get("/api/workflows", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()["workflows"] == []
