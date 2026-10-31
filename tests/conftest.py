import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import Base
from app.main import create_app


@pytest.fixture
def app():
    app = create_app(
        Settings(
            env="test",
            database_url="sqlite://",
            secret_key="test-secret-key-that-is-at-least-32-bytes",
        )
    )
    Base.metadata.create_all(app.state.engine)
    return app


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c


def register_and_login(client: TestClient, email: str, password: str = "password123") -> dict:
    client.post("/api/v1/auth/register", json={"email": email, "password": password})
    resp = client.post("/api/v1/auth/token", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
def auth_headers(client):
    return register_and_login(client, "user@example.com")
