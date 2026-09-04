import io

from tests.conftest import auth_headers

VALID_CSV = b"""date,city,country,region,latitude,longitude,temperature,humidity,rainfall,wind_speed,pressure,co2,sensor_id
2026-01-01,Denver,USA,North America,39.7392,-104.9903,22.5,40,0,12,1015,417,TST-001
2026-01-02,Denver,USA,North America,39.7392,-104.9903,23.1,38,0,10,1016,417.5,TST-001
2026-01-03,Denver,USA,North America,39.7392,-104.9903,,45,2.5,15,1012,418,TST-001
2026-01-03,Denver,USA,North America,39.7392,-104.9903,,45,2.5,15,1012,418,TST-001
2026-01-04,Denver,USA,North America,39.7392,-104.9903,21.0,50,0,9,1018,416.8,TST-002
"""

MISSING_COLUMNS_CSV = b"""foo,bar\n1,2\n"""


async def test_upload_valid_csv_ingests_and_cleans(client, admin_token):
    files = {"file": ("sample.csv", io.BytesIO(VALID_CSV), "text/csv")}
    res = await client.post(
        "/api/v1/ingestion/upload",
        headers=auth_headers(admin_token),
        files=files,
        data={"source_type": "Weather Station"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["record_count"] == 4  # 5 rows minus 1 exact duplicate
    assert body["duplicates_removed"] == 1
    assert body["hdfs_destination"].startswith("/earthscape/raw/")
    assert any("Filled" in entry and "temperature_c" in entry for entry in body["audit_trail"])
    assert any("duplicate" in entry.lower() for entry in body["audit_trail"])


async def test_upload_missing_required_columns_rejected(client, admin_token):
    files = {"file": ("bad.csv", io.BytesIO(MISSING_COLUMNS_CSV), "text/csv")}
    res = await client.post(
        "/api/v1/ingestion/upload",
        headers=auth_headers(admin_token),
        files=files,
        data={"source_type": "Weather Station"},
    )
    assert res.status_code == 422
    assert "errors" in res.json()["detail"]


async def test_upload_unsupported_extension_rejected(client, admin_token):
    files = {"file": ("data.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")}
    res = await client.post(
        "/api/v1/ingestion/upload",
        headers=auth_headers(admin_token),
        files=files,
        data={"source_type": "Weather Station"},
    )
    assert res.status_code == 400


async def test_datasets_history_lists_uploads(client, admin_token):
    res = await client.get("/api/v1/ingestion/datasets", headers=auth_headers(admin_token))
    assert res.status_code == 200
    assert isinstance(res.json(), list)
