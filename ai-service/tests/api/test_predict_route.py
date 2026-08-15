from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import MAX_IMAGE_SIZE_BYTES
from app.common.exceptions import (
    InvalidImageError,
    PredictionError,
)
from app.freshness.schemas import PredictionResponse

import app.freshness.routes as freshness_routes


client = TestClient(app)


# ============================================================
# Test setup
# ============================================================

@pytest.fixture(autouse=True)
def setup_freshness_model():
    """
    Give every test a fake freshness model.

    We do not load the real TensorFlow model during
    API route testing.
    """

    fake_model = Mock()

    app.state.freshness_model = fake_model

    yield fake_model

    if hasattr(app.state, "freshness_model"):
        delattr(
            app.state,
            "freshness_model"
        )


# ============================================================
# Successful request
# ============================================================

def test_predict_success(
    monkeypatch,
    setup_freshness_model,
):
    image_bytes = b"fake-valid-image-bytes"

    fake_prediction = PredictionResponse(
        freshness="good",
        confidence=0.90,
        confidence_percent=90.0,
        model="test-model",
        message="The item is good.",
    )

    mock_predict = Mock(
        return_value=fake_prediction
    )

    monkeypatch.setattr(
        freshness_routes,
        "predict",
        mock_predict,
    )

    response = client.post(
        "/predict",
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

    assert data["freshness"] == "good"
    assert data["confidence"] == 0.90
    assert data["confidence_percent"] == 90.0
    assert data["model"] == "test-model"
    assert data["message"] == "The item is good."

    mock_predict.assert_called_once_with(
        setup_freshness_model,
        image_bytes,
    )


# ============================================================
# Unsupported file type
# ============================================================

def test_predict_rejects_unsupported_file_type(
    monkeypatch,
):
    mock_predict = Mock()

    monkeypatch.setattr(
        freshness_routes,
        "predict",
        mock_predict,
    )

    response = client.post(
        "/predict",
        files={
            "file": (
                "document.pdf",
                b"fake-pdf-content",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 415

    assert response.json()["detail"] == (
        "Unsupported file type. "
        "Please upload JPEG, PNG, or WEBP image."
    )

    mock_predict.assert_not_called()


# ============================================================
# Empty upload
# ============================================================

def test_predict_rejects_empty_file(
    monkeypatch,
):
    mock_predict = Mock()

    monkeypatch.setattr(
        freshness_routes,
        "predict",
        mock_predict,
    )

    response = client.post(
        "/predict",
        files={
            "file": (
                "empty.jpg",
                b"",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Uploaded file is empty."
    )

    mock_predict.assert_not_called()


# ============================================================
# Oversized upload
# ============================================================

def test_predict_rejects_oversized_file(
    monkeypatch,
):
    mock_predict = Mock()

    monkeypatch.setattr(
        freshness_routes,
        "predict",
        mock_predict,
    )

    oversized_content = (
        b"x" * (MAX_IMAGE_SIZE_BYTES + 1)
    )

    response = client.post(
        "/predict",
        files={
            "file": (
                "large.jpg",
                oversized_content,
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 413

    assert response.json()["detail"] == (
        "Image file is too large."
    )

    mock_predict.assert_not_called()


# ============================================================
# Corrupted/invalid image
# ============================================================

def test_predict_rejects_invalid_image(
    monkeypatch,
):
    mock_predict = Mock(
        side_effect=InvalidImageError(
            "Uploaded file is not a valid image."
        )
    )

    monkeypatch.setattr(
        freshness_routes,
        "predict",
        mock_predict,
    )

    response = client.post(
        "/predict",
        files={
            "file": (
                "fake.jpg",
                b"this is not actually an image",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Uploaded file is not a valid image."
    )

    mock_predict.assert_called_once()


# ============================================================
# Model/prediction failure
# ============================================================

def test_predict_handles_prediction_error(
    monkeypatch,
):
    mock_predict = Mock(
        side_effect=PredictionError(
            "TensorFlow model prediction failed."
        )
    )

    monkeypatch.setattr(
        freshness_routes,
        "predict",
        mock_predict,
    )

    response = client.post(
        "/predict",
        files={
            "file": (
                "apple.jpg",
                b"fake-image-content",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 500

    assert response.json()["detail"] == (
        "TensorFlow model prediction failed."
    )

    mock_predict.assert_called_once()