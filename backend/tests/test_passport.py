from conftest import register_and_login


def test_new_user_has_empty_passport(client, auth_headers):
    resp = client.get("/api/v1/passport", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == {"accommodations": [], "notes": None, "updated_at": None}


def test_save_and_replace_passport(client, auth_headers):
    body = {"accommodations": ["low-sensory", "asl-interpreter"], "notes": "Please text me."}
    resp = client.put("/api/v1/passport", json=body, headers=auth_headers)
    assert resp.status_code == 200
    saved = resp.json()
    # Returned in display order, with labels for showing on screen.
    assert [a["id"] for a in saved["accommodations"]] == ["asl-interpreter", "low-sensory"]
    assert saved["accommodations"][0]["label"] == "ASL interpreter"
    assert saved["notes"] == "Please text me."
    assert saved["updated_at"] is not None
    assert client.get("/api/v1/passport", headers=auth_headers).json() == saved

    # Saving again replaces the selection; blank notes are cleared.
    body = {"accommodations": ["wheelchair-access"], "notes": "  "}
    resp = client.put("/api/v1/passport", json=body, headers=auth_headers)
    assert [a["id"] for a in resp.json()["accommodations"]] == ["wheelchair-access"]
    assert resp.json()["notes"] is None


def test_passport_rejects_unknown_accommodation(client, auth_headers):
    body = {"accommodations": ["wheelchair-access", "jetpack"]}
    resp = client.put("/api/v1/passport", json=body, headers=auth_headers)
    assert resp.status_code == 422
    assert "jetpack" in resp.json()["detail"]
    assert client.get("/api/v1/passport", headers=auth_headers).json()["accommodations"] == []


def test_passport_requires_auth(client):
    assert client.get("/api/v1/passport").status_code == 401
    assert client.put("/api/v1/passport", json={}).status_code == 401


def test_passports_are_private(client, auth_headers):
    body = {"accommodations": ["asl-interpreter"]}
    client.put("/api/v1/passport", json=body, headers=auth_headers)
    other = register_and_login(client, "other@example.com")
    assert client.get("/api/v1/passport", headers=other).json()["accommodations"] == []
