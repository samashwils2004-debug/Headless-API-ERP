def test_metrics_endpoint_exposes_core_counters(client, seeded, make_headers):
    headers = make_headers(seeded["owner"], seeded["inst1"].id, seeded["proj1"].id)

    payload = {
        "workflow_name": seeded["workflow"].name,
        "applicant_data": {"name": "John", "email": "john@example.com"},
        "application_data": {"percentage": 88},
    }
    response = client.post("/api/applications", json=payload, headers=headers)
    assert response.status_code == 200

    metrics = client.get("/metrics")
    assert metrics.status_code == 200
    text = metrics.text
    assert "workflow_execution_time" in text
    assert "events_emitted" in text

