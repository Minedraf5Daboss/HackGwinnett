from conftest import register_and_login


def test_item_crud(client, auth_headers):
    resp = client.post("/api/v1/items", json={"name": "widget"}, headers=auth_headers)
    assert resp.status_code == 201
    item = resp.json()
    url = f"/api/v1/items/{item['id']}"

    assert client.get(url, headers=auth_headers).json() == item
    assert client.get("/api/v1/items", headers=auth_headers).json() == [item]

    resp = client.patch(url, json={"description": "shiny"}, headers=auth_headers)
    assert resp.json()["description"] == "shiny"
    assert resp.json()["name"] == "widget"

    assert client.delete(url, headers=auth_headers).status_code == 204
    assert client.get(url, headers=auth_headers).status_code == 404


def test_items_require_auth(client):
    assert client.get("/api/v1/items").status_code == 401


def test_items_are_private(client, auth_headers):
    item = client.post("/api/v1/items", json={"name": "mine"}, headers=auth_headers).json()
    other = register_and_login(client, "other@example.com")

    assert client.get("/api/v1/items", headers=other).json() == []
    assert client.get(f"/api/v1/items/{item['id']}", headers=other).status_code == 404
    assert client.delete(f"/api/v1/items/{item['id']}", headers=other).status_code == 404


def test_create_item_validation(client, auth_headers):
    resp = client.post("/api/v1/items", json={"name": ""}, headers=auth_headers)
    assert resp.status_code == 422
