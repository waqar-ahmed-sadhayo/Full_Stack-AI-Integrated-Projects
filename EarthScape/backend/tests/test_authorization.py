from tests.conftest import auth_headers


async def test_admin_only_users_endpoint_rejects_analyst(client, analyst_token):
    res = await client.get("/api/v1/users", headers=auth_headers(analyst_token))
    assert res.status_code == 403


async def test_admin_only_users_endpoint_allows_admin(client, admin_token):
    res = await client.get("/api/v1/users", headers=auth_headers(admin_token))
    assert res.status_code == 200
    assert isinstance(res.json(), list)


async def test_admin_only_monitoring_rejects_analyst(client, analyst_token):
    res = await client.get("/api/v1/monitoring/system", headers=auth_headers(analyst_token))
    assert res.status_code == 403


async def test_create_alert_requires_admin(client, analyst_token):
    res = await client.post(
        "/api/v1/alerts",
        headers=auth_headers(analyst_token),
        json={"title": "x", "severity": "low", "message": "y"},
    )
    assert res.status_code == 403


async def test_ml_train_requires_admin(client, analyst_token):
    res = await client.post("/api/v1/ml/train", headers=auth_headers(analyst_token), json={"model_type": "temperature_predictor"})
    assert res.status_code == 403


async def test_analyst_can_read_climate_data(client, analyst_token):
    res = await client.get("/api/v1/climate-data", headers=auth_headers(analyst_token))
    assert res.status_code == 200


async def test_protected_endpoint_without_token_rejected(client):
    res = await client.get("/api/v1/climate-data")
    assert res.status_code == 401
