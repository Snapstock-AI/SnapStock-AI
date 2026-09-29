"""
Contract between the AI service's /analyze response and the backend.

contracts/analyze-response.sample.json is the agreed example response. This suite
checks it against the service's own AnalysisResponse model and checks that /analyze
really returns that shape. server/tests/unit/detection/ai-contract.test.ts checks the
same file from the backend side, so renaming a field on either side fails a suite.
"""
import json
from pathlib import Path
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

import app.analysis.routes as analysis_routes
from app.analysis.schemas import AnalysisResponse, FruitAnalysis
from app.config import NEGATIVE_CLASS_LABEL, POSITIVE_CLASS_LABEL
from app.main import app

SAMPLE_PATH = Path(__file__).resolve().parents[3] / "contracts" / "analyze-response.sample.json"

# Fields the backend reads (server/src/modules/detection/detection.types.ts).
BACKEND_TOP_LEVEL_FIELDS = {"image_width", "image_height", "total_count", "counts", "detections"}
BACKEND_DETECTION_FIELDS = {
    "class_name",
    "confidence",
    "bounding_box",
    "freshness",
    "freshness_confidence",
    "freshness_confidence_percent",
}
# Labels the backend maps to Fresh / Medium / Spoiled.
BACKEND_FRESHNESS_LABELS = {"good", "fresh", "medium", "ripe", "bad", "spoiled", "rotten"}

client = TestClient(app)


@pytest.fixture
def sample():
    return json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))


@pytest.fixture(autouse=True)
def fake_models():
    app.state.detection_model = Mock()
    app.state.freshness_model = Mock()
    yield
    for name in ("detection_model", "freshness_model"):
        if hasattr(app.state, name):
            delattr(app.state, name)


def test_sample_is_a_valid_analysis_response(sample):
    AnalysisResponse.model_validate(sample)


def test_response_model_provides_every_field_the_backend_reads():
    assert BACKEND_TOP_LEVEL_FIELDS <= set(AnalysisResponse.model_fields)
    assert BACKEND_DETECTION_FIELDS <= set(FruitAnalysis.model_fields)


def test_model_freshness_labels_are_understood_by_the_backend():
    assert POSITIVE_CLASS_LABEL.lower() in BACKEND_FRESHNESS_LABELS
    assert NEGATIVE_CLASS_LABEL.lower() in BACKEND_FRESHNESS_LABELS


def test_sample_is_internally_consistent(sample):
    assert sample["total_count"] == len(sample["detections"])
    for summary in sample["counts"].values():
        assert summary["total"] == summary["fresh"] + summary["rotten"]
    for detection in sample["detections"]:
        assert 0 <= detection["confidence"] <= 1
        assert 0 <= detection["freshness_confidence"] <= 1
        assert detection["freshness_confidence_percent"] == pytest.approx(
            detection["freshness_confidence"] * 100
        )
        assert detection["freshness"].lower() in BACKEND_FRESHNESS_LABELS


def test_analyze_endpoint_returns_the_contract_shape(monkeypatch, sample):
    monkeypatch.setattr(
        analysis_routes,
        "analyze_image",
        Mock(return_value=AnalysisResponse.model_validate(sample)),
    )

    response = client.post(
        "/analyze",
        files={"file": ("shelf.jpg", b"\xff\xd8\xff\xe0fake-image", "image/jpeg")},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == BACKEND_TOP_LEVEL_FIELDS
    for detection in body["detections"]:
        assert BACKEND_DETECTION_FIELDS <= set(detection)
        assert set(detection["bounding_box"]) == {"x1", "y1", "x2", "y2"}
    assert body == AnalysisResponse.model_validate(sample).model_dump(mode="json")
