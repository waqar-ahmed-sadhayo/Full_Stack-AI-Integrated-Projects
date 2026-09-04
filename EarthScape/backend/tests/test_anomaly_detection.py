from tests.conftest import auth_headers


async def test_detect_runs_all_three_methods(client, analyst_token):
    res = await client.post("/api/v1/anomalies/detect", headers=auth_headers(analyst_token), json={"metric": "temperature_c"})
    assert res.status_code == 200
    body = res.json()
    for key in ["zscore_found", "iqr_found", "isolation_forest_found", "total_anomalies"]:
        assert key in body
    assert body["total_anomalies"] == body["zscore_found"] + body["iqr_found"] + body["isolation_forest_found"]


async def test_list_anomalies_after_detection(client, analyst_token):
    await client.post("/api/v1/anomalies/detect", headers=auth_headers(analyst_token), json={"metric": "co2_ppm"})
    res = await client.get("/api/v1/anomalies", headers=auth_headers(analyst_token))
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body, list)
    if body:
        row = body[0]
        for key in ["severity", "detection_method", "confidence_score", "status"]:
            assert key in row


async def test_distribution_reflects_detected_anomalies(client, analyst_token):
    await client.post("/api/v1/anomalies/detect", headers=auth_headers(analyst_token), json={"metric": "temperature_c"})
    res = await client.get("/api/v1/anomalies/distribution", headers=auth_headers(analyst_token))
    assert res.status_code == 200
    body = res.json()
    assert "by_severity" in body and "by_method" in body


async def test_update_anomaly_status(client, analyst_token):
    await client.post("/api/v1/anomalies/detect", headers=auth_headers(analyst_token), json={"metric": "temperature_c"})
    listing = await client.get("/api/v1/anomalies", headers=auth_headers(analyst_token))
    anomalies = listing.json()
    if not anomalies:
        return
    anomaly_id = anomalies[0]["_id"]
    res = await client.patch(f"/api/v1/anomalies/{anomaly_id}/status", headers=auth_headers(analyst_token), json={"status": "Resolved"})
    assert res.status_code == 200


async def test_update_unknown_anomaly_status_404(client, analyst_token):
    res = await client.patch("/api/v1/anomalies/does-not-exist/status", headers=auth_headers(analyst_token), json={"status": "Resolved"})
    assert res.status_code == 404
