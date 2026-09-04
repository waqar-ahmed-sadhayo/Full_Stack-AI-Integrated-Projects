from tests.conftest import auth_headers


async def test_list_records_paginated(client, analyst_token):
    res = await client.get("/api/v1/climate-data", params={"page": 1, "page_size": 10}, headers=auth_headers(analyst_token))
    assert res.status_code == 200
    body = res.json()
    assert body["page"] == 1
    assert len(body["items"]) <= 10
    assert body["total"] > 0


async def test_list_records_filter_by_region(client, analyst_token):
    res = await client.get("/api/v1/climate-data", params={"region": "Asia", "page_size": 50}, headers=auth_headers(analyst_token))
    assert res.status_code == 200
    body = res.json()
    assert all(item["region"] == "Asia" for item in body["items"])


async def test_summary_stats_shape(client, analyst_token):
    res = await client.get("/api/v1/climate-data/summary", headers=auth_headers(analyst_token))
    assert res.status_code == 200
    body = res.json()
    for key in ["total_records", "processed_records", "active_sensors", "anomaly_count", "avg_temperature_c"]:
        assert key in body


async def test_export_csv_returns_csv_content(client, analyst_token):
    res = await client.get("/api/v1/climate-data/export", headers=auth_headers(analyst_token))
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert b"timestamp" in res.content
