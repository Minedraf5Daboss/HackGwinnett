from conftest import register_and_login


def test_new_user_has_empty_profile(client, auth_headers):
    resp = client.get("/api/v1/profile", headers=auth_headers)
    assert resp.status_code == 200
    profile = resp.json()
    assert profile["full_name"] is None
    assert profile["allergies"] is None


def test_update_profile(client, auth_headers):
    body = {"full_name": "Ada Patient", "date_of_birth": "1990-05-17", "allergies": "penicillin"}
    resp = client.patch("/api/v1/profile", json=body, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["date_of_birth"] == "1990-05-17"

    # Omitted fields are kept; blank strings clear a field.
    resp = client.patch("/api/v1/profile", json={"allergies": "  "}, headers=auth_headers)
    assert resp.json()["full_name"] == "Ada Patient"
    assert resp.json()["allergies"] is None

    assert client.get("/api/v1/profile", headers=auth_headers).json() == resp.json()


def test_profile_validation(client, auth_headers):
    for body in ({"date_of_birth": "2999-01-01"}, {"date_of_birth": "not-a-date"}):
        resp = client.patch("/api/v1/profile", json=body, headers=auth_headers)
        assert resp.status_code == 422


def test_profile_requires_auth(client):
    assert client.get("/api/v1/profile").status_code == 401
    assert client.patch("/api/v1/profile", json={}).status_code == 401


def test_profiles_are_private(client, auth_headers):
    client.patch("/api/v1/profile", json={"full_name": "Ada Patient"}, headers=auth_headers)
    other = register_and_login(client, "other@example.com")
    assert client.get("/api/v1/profile", headers=other).json()["full_name"] is None
