from pydantic import BaseModel, Field


class PredictionResponse(BaseModel):
    freshness: str = Field(
        ...,
        description="Predicted freshness class. Example: good or bad."
    )

    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Prediction confidence between 0 and 1."
    )

    confidence_percent: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Prediction confidence as a percentage."
    )

    model: str = Field(
        ...,
        description="Model used for prediction."
    )

    message: str = Field(
        ...,
        description="Human-readable prediction message."
    )


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool