from unittest.mock import Mock

import numpy as np

from app.analysis.service import analyze_image
from app.analysis.schemas import (
    AnalysisResponse,
    CategorySummary,
)
from app.detection.internal_models import (
    DetectedCrop,
    InternalDetectionResult,
)
from app.detection.schemas import BoundingBox
from app.freshness.schemas import PredictionResponse


# ============================================================
# Helper functions
# ============================================================

def create_crop():
    """
    Create a fake OpenCV-style image crop.
    """
    return np.zeros(
        (50, 50, 3),
        dtype=np.uint8,
    )


def create_detected_crop(
    class_id=0,
    class_name="apple",
    confidence=0.90,
):
    """
    Create one fake detected fruit.
    """

    return DetectedCrop(
        class_id=class_id,
        class_name=class_name,
        confidence=confidence,
        bounding_box=BoundingBox(
            x1=10,
            y1=10,
            x2=60,
            y2=60,
        ),
        crop=create_crop(),
    )


def create_prediction(
    freshness="good",
    confidence=0.85,
):
    """
    Create fake freshness prediction.
    """

    return PredictionResponse(
        freshness=freshness,
        confidence=confidence,
        confidence_percent=confidence * 100,
        model="test-model",
        message="Test prediction",
    )


# ============================================================
# No detections
# ============================================================

def test_analyze_image_no_detections(
    monkeypatch,
):
    """
    If YOLO detects nothing, freshness prediction
    should never be called.
    """

    detection_model = Mock()
    freshness_model = Mock()

    fake_detection_result = InternalDetectionResult(
        image_width=640,
        image_height=480,
        model="test-yolo",
        detections=[],
    )

    mock_detect = Mock(
        return_value=fake_detection_result
    )

    mock_predict = Mock()

    monkeypatch.setattr(
        "app.analysis.service.detect_fruits",
        mock_detect,
    )

    monkeypatch.setattr(
        "app.analysis.service.predict_crop",
        mock_predict,
    )

    result = analyze_image(
        detection_model,
        freshness_model,
        b"fake-image-bytes",
    )

    assert isinstance(
        result,
        AnalysisResponse,
    )

    assert result.total_count == 0
    assert result.counts == {}
    assert result.detections == []

    mock_predict.assert_not_called()


# ============================================================
# Single detection
# ============================================================

def test_analyze_image_single_detection(
    monkeypatch,
):
    detection_model = Mock()
    freshness_model = Mock()

    detected_crop = create_detected_crop(
        class_id=0,
        class_name="apple",
        confidence=0.91,
    )

    fake_detection_result = InternalDetectionResult(
        image_width=640,
        image_height=480,
        model="test-yolo",
        detections=[
            detected_crop
        ],
    )

    mock_detect = Mock(
        return_value=fake_detection_result
    )

    mock_predict = Mock(
        return_value=create_prediction(
            freshness="good",
            confidence=0.88,
        )
    )

    monkeypatch.setattr(
        "app.analysis.service.detect_fruits",
        mock_detect,
    )

    monkeypatch.setattr(
        "app.analysis.service.predict_crop",
        mock_predict,
    )

    result = analyze_image(
        detection_model,
        freshness_model,
        b"fake-image",
    )

    assert result.total_count == 1

    assert result.counts == {
        "apple": CategorySummary(
            fresh=1,
            rotten=0,
            total=1,
        )
    }

    assert len(result.detections) == 1

    fruit = result.detections[0]

    assert fruit.class_name == "apple"
    assert fruit.confidence == 0.91

    assert fruit.freshness == "good"

    assert (
        fruit.freshness_confidence
        == 0.88
    )

    assert (
        fruit.freshness_confidence_percent
        == 88.0
    )


# ============================================================
# Multiple detections
# ============================================================

def test_analyze_image_multiple_detections(
    monkeypatch,
):
    detection_model = Mock()
    freshness_model = Mock()

    detection_result = InternalDetectionResult(
        image_width=640,
        image_height=480,
        model="test-yolo",
        detections=[
            create_detected_crop(
                class_id=0,
                class_name="apple",
                confidence=0.90,
            ),
            create_detected_crop(
                class_id=0,
                class_name="apple",
                confidence=0.85,
            ),
            create_detected_crop(
                class_id=1,
                class_name="orange",
                confidence=0.80,
            ),
        ],
    )

    mock_detect = Mock(
        return_value=detection_result
    )

    mock_predict = Mock(
        side_effect=[
            create_prediction(
                "good",
                0.90,
            ),
            create_prediction(
                "bad",
                0.80,
            ),
            create_prediction(
                "good",
                0.70,
            ),
        ]
    )

    monkeypatch.setattr(
        "app.analysis.service.detect_fruits",
        mock_detect,
    )

    monkeypatch.setattr(
        "app.analysis.service.predict_crop",
        mock_predict,
    )

    result = analyze_image(
        detection_model,
        freshness_model,
        b"fake-image",
    )

    assert result.total_count == 3

    assert result.counts == {
        "apple": CategorySummary(
            fresh=1,
            rotten=1,
            total=2,
        ),
        "orange": CategorySummary(
            fresh=1,
            rotten=0,
            total=1,
        ),
    }

    assert len(result.detections) == 3

    assert (
        result.detections[0].freshness
        == "good"
    )

    assert (
        result.detections[1].freshness
        == "bad"
    )

    assert (
        result.detections[2].freshness
        == "good"
    )

    assert mock_predict.call_count == 3


