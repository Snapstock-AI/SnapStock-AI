from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import MAX_IMAGE_SIZE_BYTES

from app.analysis.schemas import (
    AnalysisResponse,
    FruitAnalysis,
)
from app.detection.schemas import BoundingBox

from app.common.exceptions import (
    InvalidImageError,
    InvalidDetectionImageError,
)

import app.analysis.routes as analysis_routes


client = TestClient(app)


# ============================================================
# Setup
# ============================================================

@pytest.fixture(autouse=True)
def setup_models():
    """
    Give every API test fake detection and freshness models.

    Real YOLO and TensorFlow models are not loaded.
    """

    detection_model = Mock()
    freshness_model = Mock()

    app.state.detection_model = detection_model
    app.state.freshness_model = freshness_model

    yield detection_model, freshness_model

    if hasattr(app.state, "detection_model"):
        delattr(app.state, "detection_model")

    if hasattr(app.state, "freshness_model"):
        delattr(app.state, "freshness_model")


# ============================================================
# Helpers
# ============================================================

def create_analysis_response():
    return AnalysisResponse(
        image_width=640,
        image_height=480,
        total_count=2,
        counts={
            "apple": 1,
            "orange": 1,
        },
        detections=[
            FruitAnalysis(
                class_name="apple",
                confidence=0.91,
                bounding_box=BoundingBox(
                    x1=10,
                    y1=20,
                    x2=100,
                    y2=120,
                ),
                freshness="good",
                freshness_confidence=0.88,
                freshness_confidence_percent=88.0,
            ),
            FruitAnalysis(
                class_name="orange",
                confidence=0.85,
                bounding_box=BoundingBox(
                    x1=150,
                    y1=50,
                    x2=250,
                    y2=180,
                ),
                freshness="bad",
                freshness_confidence=0.79,
                freshness_confidence_percent=79.0,
            ),
        ],
    )


# ============================================================
# Successful analysis
# ============================================================

def test_analyze_success(
    monkeypatch,
    setup_models,
):
    detection_model, freshness_model = setup_models

    fake_result = create_analysis_response()

    mock_analyze = Mock(
        return_value=fake_result
    )

    monkeypatch.setattr(
        analysis_routes,
        "analyze_image",
        mock_analyze,
    )

    image_bytes = b"fake-valid-image"

    response = client.post(
        "/analyze",
        files={
            "file": (
                "fruits.jpg",
                image_bytes,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_count"] == 2

    assert data["counts"] == {
        "apple": 1,
        "orange": 1,
    }

    assert len(data["detections"]) == 2

    assert (
        data["detections"][0]["class_name"]
        == "apple"
    )

    assert (
        data["detections"][0]["freshness"]
        == "good"
    )

    assert (
        data["detections"][1]["class_name"]
        == "orange"
    )

    assert (
        data["detections"][1]["freshness"]
        == "bad"
    )

    mock_analyze.assert_called_once_with(
        detection_model,
        freshness_model,
        image_bytes,
    )


# ============================================================
# Zero detections
# ============================================================

def test_analyze_zero_detections(
    monkeypatch,
):
    fake_result = AnalysisResponse(
        image_width=640,
        image_height=480,
        total_count=0,
        counts={},
        detections=[],
    )

    monkeypatch.setattr(
        analysis_routes,
        "analyze_image",
        Mock(
            return_value=fake_result
        ),
    )

    response = client.post(
        "/analyze",
        files={
            "file": (
                "scene.jpg",
                b"fake-image",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_count"] == 0
    assert data["counts"] == {}
    assert data["detections"] == []


# ============================================================
# Unsupported MIME type
# ============================================================

def test_analyze_rejects_unsupported_file_type(
    monkeypatch,
):
    mock_analyze = Mock()

    monkeypatch.setattr(
        analysis_routes,
        "analyze_image",
        mock_analyze,
    )

    response = client.post(
        "/analyze",
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

    mock_analyze.assert_not_called()


# ============================================================
# Oversized image
# ============================================================

def test_analyze_rejects_oversized_file(
    monkeypatch,
):
    mock_analyze = Mock()

    monkeypatch.setattr(
        analysis_routes,
        "analyze_image",
        mock_analyze,
    )

    oversized_content = (
        b"x" * (MAX_IMAGE_SIZE_BYTES + 1)
    )

    response = client.post(
        "/analyze",
        files={
            "file": (
                "large.jpg",
                oversized_content,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 413

    mock_analyze.assert_not_called()


# ============================================================
# Invalid image content
# ============================================================

def test_analyze_rejects_invalid_image(
    monkeypatch,
):
    """
    MIME type is valid, but actual bytes are not
    a valid image.
    """

    mock_analyze = Mock(
        side_effect=InvalidImageError(
            "Uploaded file is not a valid image."
        )
    )

    monkeypatch.setattr(
        analysis_routes,
        "analyze_image",
        mock_analyze,
    )

    response = client.post(
        "/analyze",
        files={
            "file": (
                "fake.jpg",
                b"this-is-not-an-image",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Uploaded file is not a valid image."
    )


# ============================================================
# Detection image validation failure
# ============================================================

def test_analyze_handles_invalid_detection_image(
    monkeypatch,
):
    mock_analyze = Mock(
        side_effect=InvalidDetectionImageError(
            "The uploaded image is empty."
        )
    )

    monkeypatch.setattr(
        analysis_routes,
        "analyze_image",
        mock_analyze,
    )

    response = client.post(
        "/analyze",
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
# Internal analysis failure
# ============================================================

def test_analyze_handles_internal_failure(
    monkeypatch,
):
    mock_analyze = Mock(
        side_effect=RuntimeError(
            "Freshness model crashed"
        )
    )

    monkeypatch.setattr(
        analysis_routes,
        "analyze_image",
        mock_analyze,
    )

    response = client.post(
        "/analyze",
        files={
            "file": (
                "fruits.jpg",
                b"fake-image",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 500

    assert (
        "Freshness model crashed"
        in response.json()["detail"]
    )


# ============================================================
# Missing file
# ============================================================

def test_analyze_requires_file():
    response = client.post(
        "/analyze"
    )

    assert response.status_code == 422