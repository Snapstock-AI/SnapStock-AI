"""
Model-not-loaded behaviour of the AI service.

SRS: FR-HEALTH-001/002 (health reflects model state; failures are controlled),
NFR-REL-001. The backend maps an unreachable or 503 AI service to AI_UNAVAILABLE,
so /analyze must answer 503 with a plain message when models are absent instead of
a 500 that leaks an AttributeError.
"""
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 32


@pytest.fixture(autouse=True)
def no_models():
    saved = {
        name: getattr(app.state, name)
        for name in ("detection_model", "freshness_model")
        if hasattr(app.state, name)
    }
    for name in saved:
        delattr(app.state, name)
    yield
    for name, value in saved.items():
        setattr(app.state, name, value)


def _post_image():
    return client.post("/analyze", files={"file": ("shelf.jpg", JPEG, "image/jpeg")})


def test_analyze_answers_503_when_no_model_is_loaded():
    response = _post_image()

    assert response.status_code == 503
    assert "not loaded" in response.json()["detail"].lower()


def test_analyze_503_does_not_leak_python_internals():
    detail = _post_image().json()["detail"]

    assert "AttributeError" not in detail
    assert "State" not in detail
    assert "object has no attribute" not in detail


def test_analyze_answers_503_when_only_the_detection_model_is_loaded():
    app.state.detection_model = Mock()

    assert _post_image().status_code == 503


def test_health_reports_missing_models_instead_of_failing():
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["detection_model_loaded"] is False
    assert body["freshness_model_loaded"] is False


def test_bad_upload_is_still_rejected_with_a_client_error_when_models_are_missing():
    response = client.post("/analyze", files={"file": ("notes.txt", b"hello", "text/plain")})

    assert response.status_code == 415
