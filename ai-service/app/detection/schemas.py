from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int

class DetectedFruit(BaseModel):
    class_id: int
    class_name: str

    confidence: float = Field(
        ge=0.0,
        le=1.0,
    )

    bounding_box: BoundingBox


class DetectionResult(BaseModel):
    image_width: int
    image_height: int
    model: str
    detections: list[DetectedFruit]


class DetectionResponse(BaseModel):
    total_count: int
    counts: dict[str, int]
    


