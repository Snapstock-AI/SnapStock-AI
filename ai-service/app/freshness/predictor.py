from io import BytesIO
from keras import Model

import cv2
import numpy as np
from PIL import Image

from app.config import (
    MODEL_NAME,
    NEGATIVE_CLASS_LABEL,
    POSITIVE_CLASS_LABEL,
    PREDICTION_THRESHOLD,
)

from app.common.image_utils import (
    validate_image_content,
    load_image_from_bytes,
    preprocess_image,

)

from app.common.exceptions import (
    InvalidImageError,
    PredictionError,
)


def _predict_probability(
    model: Model,
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
    model: Model,
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
    model: Model,
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