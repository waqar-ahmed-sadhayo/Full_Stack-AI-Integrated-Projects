from tests.conftest import auth_headers


async def test_create_and_resolve_alert(client, admin_token):
    create_res = await client.post(
        "/api/v1/alerts",
        headers=auth_headers(admin_token),
        json={"title": "Test Alert", "severity": "high", "message": "Testing alert lifecycle", "related_metric": "temperature_c"},
    )
    assert create_res.status_code == 200
    alert_id = create_res.json()["_id"]
    assert create_res.json()["status"] == "Active"

    list_res = await client.get("/api/v1/alerts", params={"status_filter": "Active"}, headers=auth_headers(admin_token))
    assert any(a["_id"] == alert_id for a in list_res.json())

    resolve_res = await client.patch(f"/api/v1/alerts/{alert_id}/resolve", headers=auth_headers(admin_token))
    assert resolve_res.status_code == 200

    list_after = await client.get("/api/v1/alerts", params={"status_filter": "Resolved"}, headers=auth_headers(admin_token))
    assert any(a["_id"] == alert_id for a in list_after.json())


async def test_resolve_unknown_alert_404(client, admin_token):
    res = await client.patch("/api/v1/alerts/does-not-exist/resolve", headers=auth_headers(admin_token))
    assert res.status_code == 404


async def test_threshold_create_list_delete(client, admin_token):
    create_res = await client.post(
        "/api/v1/alerts/thresholds",
        headers=auth_headers(admin_token),
        json={"metric": "temperature_c", "operator": "gt", "value": 45, "severity": "critical"},
    )
    assert create_res.status_code == 200
    threshold_id = create_res.json()["_id"]

    list_res = await client.get("/api/v1/alerts/thresholds", headers=auth_headers(admin_token))
    assert any(t["_id"] == threshold_id for t in list_res.json())

    delete_res = await client.delete(f"/api/v1/alerts/thresholds/{threshold_id}", headers=auth_headers(admin_token))
    assert delete_res.status_code == 200


async def test_thresholds_endpoint_requires_admin(client, analyst_token):
    res = await client.get("/api/v1/alerts/thresholds", headers=auth_headers(analyst_token))
    assert res.status_code == 403
