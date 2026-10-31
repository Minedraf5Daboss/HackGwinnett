from conftest import register_and_login


def test_new_user_has_empty_passport(client, auth_headers):
    resp = client.get("/api/v1/passport", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == {
        "accommodations": [],
        "notes": None,
        "updated_at": None,
        "share_token": None,
    }


def test_save_and_replace_passport(client, auth_headers):
    body = {"accommodations": ["low-sensory", "asl-interpreter"], "notes": "Please text me."}
    resp = client.put("/api/v1/passport", json=body, headers=auth_headers)
    assert resp.status_code == 200
    saved = resp.json()
    # Returned in display order, with labels for showing on screen.
    assert [a["id"] for a in saved["accommodations"]] == ["asl-interpreter", "low-sensory"]
    assert saved["accommodations"][0]["label"] == "ASL interpreter"
    assert all(a["must_have"] for a in saved["accommodations"])  # plain ids are must-haves
    assert saved["notes"] == "Please text me."
    assert saved["updated_at"] is not None
    assert client.get("/api/v1/passport", headers=auth_headers).json() == saved

    # Saving again replaces the selection; blank notes are cleared.
    body = {"accommodations": ["wheelchair-access"], "notes": "  "}
    resp = client.put("/api/v1/passport", json=body, headers=auth_headers)
    assert [a["id"] for a in resp.json()["accommodations"]] == ["wheelchair-access"]
    assert resp.json()["notes"] is None


def test_save_nice_to_haves(client, auth_headers):
    body = {
        "accommodations": [
            {"id": "hearing-loop", "must_have": False},
            "asl-interpreter",
            {"id": "low-sensory", "must_have": False},
            {"id": "low-sensory"},  # listed twice: must-have wins
        ]
    }
    resp = client.put("/api/v1/passport", json=body, headers=auth_headers)
    assert resp.status_code == 200
    assert [(a["id"], a["must_have"]) for a in resp.json()["accommodations"]] == [
        ("asl-interpreter", True),
        ("low-sensory", True),
        ("hearing-loop", False),
    ]

    # Saving again can change an accommodation from must-have to nice-to-have.
    body = {"accommodations": [{"id": "asl-interpreter", "must_have": False}]}
    client.put("/api/v1/passport", json=body, headers=auth_headers)
    saved = client.get("/api/v1/passport", headers=auth_headers).json()
    assert [(a["id"], a["must_have"]) for a in saved["accommodations"]] == [
        ("asl-interpreter", False)
    ]


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


def save(client, headers, accommodations, notes=None):
    body = {"accommodations": accommodations, "notes": notes}
    assert client.put("/api/v1/passport", json=body, headers=headers).status_code == 200


def test_matches_rank_clinics_by_passport(client, auth_headers):
    save(client, auth_headers, ["asl-interpreter", "roll-in-exam-table", "low-sensory"])
    clinics = client.get("/api/v1/passport/matches", headers=auth_headers).json()

    assert len(clinics) == 12  # ranking, not filtering
    scores = [c["match"]["score"] for c in clinics]
    assert scores == sorted(scores, reverse=True)
    # Sunrise offers all three; Maple Creek has the interpreter and table but not low-sensory.
    assert clinics[0]["id"] == "sunrise-community-clinic"
    assert clinics[0]["match"] == {
        "met": ["roll-in-exam-table", "asl-interpreter", "low-sensory"],  # display order
        "missing": [],
        "missing_must_haves": [],
        "score": 1.0,
    }
    maple = next(c for c in clinics if c["id"] == "maple-creek-family-medicine")
    assert maple["match"]["missing"] == ["low-sensory"]
    assert maple["match"]["score"] == 0.67


def test_matches_put_must_haves_first(client, auth_headers):
    nice = {"must_have": False}
    save(
        client,
        auth_headers,
        [
            "asl-interpreter",
            {"id": "low-sensory", **nice},
            {"id": "extended-appointments", **nice},
            {"id": "support-person", **nice},
        ],
    )
    clinics = client.get("/api/v1/passport/matches", headers=auth_headers).json()

    # Sunrise has everything. Then come the other clinics with the interpreter, ahead of
    # Calm Waters and Riverbend, which offer more of the nice-to-haves but not the interpreter.
    assert [c["id"] for c in clinics[:6]] == [
        "sunrise-community-clinic",
        "bluebird-hearing-speech",
        "harbor-urgent-care",
        "maple-creek-family-medicine",
        "calm-waters-behavioral-health",
        "riverbend-pediatrics",
    ]
    assert clinics[1]["match"]["score"] == 0.5
    assert clinics[4]["match"] == {
        "met": ["low-sensory", "extended-appointments", "support-person"],
        "missing": ["asl-interpreter"],
        "missing_must_haves": ["asl-interpreter"],
        "score": 0.75,
    }


def test_matches_take_clinic_filters(client, auth_headers):
    save(client, auth_headers, ["low-sensory"])
    resp = client.get("/api/v1/passport/matches", params={"type": "Dental"}, headers=auth_headers)
    clinics = resp.json()
    assert [c["id"] for c in clinics] == ["brightpath-dental", "pinecrest-dental-group"]
    assert [c["match"]["score"] for c in clinics] == [1.0, 0.0]


def test_matches_with_empty_passport_are_unranked(client, auth_headers):
    clinics = client.get("/api/v1/passport/matches", headers=auth_headers).json()
    assert len(clinics) == 12
    assert all(c["match"] is None for c in clinics)


def test_matches_require_auth(client):
    assert client.get("/api/v1/passport/matches").status_code == 401


def test_share_link(client, auth_headers):
    client.patch("/api/v1/profile", json={"full_name": "Ada Patient"}, headers=auth_headers)
    save(client, auth_headers, ["asl-interpreter"], notes="Please text me.")

    resp = client.post("/api/v1/passport/share", headers=auth_headers)
    assert resp.status_code == 200
    token = resp.json()["token"]
    assert resp.json()["include_name"] is True
    assert client.get("/api/v1/passport", headers=auth_headers).json()["share_token"] == token

    # Anyone with the link can read it, without logging in.
    shared = client.get(f"/api/v1/shared-passports/{token}").json()
    assert shared["name"] == "Ada Patient"
    assert [a["id"] for a in shared["accommodations"]] == ["asl-interpreter"]
    assert shared["accommodations"][0]["must_have"] is True  # so staff can see what's essential
    assert shared["notes"] == "Please text me."

    # Sharing again keeps the same link; the name can be hidden.
    resp = client.post("/api/v1/passport/share", json={"include_name": False}, headers=auth_headers)
    assert resp.json() == {"token": token, "include_name": False}
    assert client.get(f"/api/v1/shared-passports/{token}").json()["name"] is None

    # Turning sharing off kills the link; turning it on again makes a new one.
    assert client.delete("/api/v1/passport/share", headers=auth_headers).status_code == 204
    assert client.get(f"/api/v1/shared-passports/{token}").status_code == 404
    new_token = client.post("/api/v1/passport/share", headers=auth_headers).json()["token"]
    assert new_token != token


def test_share_shows_latest_passport(client, auth_headers):
    save(client, auth_headers, ["asl-interpreter"])
    token = client.post("/api/v1/passport/share", headers=auth_headers).json()["token"]
    save(client, auth_headers, ["wheelchair-access"])
    shared = client.get(f"/api/v1/shared-passports/{token}").json()
    assert [a["id"] for a in shared["accommodations"]] == ["wheelchair-access"]


def test_share_needs_saved_passport(client, auth_headers):
    assert client.post("/api/v1/passport/share", headers=auth_headers).status_code == 409
    # Turning off a share that was never on is fine.
    assert client.delete("/api/v1/passport/share", headers=auth_headers).status_code == 204


def test_share_requires_auth_and_valid_token(client):
    assert client.post("/api/v1/passport/share").status_code == 401
    assert client.delete("/api/v1/passport/share").status_code == 401
    assert client.get("/api/v1/shared-passports/not-a-real-token").status_code == 404
