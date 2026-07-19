from pydantic import BaseModel, Field

from app.detection.schemas import BoundingBox


class FruitAnalysis(BaseModel):
    class_name: str

    confidence: float = Field(
        ge=0.0,
        le=1.0,
    )

    bounding_box: BoundingBox

    freshness: str

    freshness_confidence: float = Field(
        ge=0.0,
        le=1.0,
    )

    freshness_confidence_percent: float


class AnalysisResponse(BaseModel):
    total_count: int

    counts: dict[str, int]

    detections: list[FruitAnalysis]