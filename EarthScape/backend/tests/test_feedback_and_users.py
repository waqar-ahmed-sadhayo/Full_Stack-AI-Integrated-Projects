from tests.conftest import auth_headers


async def test_submit_and_list_own_ticket(client, analyst_token):
    create_res = await client.post(
        "/api/v1/feedback",
        headers=auth_headers(analyst_token),
        json={"category": "Bug Report", "subject": "Chart glitch", "message": "Chart tooltip misaligned", "priority": "Low"},
    )
    assert create_res.status_code == 200
    ticket_id = create_res.json()["_id"]

    list_res = await client.get("/api/v1/feedback", headers=auth_headers(analyst_token))
    assert any(t["_id"] == ticket_id for t in list_res.json())


async def test_admin_sees_all_tickets_and_can_update_status(client, admin_token, analyst_token):
    create_res = await client.post(
        "/api/v1/feedback",
        headers=auth_headers(analyst_token),
        json={"category": "General Question", "subject": "Access", "message": "Need access", "priority": "Medium"},
    )
    ticket_id = create_res.json()["_id"]

    admin_list = await client.get("/api/v1/feedback", headers=auth_headers(admin_token))
    assert any(t["_id"] == ticket_id for t in admin_list.json())

    update_res = await client.patch(f"/api/v1/feedback/{ticket_id}/status", headers=auth_headers(admin_token), json={"status": "Resolved"})
    assert update_res.status_code == 200


async def test_analyst_cannot_update_ticket_status(client, analyst_token):
    create_res = await client.post(
        "/api/v1/feedback",
        headers=auth_headers(analyst_token),
        json={"category": "Bug Report", "subject": "x", "message": "y", "priority": "Low"},
    )
    ticket_id = create_res.json()["_id"]
    res = await client.patch(f"/api/v1/feedback/{ticket_id}/status", headers=auth_headers(analyst_token), json={"status": "Resolved"})
    assert res.status_code == 403


async def test_admin_create_change_role_and_deactivate_user(client, admin_token):
    create_res = await client.post(
        "/api/v1/users",
        headers=auth_headers(admin_token),
        json={"full_name": "Managed User", "email": "managed@earthscape.io", "password": "Password123", "role": "Analyst"},
    )
    assert create_res.status_code == 200
    user_id = create_res.json()["id"]

    role_res = await client.patch(f"/api/v1/users/{user_id}/role", headers=auth_headers(admin_token), json={"role": "Administrator"})
    assert role_res.status_code == 200

    active_res = await client.patch(f"/api/v1/users/{user_id}/active", headers=auth_headers(admin_token), json={"is_active": False})
    assert active_res.status_code == 200

    users = (await client.get("/api/v1/users", headers=auth_headers(admin_token))).json()
    updated = next(u for u in users if u["id"] == user_id)
    assert updated["role"] == "Administrator"
    assert updated["is_active"] is False
