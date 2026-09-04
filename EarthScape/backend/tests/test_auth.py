import pytest

from tests.conftest import auth_headers


async def test_register_new_user(client):
    res = await client.post(
        "/api/v1/auth/register",
        json={"full_name": "Test Analyst", "email": "newuser@earthscape.io", "password": "Password123", "role": "Analyst"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["email"] == "newuser@earthscape.io"
    assert body["user"]["role"] == "Analyst"
    assert "access_token" in body and "refresh_token" in body


async def test_register_duplicate_email_rejected(client):
    payload = {"full_name": "Dup User", "email": "dup@earthscape.io", "password": "Password123", "role": "Analyst"}
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 200
    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


async def test_login_success(client):
    res = await client.post("/api/v1/auth/login", json={"email": "admin@earthscape.io", "password": "Admin@12345"})
    assert res.status_code == 200
    assert res.json()["user"]["role"] == "Administrator"


async def test_login_wrong_password_rejected(client):
    res = await client.post("/api/v1/auth/login", json={"email": "admin@earthscape.io", "password": "wrong-password"})
    assert res.status_code == 401


async def test_login_unknown_email_rejected(client):
    res = await client.post("/api/v1/auth/login", json={"email": "ghost@earthscape.io", "password": "whatever123"})
    assert res.status_code == 401


async def test_me_requires_token(client):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401


async def test_me_returns_current_user(client, admin_token):
    res = await client.get("/api/v1/auth/me", headers=auth_headers(admin_token))
    assert res.status_code == 200
    assert res.json()["email"] == "admin@earthscape.io"


async def test_refresh_token_issues_new_access_token(client):
    login = await client.post("/api/v1/auth/login", json={"email": "analyst@earthscape.io", "password": "Analyst@12345"})
    refresh_token = login.json()["refresh_token"]
    res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 200
    assert "access_token" in res.json()


async def test_refresh_with_garbage_token_rejected(client):
    res = await client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert res.status_code == 401
