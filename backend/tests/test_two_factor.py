import time

import pyotp

from app.two_factor import MAX_FAILURES

PASSWORD = "password123"


def code_at(secret, offset_steps=0):
    """The app's code `offset_steps` 30-second steps from now."""
    return pyotp.TOTP(secret).at(time.time() + 30 * offset_steps)


def turn_on(client, headers):
    """Set up and enable 2FA. Returns the secret, the recovery codes, and the code used."""
    setup = client.post("/api/v1/auth/2fa/setup", headers=headers).json()
    code = code_at(setup["secret"])
    resp = client.post("/api/v1/auth/2fa/enable", json={"code": code}, headers=headers)
    assert resp.status_code == 200
    return setup["secret"], resp.json()["recovery_codes"], code


def password_step(client, email="user@example.com"):
    resp = client.post("/api/v1/auth/token", data={"username": email, "password": PASSWORD})
    assert resp.status_code == 200
    return resp.json()


def code_step(client, challenge, code):
    body = {"two_factor_token": challenge["two_factor_token"], "code": code}
    return client.post("/api/v1/auth/2fa/verify", json=body)


def test_setup_gives_qr_code(client, auth_headers):
    resp = client.post("/api/v1/auth/2fa/setup", headers=auth_headers)
    assert resp.status_code == 200
    setup = resp.json()
    assert setup["otpauth_uri"].startswith("otpauth://totp/MedAssist:user%40example.com?")
    assert setup["secret"] in setup["otpauth_uri"]
    assert setup["qr_code"].startswith("data:image/svg+xml")
    # Not on until it's confirmed with a code: logging in still gives a token straight away.
    me = client.get("/api/v1/users/me", headers=auth_headers).json()
    assert me["two_factor_enabled"] is False
    assert "access_token" in password_step(client)


def test_enable_needs_a_right_code(client, auth_headers):
    assert (
        client.post(
            "/api/v1/auth/2fa/enable", json={"code": "123456"}, headers=auth_headers
        ).status_code
        == 409
    )  # no setup yet
    setup = client.post("/api/v1/auth/2fa/setup", headers=auth_headers).json()
    wrong = str((int(code_at(setup["secret"])) + 1) % 1_000_000).zfill(6)
    resp = client.post("/api/v1/auth/2fa/enable", json={"code": wrong}, headers=auth_headers)
    assert resp.status_code == 422


def test_enable_gives_recovery_codes(client, auth_headers):
    _, codes, _ = turn_on(client, auth_headers)
    assert len(codes) == len(set(codes)) == 10
    me = client.get("/api/v1/users/me", headers=auth_headers).json()
    assert me["two_factor_enabled"] is True
    # Setting up again needs turning it off first.
    assert client.post("/api/v1/auth/2fa/setup", headers=auth_headers).status_code == 409


def test_login_with_code(client, auth_headers):
    secret, _, first_code = turn_on(client, auth_headers)

    challenge = password_step(client)
    assert challenge["two_factor_required"] is True
    assert "access_token" not in challenge
    # The challenge token isn't a login token.
    bad = {"Authorization": f"Bearer {challenge['two_factor_token']}"}
    assert client.get("/api/v1/users/me", headers=bad).status_code == 401

    # The code used to turn 2FA on can't be used again, but the next one works.
    assert code_step(client, challenge, first_code).status_code == 401
    resp = code_step(client, challenge, code_at(secret, 1))
    assert resp.status_code == 200
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    assert client.get("/api/v1/users/me", headers=headers).json()["email"] == "user@example.com"
    # And it can't be replayed.
    assert code_step(client, challenge, code_at(secret, 1)).status_code == 401


def test_login_rejects_bad_challenge(client, auth_headers):
    secret, _, _ = turn_on(client, auth_headers)
    # An access token isn't a challenge token.
    access_token = auth_headers["Authorization"].removeprefix("Bearer ")
    resp = code_step(client, {"two_factor_token": access_token}, code_at(secret, 1))
    assert resp.status_code == 401
    assert code_step(client, {"two_factor_token": "junk"}, code_at(secret, 1)).status_code == 401


def test_recovery_code_works_once(client, auth_headers):
    _, codes, _ = turn_on(client, auth_headers)
    challenge = password_step(client)
    # Case, spaces, and dashes don't matter.
    assert code_step(client, challenge, f"  {codes[0].upper()} ").status_code == 200
    assert code_step(client, challenge, codes[0]).status_code == 401
    assert code_step(client, challenge, codes[1].replace("-", "")).status_code == 200


def test_too_many_wrong_codes_locks_out(client, auth_headers):
    secret, _, _ = turn_on(client, auth_headers)
    challenge = password_step(client)
    for _ in range(MAX_FAILURES):
        assert code_step(client, challenge, "000000").status_code in (401, 200)
    # Even the right code is refused while locked out.
    resp = code_step(client, challenge, code_at(secret, 1))
    assert resp.status_code == 429
    assert "Too many wrong codes" in resp.json()["detail"]


def test_disable_needs_password_and_code(client, auth_headers):
    secret, codes, _ = turn_on(client, auth_headers)
    url = "/api/v1/auth/2fa/disable"

    body = {"password": "wrong-password", "code": code_at(secret, 1)}
    assert client.post(url, json=body, headers=auth_headers).status_code == 403
    body = {"password": PASSWORD, "code": "abcde-fghij"}
    assert client.post(url, json=body, headers=auth_headers).status_code == 403
    body = {"password": PASSWORD, "code": codes[0]}
    assert client.post(url, json=body, headers=auth_headers).status_code == 204

    me = client.get("/api/v1/users/me", headers=auth_headers).json()
    assert me["two_factor_enabled"] is False
    assert "access_token" in password_step(client)  # back to one step


def test_two_factor_requires_auth(client):
    for path in ("setup", "enable", "disable"):
        assert client.post(f"/api/v1/auth/2fa/{path}", json={}).status_code == 401
