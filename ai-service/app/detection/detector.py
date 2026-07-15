from collections import Counter
from io import BytesIO
from threading import Lock

from PIL import Image, UnidentifiedImageError

from app.config import (
    DETECTION_MODEL_NAME,
    YOLO_AGNOSTIC_NMS,
    YOLO_IMAGE_SIZE,
    YOLO_IOU_THRESHOLD,
)
from app.detection.model_loader import get_detection_model
from app.detection.schemas import (
    BoundingBox,
    DetectedObject,
    DetectionResponse,
)


class InvalidDetectionImageError(ValueError):
    """Raised when the provided file is not a valid image."""


_inference_lock = Lock()


def normalize_class_name(class_name: str) -> str:
    """
    Convert the model's class labels into clean inventory names.

    Examples:
        Tomato -> tomato
        tomato -> tomato
        cucumber/cuke -> cucumber
        bell pepper/capsicum -> bell pepper
    """

    primary_name = class_name.split("/")[0]

    return primary_name.strip().lower()


def detect_and_count(
    image_bytes: bytes,
    confidence_threshold: float,
) -> DetectionResponse:
    if not image_bytes:
        raise InvalidDetectionImageError(
            "The uploaded image is empty."
        )

    try:
        image = Image.open(
            BytesIO(image_bytes)
        ).convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        raise InvalidDetectionImageError(
            "The uploaded file is not a valid supported image."
        ) from error

    image_width, image_height = image.size

    model = get_detection_model()

    with _inference_lock:
        results = model.predict(
            source=image,
            conf=confidence_threshold,
            iou=YOLO_IOU_THRESHOLD,
            imgsz=YOLO_IMAGE_SIZE,
            agnostic_nms=YOLO_AGNOSTIC_NMS,
            verbose=False,
        )

    if not results:
        return DetectionResponse(
            total_count=0,
            counts={},
            detections=[],
            image_width=image_width,
            image_height=image_height,
            model=DETECTION_MODEL_NAME,
        )

    result = results[0]

    detections: list[DetectedObject] = []
    counts: Counter[str] = Counter()

    if result.boxes is not None:
        boxes = result.boxes.cpu()

        coordinates_list = boxes.xyxy.tolist()
        confidence_list = boxes.conf.tolist()
        class_id_list = boxes.cls.tolist()

        for coordinates, confidence, class_id_value in zip(
            coordinates_list,
            confidence_list,
            class_id_list,
        ):
            class_id = int(class_id_value)

            raw_class_name = result.names[class_id]
            class_name = normalize_class_name(
                raw_class_name
            )

            x1, y1, x2, y2 = [
                round(value)
                for value in coordinates
            ]

            detections.append(
                DetectedObject(
                    class_id=class_id,
                    class_name=class_name,
                    confidence=round(
                        float(confidence),
                        4,
                    ),
                    bounding_box=BoundingBox(
                        x1=x1,
                        y1=y1,
                        x2=x2,
                        y2=y2,
                    ),
                )
            )

            counts[class_name] += 1

    sorted_counts = dict(
        sorted(counts.items())
    )

    return DetectionResponse(
        total_count=sum(sorted_counts.values()),
        counts=sorted_counts,
        detections=detections,
        image_width=image_width,
        image_height=image_height,
        model=DETECTION_MODEL_NAME,
    )