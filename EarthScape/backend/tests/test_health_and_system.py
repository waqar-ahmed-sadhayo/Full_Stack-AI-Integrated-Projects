from tests.conftest import auth_headers


async def test_health_check(client):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


async def test_system_info_reports_demo_mode(client):
    res = await client.get("/api/v1/system/info")
    assert res.status_code == 200
    body = res.json()
    assert body["demo_mode"] is True
    assert body["hdfs_simulated"] is True


async def test_monitoring_system_status_shape(client, admin_token):
    res = await client.get("/api/v1/monitoring/system", headers=auth_headers(admin_token))
    assert res.status_code == 200
    body = res.json()
    for key in ["cpu_pct", "ram_pct", "disk_pct", "hdfs", "database", "uptime_seconds"]:
        assert key in body


async def test_openapi_docs_available(client):
    res = await client.get("/api/openapi.json")
    assert res.status_code == 200
    assert res.json()["info"]["title"].startswith("EarthScape")
