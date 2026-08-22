from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import MAX_IMAGE_SIZE_BYTES
from app.common.exceptions import (
    InvalidImageError,
    InvalidDetectionImageError,
)
from app.detection.internal_models import (
    DetectedCrop,
    InternalDetectionResult,
)
from app.detection.schemas import BoundingBox

import app.detection.routes as detection_routes


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_detection_model():
    """
    Provide a fake YOLO model for every API test.
    """

    fake_model = Mock()
    app.state.detection_model = fake_model

    yield fake_model

    if hasattr(app.state, "detection_model"):
        delattr(
            app.state,
            "detection_model",
        )


def create_internal_result():
    """
    Create a fake detector result returned by detect_fruits().
    """

    crop = Mock()

    return InternalDetectionResult(
        image_width=640,
        image_height=480,
        model="test-yolo",
        detections=[
            DetectedCrop(
                class_id=0,
                class_name="apple",
                confidence=0.91,
                bounding_box=BoundingBox(
                    x1=10,
                    y1=20,
                    x2=100,
                    y2=120,
                ),
                crop=crop,
            )
        ],
    )


# ============================================================
# Successful detection
# ============================================================

def test_detect_success(
    monkeypatch,
    setup_detection_model,
):
    fake_result = create_internal_result()

    mock_detect = Mock(
        return_value=fake_result
    )

    monkeypatch.setattr(
        detection_routes,
        "detect_fruits",
        mock_detect,
    )

    image_bytes = b"fake-valid-image"

    response = client.post(
        "/detect",
        files={
            "file": (
                "apple.jpg",
                image_bytes,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["image_width"] == 640
    assert data["image_height"] == 480
    assert data["model"] == "test-yolo"

    assert len(data["detections"]) == 1

    detection = data["detections"][0]

    assert detection["class_id"] == 0
    assert detection["class_name"] == "apple"
    assert detection["confidence"] == 0.91

    assert detection["bounding_box"] == {
        "x1": 10,
        "y1": 20,
        "x2": 100,
        "y2": 120,
    }

    mock_detect.assert_called_once_with(
        setup_detection_model,
        image_bytes,
        0.30,
    )


# ============================================================
# Zero detections
# ============================================================

def test_detect_zero_results(
    monkeypatch,
):
    fake_result = InternalDetectionResult(
        image_width=640,
        image_height=480,
        model="test-yolo",
        detections=[],
    )

    monkeypatch.setattr(
        detection_routes,
        "detect_fruits",
        Mock(
            return_value=fake_result
        ),
    )

    response = client.post(
        "/detect",
        files={
            "file": (
                "empty-scene.jpg",
                b"valid-image-content",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["image_width"] == 640
    assert data["image_height"] == 480
    assert data["detections"] == []


# ============================================================
# Unsupported MIME type
# ============================================================

def test_detect_rejects_unsupported_file_type(
    monkeypatch,
):
    mock_detect = Mock()

    monkeypatch.setattr(
        detection_routes,
        "detect_fruits",
        mock_detect,
    )

    response = client.post(
        "/detect",
        files={
            "file": (
                "document.pdf",
                b"fake-pdf",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 415

    assert response.json()["detail"] == (
        "Unsupported image type. "
        "Upload JPEG, PNG or WebP."
    )

    mock_detect.assert_not_called()


# ============================================================
# Oversized image
# ============================================================

def test_detect_rejects_oversized_file(
    monkeypatch,
):
    mock_detect = Mock()

    monkeypatch.setattr(
        detection_routes,
        "detect_fruits",
        mock_detect,
    )

    oversized_content = (
        b"x" * (MAX_IMAGE_SIZE_BYTES + 1)
    )

    response = client.post(
        "/detect",
        files={
            "file": (
                "large.jpg",
                oversized_content,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 413

    mock_detect.assert_not_called()


# ============================================================
# Invalid image
# ============================================================

def test_detect_rejects_invalid_image(
    monkeypatch,
):
    mock_detect = Mock(
        side_effect=InvalidImageError(
            "Uploaded file is not a valid image."
        )
    )

    monkeypatch.setattr(
        detection_routes,
        "detect_fruits",
        mock_detect,
    )

    response = client.post(
        "/detect",
        files={
            "file": (
                "fake.jpg",
                b"not-real-image-data",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Uploaded file is not a valid image."
    )


# ============================================================
# Detection-specific invalid image
# ============================================================

def test_detect_handles_invalid_detection_image(
    monkeypatch,
):
    mock_detect = Mock(
        side_effect=InvalidDetectionImageError(
            "The uploaded image is empty."
        )
    )

    monkeypatch.setattr(
        detection_routes,
        "detect_fruits",
        mock_detect,
    )

    response = client.post(
        "/detect",
        files={
            "file": (
                "image.jpg",
                b"some-content",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "The uploaded image is empty."
    )


# ============================================================
# YOLO/internal failure
# ============================================================

def test_detect_handles_internal_failure(
    monkeypatch,
):
    mock_detect = Mock(
        side_effect=RuntimeError(
            "YOLO inference failed"
        )
    )

    monkeypatch.setattr(
        detection_routes,
        "detect_fruits",
        mock_detect,
    )

    response = client.post(
        "/detect",
        files={
            "file": (
                "apple.jpg",
                b"fake-image",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 500

    assert (
        "Object detection failed."
        in response.json()["detail"]
    )


# ============================================================
# Confidence threshold validation
# ============================================================

def test_detect_rejects_confidence_above_one():
    response = client.post(
        "/detect?confidence_threshold=1.5",
        files={
            "file": (
                "apple.jpg",
                b"fake-image",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 422


def test_detect_rejects_negative_confidence():
    response = client.post(
        "/detect?confidence_threshold=-0.1",
        files={
            "file": (
                "apple.jpg",
                b"fake-image",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 422