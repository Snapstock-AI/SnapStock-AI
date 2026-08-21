from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_model_state():
    """
    Ensure every test starts without model state.

    This prevents one test from affecting another.
    """

    if hasattr(app.state, "detection_model"):
        delattr(
            app.state,
            "detection_model"
        )

    if hasattr(app.state, "freshness_model"):
        delattr(
            app.state,
            "freshness_model"
        )

    yield

    if hasattr(app.state, "detection_model"):
        delattr(
            app.state,
            "detection_model"
        )

    if hasattr(app.state, "freshness_model"):
        delattr(
            app.state,
            "freshness_model"
        )


def test_health_returns_200():
    response = client.get("/health")

    assert response.status_code == 200


def test_health_response_structure():
    response = client.get("/health")

    data = response.json()

    assert "status" in data
    assert "detection_model_loaded" in data
    assert "freshness_model_loaded" in data

    assert data["status"] == "running"

    assert isinstance(
        data["detection_model_loaded"],
        bool,
    )

    assert isinstance(
        data["freshness_model_loaded"],
        bool,
    )


def test_health_when_no_models_loaded():
    response = client.get("/health")

    data = response.json()

    assert data["status"] == "running"

    assert (
        data["detection_model_loaded"]
        is False
    )

    assert (
        data["freshness_model_loaded"]
        is False
    )


def test_health_when_only_detection_model_loaded():
    app.state.detection_model = Mock()

    response = client.get("/health")

    data = response.json()

    assert (
        data["detection_model_loaded"]
        is True
    )

    assert (
        data["freshness_model_loaded"]
        is False
    )


def test_health_when_only_freshness_model_loaded():
    app.state.freshness_model = Mock()

    response = client.get("/health")

    data = response.json()

    assert (
        data["detection_model_loaded"]
        is False
    )

    assert (
        data["freshness_model_loaded"]
        is True
    )


def test_health_when_both_models_loaded():
    app.state.detection_model = Mock()
    app.state.freshness_model = Mock()

    response = client.get("/health")

    data = response.json()

    assert data["status"] == "running"

    assert (
        data["detection_model_loaded"]
        is True
    )

    assert (
        data["freshness_model_loaded"]
        is True
    )