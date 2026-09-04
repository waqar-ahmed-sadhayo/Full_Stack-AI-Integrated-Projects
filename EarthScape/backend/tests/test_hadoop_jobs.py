import asyncio

from tests.conftest import auth_headers


async def test_start_job_and_poll_until_completed(client, analyst_token):
    start_res = await client.post("/api/v1/hadoop/jobs/start", headers=auth_headers(analyst_token), json={"job_type": "temperature_aggregation"})
    assert start_res.status_code == 200
    job = start_res.json()
    assert job["status"] == "Queued"

    for _ in range(20):
        await asyncio.sleep(0.3)
        res = await client.get(f"/api/v1/hadoop/jobs/{job['job_id']}", headers=auth_headers(analyst_token))
        if res.json()["status"] in ("Completed", "Failed"):
            break
    final = res.json()
    assert final["status"] == "Completed"
    assert final["input_records"] > 0
    assert final["output_records"] > 0
    assert final["output_path"].startswith("/earthscape/analytics/")


async def test_start_job_unknown_type_rejected(client, analyst_token):
    res = await client.post("/api/v1/hadoop/jobs/start", headers=auth_headers(analyst_token), json={"job_type": "not_a_job"})
    assert res.status_code == 400


async def test_job_definitions_listing(client, analyst_token):
    res = await client.get("/api/v1/hadoop/jobs/definitions", headers=auth_headers(analyst_token))
    assert res.status_code == 200
    assert any(d["job_type"] == "rainfall_aggregation" for d in res.json())


async def test_hdfs_health_and_storage_endpoints(client, analyst_token):
    health_res = await client.get("/api/v1/hadoop/hdfs/health", headers=auth_headers(analyst_token))
    assert health_res.status_code == 200
    assert health_res.json()["simulated"] is True

    storage_res = await client.get("/api/v1/hadoop/hdfs/storage", headers=auth_headers(analyst_token))
    assert storage_res.status_code == 200
    assert "zones" in storage_res.json()
