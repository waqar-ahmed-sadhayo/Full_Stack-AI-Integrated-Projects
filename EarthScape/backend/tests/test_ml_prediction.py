import pytest

from tests.conftest import auth_headers


async def test_predict_without_trained_model_fails(client, analyst_token):
    res = await client.post(
        "/api/v1/ml/predict",
        headers=auth_headers(analyst_token),
        json={"model_type": "rainfall_predictor", "location": "Tokyo", "start_date": "2026-09-01", "horizon_days": 5},
    )
    assert res.status_code == 422


async def test_train_and_predict_temperature_model(client, admin_token, analyst_token):
    train_res = await client.post(
        "/api/v1/ml/train", headers=auth_headers(admin_token), json={"model_type": "temperature_predictor"}
    )
    assert train_res.status_code == 200, train_res.text
    body = train_res.json()
    assert body["algorithm"] == "RandomForestRegressor"
    assert "r2" in body["metrics"]

    predict_res = await client.post(
        "/api/v1/ml/predict",
        headers=auth_headers(analyst_token),
        json={"model_type": "temperature_predictor", "location": "Tokyo", "start_date": "2026-09-01", "horizon_days": 7},
    )
    assert predict_res.status_code == 200
    pred_body = predict_res.json()
    assert len(pred_body["forecasts"]) == 7
    for f in pred_body["forecasts"]:
        assert f["confidence_lower"] <= f["predicted_value"] <= f["confidence_upper"]


async def test_train_anomaly_classifier_reports_classification_metrics(client, admin_token):
    res = await client.post("/api/v1/ml/train", headers=auth_headers(admin_token), json={"model_type": "anomaly_detector"})
    assert res.status_code == 200
    metrics = res.json()["metrics"]
    for key in ["accuracy", "precision", "recall", "f1"]:
        assert key in metrics
        assert 0.0 <= metrics[key] <= 1.0


async def test_models_listing_reflects_training(client, admin_token):
    res = await client.get("/api/v1/ml/models", headers=auth_headers(admin_token))
    assert res.status_code == 200
    types = {m["model_type"] for m in res.json()}
    assert "temperature_predictor" in types


async def test_train_unknown_model_type_rejected(client, admin_token):
    res = await client.post("/api/v1/ml/train", headers=auth_headers(admin_token), json={"model_type": "not_a_model"})
    assert res.status_code == 400
