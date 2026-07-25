from collections import Counter
from ultralytics import YOLO
from keras import Model
from app.detection.detector import detect_fruits
from app.freshness.predictor import predict_crop

from app.analysis.schemas import (
    AnalysisResponse,
    FruitAnalysis,
)

from app.config import YOLO_CONFIDENCE_THRESHOLD


def analyze_image(
    detection_model: YOLO,
    freshness_model: Model,
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
                freshness=prediction.freshness,
                freshness_confidence=prediction.confidence,
                freshness_confidence_percent=prediction.confidence_percent,
            )
        )

        counts[fruit.class_name] += 1

    return AnalysisResponse(
        total_count=len(detections),
        counts=dict(counts),
        detections=detections,
    )