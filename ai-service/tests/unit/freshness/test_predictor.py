from unittest.mock import Mock

import numpy as np
import pytest
from PIL import Image

from app.common.exceptions import (
    InvalidImageError,
    PredictionError,
)
from app.config import (
    MODEL_NAME,
    NEGATIVE_CLASS_LABEL,
    POSITIVE_CLASS_LABEL,
    PREDICTION_THRESHOLD,
)
from app.freshness.predictor import (
    predict,
    _build_prediction_result,
    _predict_probability,
    predict_crop,
)
from app.common.image_utils import image_to_bytes

def create_test_image() -> Image.Image:
    """
    Create an image containing enough visual variation
    to pass image-content validation.
    """
    image_array = np.zeros(
        (100, 100, 3),
        dtype=np.uint8,
    )

    image_array[:50] = 0
    image_array[50:] = 255

    return Image.fromarray(image_array)


def test_build_prediction_result_positive_class():
    result = _build_prediction_result(0.80)

    assert result.freshness == POSITIVE_CLASS_LABEL
    assert result.confidence == pytest.approx(0.80)
    assert result.confidence_percent == 80.0
    assert result.model == MODEL_NAME


def test_build_prediction_result_negative_class():
    result = _build_prediction_result(0.20)

    assert result.freshness == NEGATIVE_CLASS_LABEL
    assert result.confidence == pytest.approx(0.80)
    assert result.confidence_percent == 80.0
    assert result.model == MODEL_NAME


def test_build_prediction_result_exact_threshold():
    result = _build_prediction_result(
        PREDICTION_THRESHOLD
    )

    assert result.freshness == POSITIVE_CLASS_LABEL


def test_build_prediction_result_just_below_threshold():
    probability = PREDICTION_THRESHOLD - 0.0001

    result = _build_prediction_result(probability)

    assert result.freshness == NEGATIVE_CLASS_LABEL


def test_build_prediction_result_just_above_threshold():
    probability = PREDICTION_THRESHOLD + 0.0001

    result = _build_prediction_result(probability)

    assert result.freshness == POSITIVE_CLASS_LABEL


def test_predict_probability_returns_model_probability():
    model = Mock()

    model.predict.return_value = np.array(
        [[0.75]],
        dtype=np.float32,
    )

    image = create_test_image()

    probability = _predict_probability(
        model,
        image,
    )

    assert probability == pytest.approx(0.75)

    model.predict.assert_called_once()


def test_predict_probability_model_failure():
    model = Mock()

    model.predict.side_effect = RuntimeError(
        "Model crashed"
    )

    image = create_test_image()

    with pytest.raises(
        PredictionError,
        match="TensorFlow model prediction failed",
    ):
        _predict_probability(
            model,
            image,
        )


def test_predict_probability_invalid_output_shape():
    model = Mock()

    # Expected shape is similar to [[0.8]].
    # This malformed output contains only one dimension.
    model.predict.return_value = np.array(
        [0.8],
        dtype=np.float32,
    )

    image = create_test_image()

    with pytest.raises(
        PredictionError,
        match="Unexpected model output shape",
    ):
        _predict_probability(
            model,
            image,
        )


def test_predict_crop_none_raises_error():
    model = Mock()

    with pytest.raises(
        InvalidImageError,
        match="Empty crop received",
    ):
        predict_crop(
            model,
            None,
        )


def test_predict_crop_empty_array_raises_error():
    model = Mock()

    empty_crop = np.array(
        [],
        dtype=np.uint8,
    )

    with pytest.raises(
        InvalidImageError,
        match="Empty crop received",
    ):
        predict_crop(
            model,
            empty_crop,
        )

def test_predict_success():
    model = Mock()

    model.predict.return_value = np.array(
        [[0.80]],
        dtype=np.float32,
    )

    image = create_test_image()
    image_bytes = image_to_bytes(
        image,
        "JPEG",
    )

    result = predict(
        model,
        image_bytes,
    )

    assert result.freshness == POSITIVE_CLASS_LABEL

    assert result.confidence == pytest.approx(
        0.80,
        abs=0.01,
    )

    assert result.model == MODEL_NAME

    model.predict.assert_called_once()

def test_predict_crop_success():
    model = Mock()

    model.predict.return_value = np.array(
        [[0.75]],
        dtype=np.float32,
    )

    # OpenCV-style BGR crop with visual variation
    crop = np.zeros(
        (100, 100, 3),
        dtype=np.uint8,
    )

    crop[:50] = [0, 0, 255]
    crop[50:] = [0, 255, 0]

    result = predict_crop(
        model,
        crop,
    )

    assert result.freshness == POSITIVE_CLASS_LABEL

    assert result.confidence == pytest.approx(
        0.75,
        abs=0.01,
    )

    assert result.model == MODEL_NAME

    model.predict.assert_called_once()