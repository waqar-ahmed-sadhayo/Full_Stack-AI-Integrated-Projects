from tests.conftest import auth_headers


async def test_generate_csv_report_and_download(client, analyst_token):
    gen_res = await client.post(
        "/api/v1/reports/generate", headers=auth_headers(analyst_token), json={"report_type": "regional", "format": "csv"}
    )
    assert gen_res.status_code == 200
    report = gen_res.json()
    assert report["format"] == "csv"
    assert report["hdfs_path"].startswith("/earthscape/reports/")

    download_res = await client.get(f"/api/v1/reports/{report['_id']}/download", headers=auth_headers(analyst_token))
    assert download_res.status_code == 200
    assert len(download_res.content) > 0


async def test_generate_pdf_report(client, analyst_token):
    res = await client.post(
        "/api/v1/reports/generate", headers=auth_headers(analyst_token), json={"report_type": "data_quality", "format": "pdf"}
    )
    assert res.status_code == 200
    assert res.json()["format"] == "pdf"


async def test_generate_report_invalid_type_rejected(client, analyst_token):
    res = await client.post(
        "/api/v1/reports/generate", headers=auth_headers(analyst_token), json={"report_type": "not_a_type", "format": "csv"}
    )
    assert res.status_code == 400


async def test_generate_report_invalid_format_rejected(client, analyst_token):
    res = await client.post(
        "/api/v1/reports/generate", headers=auth_headers(analyst_token), json={"report_type": "regional", "format": "docx"}
    )
    assert res.status_code == 400


async def test_reports_listing(client, analyst_token):
    res = await client.get("/api/v1/reports", headers=auth_headers(analyst_token))
    assert res.status_code == 200
    assert isinstance(res.json(), list)


async def test_download_unknown_report_404(client, analyst_token):
    res = await client.get("/api/v1/reports/does-not-exist/download", headers=auth_headers(analyst_token))
    assert res.status_code == 404
