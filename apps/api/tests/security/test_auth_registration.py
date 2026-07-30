def test_self_registration_ignores_client_supplied_owner_role(client, seeded):
    response = client.post(
        "/api/auth/register",
        json={
            "institution_id": seeded["inst1"].id,
            "email": "new-user@tenant1.edu",
            "password": "ViewerPass123!",
            "name": "New User",
            "role": "owner",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["role"] == "viewer"


def test_self_registration_defaults_to_minimal_role(client, seeded):
    response = client.post(
        "/api/auth/register",
        json={
            "institution_id": seeded["inst1"].id,
            "email": "implicit-role@tenant1.edu",
            "password": "ViewerPass123!",
            "name": "Implicit Role",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["role"] == "viewer"