# ============================================================
# Single category, mixed freshness
# ============================================================

def test_analyze_image_single_category_mixed_freshness(
    monkeypatch,
):
    """
    One fruit category should still be split into
    fresh and rotten counts.
    """

    detection_model = Mock()
    freshness_model = Mock()

    detection_result = InternalDetectionResult(
        image_width=640,
        image_height=480,
        model="test-yolo",
        detections=[
            create_detected_crop(
                class_name="banana",
            )
            for _ in range(4)
        ],
    )

    mock_detect = Mock(
        return_value=detection_result
    )

    mock_predict = Mock(
        side_effect=[
            create_prediction("good"),
            create_prediction("bad"),
            create_prediction("good"),
            create_prediction("good"),
        ]
    )

    monkeypatch.setattr(
        "app.analysis.service.detect_fruits",
        mock_detect,
    )

    monkeypatch.setattr(
        "app.analysis.service.predict_crop",
        mock_predict,
    )

    result = analyze_image(
        detection_model,
        freshness_model,
        b"fake-image",
    )

    assert result.total_count == 4

    assert result.counts == {
        "banana": CategorySummary(
            fresh=3,
            rotten=1,
            total=4,
        )
    }


# ============================================================
# Verify crops are passed correctly
# ============================================================

def test_analyze_image_passes_crop_to_predictor(
    monkeypatch,
):
    detection_model = Mock()
    freshness_model = Mock()

    crop = create_crop()

    detected_crop = DetectedCrop(
        class_id=0,
        class_name="apple",
        confidence=0.90,
        bounding_box=BoundingBox(
            x1=0,
            y1=0,
            x2=50,
            y2=50,
        ),
        crop=crop,
    )

    detection_result = InternalDetectionResult(
        image_width=100,
        image_height=100,
        model="test-yolo",
        detections=[
            detected_crop
        ],
    )

    mock_detect = Mock(
        return_value=detection_result
    )

    mock_predict = Mock(
        return_value=create_prediction()
    )

    monkeypatch.setattr(
        "app.analysis.service.detect_fruits",
        mock_detect,
    )

    monkeypatch.setattr(
        "app.analysis.service.predict_crop",
        mock_predict,
    )

    analyze_image(
        detection_model,
        freshness_model,
        b"fake-image",
    )

    mock_predict.assert_called_once()

    args = mock_predict.call_args.args

    assert args[0] is freshness_model

    assert args[1] is crop


# ============================================================
# Detection failure
# ============================================================

def test_analyze_image_detection_failure(
    monkeypatch,
):
    """
    If detection fails, analysis should stop.
    Freshness model must not be called.
    """

    detection_model = Mock()
    freshness_model = Mock()

    mock_detect = Mock(
        side_effect=RuntimeError(
            "YOLO failed"
        )
    )

    mock_predict = Mock()

    monkeypatch.setattr(
        "app.analysis.service.detect_fruits",
        mock_detect,
    )

    monkeypatch.setattr(
        "app.analysis.service.predict_crop",
        mock_predict,
    )

    import pytest

    with pytest.raises(
        RuntimeError,
        match="YOLO failed",
    ):
        analyze_image(
            detection_model,
            freshness_model,
            b"fake-image",
        )

    mock_predict.assert_not_called()


def test_analyze_image_freshness_failure(
    monkeypatch,
):
    """
    If freshness prediction fails,
    analysis should propagate the failure.
    """

    detection_model = Mock()
    freshness_model = Mock()

    detection_result = InternalDetectionResult(
        image_width=100,
        image_height=100,
        model="test-yolo",
        detections=[
            create_detected_crop()
        ],
    )

    mock_detect = Mock(
        return_value=detection_result
    )

    mock_predict = Mock(
        side_effect=RuntimeError(
            "Freshness prediction failed"
        )
    )

    monkeypatch.setattr(
        "app.analysis.service.detect_fruits",
        mock_detect,
    )

    monkeypatch.setattr(
        "app.analysis.service.predict_crop",
        mock_predict,
    )

    import pytest

    with pytest.raises(
        RuntimeError,
        match="Freshness prediction failed",
    ):
        analyze_image(
            detection_model,
            freshness_model,
            b"fake-image",
        )