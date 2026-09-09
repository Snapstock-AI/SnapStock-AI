from unittest.mock import Mock

import numpy as np
import pytest
from PIL import Image

from app.common.exceptions import (
    InvalidImageError,
    PredictionError,
)
from app.config import (
    IMAGE_SIZE,
    MODEL_NAME,
    NEGATIVE_CLASS_LABEL,
    POSITIVE_CLASS_LABEL,
    PREDICTION_THRESHOLD,
)
from app.freshness import predictor as predictor_module
from app.freshness.predictor import (
    predict,
    _build_prediction_result,
    _generate_gradcam,
    _get_gradcam,
    _predict_probability,
    predict_crop,
)
from app.common.image_utils import image_to_bytes


@pytest.fixture(autouse=True)
def clear_gradcam_cache():
    """
    The Grad-CAM object is cached per model, so it must not leak
    between tests.
    """

    _get_gradcam.cache_clear()

    yield

    _get_gradcam.cache_clear()


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

    probability, processed_image = _predict_probability(
        model,
        image,
    )

    assert probability == pytest.approx(0.75)

    # The preprocessed batch is returned alongside the probability so
    # Grad-CAM can reuse it instead of preprocessing the image twice.
    assert processed_image.shape == (1, *IMAGE_SIZE, 3)

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


# ============================================================
# Grad-CAM explanation
# ============================================================

def create_processed_image() -> np.ndarray:
    """
    Batched, preprocessed image as _predict_probability returns it.
    """

    return np.zeros(
        (1, *IMAGE_SIZE, 3),
        dtype=np.float32,
    )


def install_fake_gradcam(
    monkeypatch,
    heatmap_path="temp/gradcam/fake.jpg",
):
    """
    Replace the Grad-CAM pipeline with mocks and return them.
    """

    gradcam = Mock()

    gradcam.generate.return_value = np.zeros(
        (7, 7),
        dtype=np.float32,
    )

    gradcam_class = Mock(
        return_value=gradcam
    )

    save_heatmap = Mock(
        return_value=heatmap_path
    )

    monkeypatch.setattr(
        predictor_module,
        "GradCAM",
        gradcam_class,
    )

    monkeypatch.setattr(
        predictor_module,
        "save_heatmap",
        save_heatmap,
    )

    return gradcam, save_heatmap


def test_generate_gradcam_returns_saved_heatmap_path(monkeypatch):
    gradcam, save_heatmap = install_fake_gradcam(monkeypatch)

    processed_image = create_processed_image()

    path = _generate_gradcam(
        Mock(),
        processed_image,
        0.80,
    )

    assert path == "temp/gradcam/fake.jpg"

    # The already batched image goes to Grad-CAM, while the overlay is
    # drawn on the single image inside that batch.
    generate_args = gradcam.generate.call_args.args

    assert generate_args[0] is processed_image

    assert save_heatmap.call_args.args[0].shape == (
        *IMAGE_SIZE,
        3,
    )


@pytest.mark.parametrize(
    "probability, expected_class_id",
    [
        (0.90, 1),
        (0.50, 1),
        (0.49, 0),
        (0.10, 0),
    ],
)
def test_generate_gradcam_selects_predicted_class(
    monkeypatch,
    probability,
    expected_class_id,
):
    """
    The heatmap must explain the class the model actually predicted.
    """

    gradcam, _ = install_fake_gradcam(monkeypatch)

    _generate_gradcam(
        Mock(),
        create_processed_image(),
        probability,
    )

    assert gradcam.generate.call_args.args[1] == expected_class_id


def test_generate_gradcam_failure_returns_none(monkeypatch, caplog):
    """
    Explainability is optional: a failed heatmap must not cost the
    caller their prediction.
    """

    monkeypatch.setattr(
        predictor_module,
        "GradCAM",
        Mock(side_effect=RuntimeError("no such layer")),
    )

    with caplog.at_level("WARNING"):
        path = _generate_gradcam(
            Mock(),
            create_processed_image(),
            0.80,
        )

    assert path is None

    assert "Grad-CAM generation failed" in caplog.text


def test_get_gradcam_is_cached_per_model(monkeypatch):
    """
    Building the Grad-CAM graph is expensive, so it must happen once.
    """

    gradcam_class = Mock(
        side_effect=lambda model: Mock()
    )

    monkeypatch.setattr(
        predictor_module,
        "GradCAM",
        gradcam_class,
    )

    model = Mock()

    first = _get_gradcam(model)
    second = _get_gradcam(model)

    assert first is second

    gradcam_class.assert_called_once_with(model)


def test_predict_returns_heatmap_path_as_explanation(monkeypatch):
    _, _ = install_fake_gradcam(monkeypatch)

    model = Mock()

    model.predict.return_value = np.array(
        [[0.80]],
        dtype=np.float32,
    )

    result = predict(
        model,
        image_to_bytes(create_test_image(), "JPEG"),
    )

    assert result.explanation == "temp/gradcam/fake.jpg"


def test_predict_crop_returns_heatmap_path_as_explanation(monkeypatch):
    install_fake_gradcam(monkeypatch)

    model = Mock()

    model.predict.return_value = np.array(
        [[0.30]],
        dtype=np.float32,
    )

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

    assert result.freshness == NEGATIVE_CLASS_LABEL

    assert result.explanation == "temp/gradcam/fake.jpg"


def test_predict_still_succeeds_when_gradcam_fails(monkeypatch):
    monkeypatch.setattr(
        predictor_module,
        "GradCAM",
        Mock(side_effect=RuntimeError("Grad-CAM exploded")),
    )

    model = Mock()

    model.predict.return_value = np.array(
        [[0.80]],
        dtype=np.float32,
    )

    result = predict(
        model,
        image_to_bytes(create_test_image(), "JPEG"),
    )

    assert result.freshness == POSITIVE_CLASS_LABEL

    assert result.explanation is None