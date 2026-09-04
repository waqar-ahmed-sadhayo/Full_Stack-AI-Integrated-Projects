from tests.conftest import auth_headers


async def test_trend_endpoint_returns_series(client, analyst_token):
    res = await client.get("/api/v1/analytics/trend", params={"metric": "temperature_c", "granularity": "day"}, headers=auth_headers(analyst_token))
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)
    assert all("period" in row and "value" in row for row in body)


async def test_regional_comparison_covers_regions(client, analyst_token):
    res = await client.get("/api/v1/analytics/regional-comparison", params={"metric": "temperature_c"}, headers=auth_headers(analyst_token))
    assert res.status_code == 200
    regions = {row["region"] for row in res.json()}
    assert "Asia" in regions and "Europe" in regions


async def test_seasonal_trend_has_twelve_months(client, analyst_token):
    res = await client.get("/api/v1/analytics/seasonal-trend", params={"metric": "temperature_c"}, headers=auth_headers(analyst_token))
    assert res.status_code == 200
    assert len(res.json()) == 12


async def test_correlation_matrix_is_square(client, analyst_token):
    res = await client.get("/api/v1/analytics/correlation", headers=auth_headers(analyst_token))
    assert res.status_code == 200
    body = res.json()
    n = len(body["metrics"])
    assert len(body["matrix"]) == n
    assert all(len(row) == n for row in body["matrix"])
