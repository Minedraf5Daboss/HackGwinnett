import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

PREFLIGHT = {"Access-Control-Request-Method": "GET"}


def make_client(**settings):
    return TestClient(create_app(Settings(database_url="sqlite://", **settings)))


@pytest.mark.parametrize("origin", ["http://localhost:3000", "http://127.0.0.1:5173"])
def test_development_allows_localhost(origin):
    client = make_client(env="development")
    resp = client.options("/api/v1/clinics", headers={"Origin": origin, **PREFLIGHT})
    assert resp.headers.get("access-control-allow-origin") == origin


def test_development_rejects_other_sites():
    client = make_client(env="development")
    resp = client.options(
        "/api/v1/clinics", headers={"Origin": "https://evil.example", **PREFLIGHT}
    )
    assert "access-control-allow-origin" not in resp.headers


def test_configured_origins_outside_development():
    client = make_client(
        env="production", secret_key="x" * 32, cors_origins=["https://medassist.example"]
    )
    allowed = {"Origin": "https://medassist.example", **PREFLIGHT}
    local = {"Origin": "http://localhost:3000", **PREFLIGHT}
    assert client.options("/api/v1/clinics", headers=allowed).status_code == 200
    resp = client.options("/api/v1/clinics", headers=local)
    assert "access-control-allow-origin" not in resp.headers
