from collections import Counter
from typing import Any

from app.detection.detector import detect_fruits
from app.freshness.predictor import predict_crop

from app.analysis.schemas import (
    AnalysisResponse,
    FruitAnalysis,
)

from app.config import YOLO_CONFIDENCE_THRESHOLD


def analyze_image(
    detection_model: Any,
    freshness_model: Any,
    image_bytes: bytes,
) -> AnalysisResponse:

    detection_result = detect_fruits(
        detection_model,
        image_bytes,
        YOLO_CONFIDENCE_THRESHOLD,
    )

    detections = []
    counts = Counter()

    for fruit in detection_result.detections:

        prediction = predict_crop(
            freshness_model,
            fruit.crop,
        )

        detections.append(
            FruitAnalysis(
                class_name=fruit.class_name,
                confidence=fruit.confidence,
                bounding_box=fruit.bounding_box,
                freshness=prediction["freshness"],
                freshness_confidence=prediction["confidence"],
                freshness_confidence_percent=prediction[
                    "confidence_percent"
                ],
            )
        )

        counts[fruit.class_name] += 1

    return AnalysisResponse(
        image_width=detection_result.image_width,
        image_height=detection_result.image_height,
        total_count=len(detections),
        counts=dict(counts),
        detections=detections,
    )