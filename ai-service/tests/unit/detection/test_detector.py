from io import BytesIO
from unittest.mock import Mock

import numpy as np
import pytest
from PIL import Image

from app.common.exceptions import (
    InvalidDetectionImageError,
    InvalidImageError,
)
from app.config import (
    DETECTION_MODEL_NAME,
    YOLO_AGNOSTIC_NMS,
    YOLO_IMAGE_SIZE,
    YOLO_IOU_THRESHOLD,
)
from app.detection.detector import (
    detect_fruits,
    normalize_class_name,
)
from app.detection.internal_models import (
    InternalDetectionResult,
)


# ============================================================
# Helpers
# ============================================================

def create_test_image_bytes(
    width: int = 100,
    height: int = 100,
) -> bytes:
    """
    Create a valid test image with visual variation.
    """

    image_array = np.zeros(
        (height, width, 3),
        dtype=np.uint8,
    )

    image_array[: height // 2] = [255, 0, 0]
    image_array[height // 2 :] = [0, 255, 0]

    image = Image.fromarray(image_array)

    buffer = BytesIO()
    image.save(buffer, format="JPEG")

    return buffer.getvalue()


def create_mock_yolo_result(
    coordinates,
    confidences,
    class_ids,
    names,
):
    """
    Create a fake Ultralytics YOLO result.
    """

    boxes = Mock()

    # detector.py calls:
    # boxes = result.boxes.cpu()
    boxes.cpu.return_value = boxes

    boxes.xyxy = np.array(
        coordinates,
        dtype=np.float32,
    )

    boxes.conf = np.array(
        confidences,
        dtype=np.float32,
    )

    boxes.cls = np.array(
        class_ids,
        dtype=np.float32,
    )

    result = Mock()
    result.boxes = boxes
    result.names = names

    return result


# ============================================================
# normalize_class_name()
# ============================================================

def test_normalize_class_name_simple():
    result = normalize_class_name("Apple")

    assert result == "apple"


def test_normalize_class_name_removes_whitespace():
    result = normalize_class_name("   Orange   ")

    assert result == "orange"


def test_normalize_class_name_uses_primary_name():
    result = normalize_class_name(
        "Apple/Fruit"
    )

    assert result == "apple"


def test_normalize_class_name_lowercases_name():
    result = normalize_class_name(
        "BANANA"
    )

    assert result == "banana"


# ============================================================
# Invalid input
# ============================================================

def test_detect_fruits_empty_bytes():
    model = Mock()

    with pytest.raises(
        InvalidDetectionImageError,
        match="uploaded image is empty",
    ):
        detect_fruits(
            model=model,
            image_bytes=b"",
            confidence_threshold=0.30,
        )

    model.predict.assert_not_called()


def test_detect_fruits_invalid_image_bytes():
    """
    A corrupted/non-image upload should be rejected
    as an invalid detection image.
    """

    model = Mock()

    invalid_bytes = (
        b"this is definitely not an image"
    )

    with pytest.raises(
        InvalidImageError,
    ):
        detect_fruits(
            model=model,
            image_bytes=invalid_bytes,
            confidence_threshold=0.30,
        )

    model.predict.assert_not_called()


# ============================================================
# YOLO inference
# ============================================================

def test_detect_fruits_calls_yolo_correctly():
    model = Mock()

    result = Mock()
    result.boxes = None

    model.predict.return_value = [result]

    image_bytes = create_test_image_bytes()

    detect_fruits(
        model=model,
        image_bytes=image_bytes,
        confidence_threshold=0.40,
    )

    model.predict.assert_called_once()

    call_kwargs = model.predict.call_args.kwargs

    assert call_kwargs["conf"] == 0.40
    assert call_kwargs["iou"] == YOLO_IOU_THRESHOLD
    assert call_kwargs["imgsz"] == YOLO_IMAGE_SIZE
    assert (
        call_kwargs["agnostic_nms"]
        == YOLO_AGNOSTIC_NMS
    )
    assert call_kwargs["verbose"] is False


# ============================================================
# Successful detections
# ============================================================

def test_detect_single_fruit():
    model = Mock()

    yolo_result = create_mock_yolo_result(
        coordinates=[
            [10, 10, 90, 90],
        ],
        confidences=[
            0.87654,
        ],
        class_ids=[
            0,
        ],
        names={
            0: "Apple/Fruit",
        },
    )

    model.predict.return_value = [
        yolo_result
    ]

    image_bytes = create_test_image_bytes()

    result = detect_fruits(
        model=model,
        image_bytes=image_bytes,
        confidence_threshold=0.30,
    )

    assert isinstance(
        result,
        InternalDetectionResult,
    )

    assert result.image_width == 100
    assert result.image_height == 100

    assert result.model == DETECTION_MODEL_NAME

    assert len(result.detections) == 1

    detection = result.detections[0]

    assert detection.class_id == 0
    assert detection.class_name == "apple"

    assert detection.confidence == pytest.approx(
        0.8765
    )

    assert detection.bounding_box.x1 == 10
    assert detection.bounding_box.y1 == 10
    assert detection.bounding_box.x2 == 90
    assert detection.bounding_box.y2 == 90

    assert isinstance(
        detection.crop,
        np.ndarray,
    )

    assert detection.crop.size > 0


def test_detect_multiple_fruits():
    model = Mock()

    yolo_result = create_mock_yolo_result(
        coordinates=[
            [10, 10, 50, 50],
            [50, 50, 95, 95],
        ],
        confidences=[
            0.91,
            0.82,
        ],
        class_ids=[
            0,
            1,
        ],
        names={
            0: "Apple/Fruit",
            1: "Orange/Fruit",
        },
    )

    model.predict.return_value = [
        yolo_result
    ]

    result = detect_fruits(
        model=model,
        image_bytes=create_test_image_bytes(),
        confidence_threshold=0.30,
    )

    assert len(result.detections) == 2

    assert (
        result.detections[0].class_name
        == "apple"
    )

    assert (
        result.detections[1].class_name
        == "orange"
    )


# ============================================================
# Bounding-box edge cases
# ============================================================

def test_coordinates_are_clipped_to_image():
    model = Mock()

    yolo_result = create_mock_yolo_result(
        coordinates=[
            [-20, -10, 120, 130],
        ],
        confidences=[
            0.90,
        ],
        class_ids=[
            0,
        ],
        names={
            0: "Apple",
        },
    )

    model.predict.return_value = [
        yolo_result
    ]

    result = detect_fruits(
        model=model,
        image_bytes=create_test_image_bytes(),
        confidence_threshold=0.30,
    )

    assert len(result.detections) == 1

    box = result.detections[0].bounding_box

    assert box.x1 == 0
    assert box.y1 == 0

    assert box.x2 == 100
    assert box.y2 == 100


def test_tiny_bounding_box_is_skipped():
    """
    Detector applies 8 pixels of padding.

    A very small bounding box can therefore produce
    an empty crop and should be skipped.
    """

    model = Mock()

    yolo_result = create_mock_yolo_result(
        coordinates=[
            [10, 10, 20, 20],
        ],
        confidences=[
            0.95,
        ],
        class_ids=[
            0,
        ],
        names={
            0: "Apple",
        },
    )

    model.predict.return_value = [
        yolo_result
    ]

    result = detect_fruits(
        model=model,
        image_bytes=create_test_image_bytes(),
        confidence_threshold=0.30,
    )

    assert len(result.detections) == 0


# ============================================================
# No detection cases
# ============================================================

def test_result_with_no_boxes():
    model = Mock()

    yolo_result = Mock()
    yolo_result.boxes = None

    model.predict.return_value = [
        yolo_result
    ]

    result = detect_fruits(
        model=model,
        image_bytes=create_test_image_bytes(),
        confidence_threshold=0.30,
    )

    assert isinstance(
        result,
        InternalDetectionResult,
    )

    assert result.detections == []


def test_yolo_returns_no_results():
    """
    When YOLO returns an empty result list,
    detect_fruits should still return the same
    InternalDetectionResult type.
    """

    model = Mock()

    model.predict.return_value = []

    result = detect_fruits(
        model=model,
        image_bytes=create_test_image_bytes(),
        confidence_threshold=0.30,
    )

    assert isinstance(
        result,
        InternalDetectionResult,
    )

    assert result.image_width == 100
    assert result.image_height == 100

    assert result.detections == []


# ============================================================
# YOLO failure
# ============================================================

def test_yolo_prediction_failure():
    model = Mock()

    model.predict.side_effect = RuntimeError(
        "YOLO inference failed"
    )

    with pytest.raises(
        RuntimeError,
        match="YOLO inference failed",
    ):
        detect_fruits(
            model=model,
            image_bytes=create_test_image_bytes(),
            confidence_threshold=0.30,
        )