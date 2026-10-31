def test_register_and_me(client, auth_headers):
    resp = client.get("/api/v1/users/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "user@example.com"


def test_register_duplicate_email(client):
    body = {"email": "a@example.com", "password": "password123"}
    assert client.post("/api/v1/auth/register", json=body).status_code == 201
    assert client.post("/api/v1/auth/register", json=body).status_code == 409


def test_register_validation(client):
    resp = client.post("/api/v1/auth/register", json={"email": "nope", "password": "short"})
    assert resp.status_code == 422


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json={"email": "a@example.com", "password": "password123"})
    resp = client.post("/api/v1/auth/token", data={"username": "a@example.com", "password": "bad"})
    assert resp.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/v1/users/me").status_code == 401
    bad = {"Authorization": "Bearer not-a-token"}
    assert client.get("/api/v1/users/me", headers=bad).status_code == 401
