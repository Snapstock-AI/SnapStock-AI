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


class CategorySummary(BaseModel):
    fresh: int = Field(
        ge=0,
        default=0,
    )

    rotten: int = Field(
        ge=0,
        default=0,
    )

    total: int = Field(
        ge=0,
        default=0,
    )


class AnalysisResponse(BaseModel):
    image_width: int

    image_height: int

    total_count: int

    counts: dict[str, CategorySummary]

    detections: list[FruitAnalysis]