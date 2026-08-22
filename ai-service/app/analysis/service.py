from collections import defaultdict
from ultralytics import YOLO
from keras import Model
from app.detection.detector import detect_fruits
from app.freshness.predictor import predict_crop

from app.analysis.schemas import (
    AnalysisResponse,
    CategorySummary,
    FruitAnalysis,
)

from app.config import (
    POSITIVE_CLASS_LABEL,
    YOLO_CONFIDENCE_THRESHOLD,
)


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
    counts: dict[str, CategorySummary] = defaultdict(CategorySummary)

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

        summary = counts[fruit.class_name]

        if prediction.freshness == POSITIVE_CLASS_LABEL:
            summary.fresh += 1
        else:
            summary.rotten += 1

        summary.total += 1

    return AnalysisResponse(
        image_width=detection_result.image_width,
        image_height=detection_result.image_height,
        total_count=len(detections),
        counts=dict(counts),
        detections=detections,
    )