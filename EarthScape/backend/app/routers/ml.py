from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.deps import require_admin, require_any_role
from app.ml import pipeline

router = APIRouter(prefix="/api/v1/ml", tags=["ML Predictions"])


class TrainRequest(BaseModel):
    model_type: str


class PredictRequest(BaseModel):
    model_type: str
    location: str
    start_date: str
    horizon_days: int = 14


@router.get("/models")
async def get_models(user=Depends(require_any_role)):
    return await pipeline.list_models()


@router.post("/train")
async def train(payload: TrainRequest, user=Depends(require_admin)):
    try:
        if payload.model_type in pipeline.REGRESSION_TARGETS:
            return await pipeline.train_regression_model(payload.model_type, user["_id"])
        if payload.model_type == "climate_trend":
            return await pipeline.train_climate_trend_model(user["_id"])
        if payload.model_type == "anomaly_detector":
            return await pipeline.train_anomaly_classifier(user["_id"])
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown model_type")
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))


@router.post("/predict")
async def predict(payload: PredictRequest, user=Depends(require_any_role)):
    try:
        return await pipeline.predict(payload.model_type, payload.location, payload.start_date, payload.horizon_days)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
