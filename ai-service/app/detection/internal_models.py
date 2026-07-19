from dataclasses import dataclass, field

import numpy as np

from app.detection.schemas import BoundingBox


@dataclass
class DetectedCrop:
    class_id: int
    class_name: str
    confidence: float
    bounding_box: BoundingBox
    crop: np.ndarray

@dataclass
class InternalDetectionResult:
    image_width: int
    image_height: int
    model: str
    detections: list[DetectedCrop] = field(default_factory=list)