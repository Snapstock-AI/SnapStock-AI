from io import BytesIO
from typing import Any

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

from app.config import (
    IMAGE_SIZE,
    MODEL_NAME,
    NEGATIVE_CLASS_LABEL,
    POSITIVE_CLASS_LABEL,
    PREDICTION_THRESHOLD,
    PREPROCESSING_MODE,
)


class InvalidImageError(Exception):
    """Raised when the uploaded file is not a valid image."""


class PredictionError(Exception):
    """Raised when prediction fails."""


def validate_image_content(image: Image.Image) -> None:
    """
    Reject images that are technically valid but visually useless.
    """

    image_array = np.array(image).astype("float32")

    pixel_std = float(np.std(image_array))

    if pixel_std < 10.0:
        raise InvalidImageError(
            "Image does not contain enough visual information for prediction."
        )


def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """
    Convert uploaded image bytes into a PIL RGB image.
    """

    try:
        image = Image.open(BytesIO(image_bytes))
        return image.convert("RGB")

    except UnidentifiedImageError as exc:
        raise InvalidImageError(
            "Uploaded file is not a valid image."
        ) from exc


def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Prepare image for TensorFlow prediction.
    """

    image = image.resize(IMAGE_SIZE)

    image_array = np.array(image).astype("float32")

    if PREPROCESSING_MODE == "rescale_0_1":
        image_array = image_array / 255.0
    else:
        raise PredictionError(
            f"Unsupported preprocessing mode: {PREPROCESSING_MODE}"
        )

    image_array = np.expand_dims(
        image_array,
        axis=0,
    )

    return image_array


def _predict_probability(
    model: Any,
    image: Image.Image,
) -> float:
    """
    Run TensorFlow inference and return the raw probability.
    """

    validate_image_content(image)

    processed_image = preprocess_image(image)

    try:
        prediction = model.predict(
            processed_image,
            verbose=0,
        )

    except Exception as exc:
        raise PredictionError(
            "TensorFlow model prediction failed."
        ) from exc

    try:
        return float(prediction[0][0])

    except Exception as exc:
        raise PredictionError(
            f"Unexpected model output shape: {prediction.shape}"
        ) from exc


def _build_prediction_result(
    probability: float,
) -> dict:
    """
    Convert the probability into the final prediction response.
    """

    if probability >= PREDICTION_THRESHOLD:
        freshness = POSITIVE_CLASS_LABEL
        confidence = probability
    else:
        freshness = NEGATIVE_CLASS_LABEL
        confidence = 1.0 - probability

    confidence_percent = round(
        confidence * 100,
        2,
    )

    return {
        "freshness": freshness,
        "confidence": confidence,
        "confidence_percent": confidence_percent,
        "model": MODEL_NAME,
        "message": (
            f"Fruit predicted as {freshness} "
            f"with {confidence_percent}% confidence"
        ),
    }


def predict(
    model: Any,
    image_bytes: bytes,
) -> dict:
    """
    Predict freshness from uploaded image bytes.
    """

    image = load_image_from_bytes(
        image_bytes,
    )

    probability = _predict_probability(
        model,
        image,
    )

    return _build_prediction_result(
        probability,
    )


def predict_crop(
    model: Any,
    crop: np.ndarray,
) -> dict:
    """
    Predict freshness from a YOLO detected crop.
    """

    if crop is None or crop.size == 0:
        raise InvalidImageError(
            "Empty crop received for freshness prediction."
        )

    image = Image.fromarray(
        cv2.cvtColor(
            crop,
            cv2.COLOR_BGR2RGB,
        )
    )

    probability = _predict_probability(
        model,
        image,
    )

    return _build_prediction_result(
        probability,
    )