from pathlib import Path
import cv2
import numpy as np

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
    DetectionResponse,
    CropResult,
)

# Debug folder to save cropped fruits
OUTPUT_DIR = Path("outputs/crops")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class InvalidDetectionImageError(ValueError):
    """Raised when the provided file is not a valid image."""


_inference_lock = Lock()


def normalize_class_name(class_name: str) -> str:
    """
    Convert the model's class labels into clean inventory names.
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

        # Convert PIL image to OpenCV image
        opencv_image = cv2.cvtColor(
            np.array(image),
            cv2.COLOR_RGB2BGR,
        )

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

    detections: list[CropResult] = []
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
            class_name = normalize_class_name(raw_class_name)

            # Safe coordinates
            x1 = max(0, round(coordinates[0]))
            y1 = max(0, round(coordinates[1]))
            x2 = min(image_width, round(coordinates[2]))
            y2 = min(image_height, round(coordinates[3]))

            # Crop detected fruit
            padding = 8
            crop = opencv_image[y1 + padding:y2 - padding,
                                x1 + padding:x2 - padding]

            if crop.size == 0:
                continue

            # Save crop (debug purpose)
            filename = f"{class_name}_{len(detections)}.jpg"
            filepath = OUTPUT_DIR / filename

            saved = cv2.imwrite(str(filepath), crop)

            if not saved:
                continue

            detections.append(
                CropResult(
                    class_id=class_id,
                    class_name=class_name,
                    confidence=round(float(confidence), 4),
                    bounding_box=BoundingBox(
                        x1=x1,
                        y1=y1,
                        x2=x2,
                        y2=y2,
                    ),
                    crop_path=str(filepath),
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