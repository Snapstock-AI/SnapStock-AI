from io import BytesIO
from typing import Any
import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

from app.config import (
    IMAGE_SIZE,
    NEGATIVE_CLASS_LABEL,
    POSITIVE_CLASS_LABEL,
    PREDICTION_THRESHOLD,
    PREPROCESSING_MODE,
    MODEL_NAME,
)


class InvalidImageError(Exception):
    """Raised when the uploaded file is not a valid image."""


class PredictionError(Exception):
    """Raised when prediction fails."""

def validate_image_content(image: Image.Image) -> None:
    """
    Reject images that are technically valid but visually useless.

    Example:
    - plain white image
    - plain black image
    - almost blank image
    """

    image_array = np.array(image).astype("float32")

    pixel_std = float(np.std(image_array))

    if pixel_std < 10.0:
        raise InvalidImageError(
            "Image does not contain enough visual information for prediction."
        )
    

def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """
    Convert uploaded image bytes into a PIL image.

    The image is converted to RGB because the model expects 3 channels:
    Red, Green, Blue.
    """

    try:
        image = Image.open(BytesIO(image_bytes))
        image = image.convert("RGB")
        return image

    except UnidentifiedImageError as exc:
        raise InvalidImageError("Uploaded file is not a valid image.") from exc


def preprocess_image(image: Image.Image) -> np.ndarray:
    """
    Prepare image for TensorFlow model prediction.

    Steps:
    1. Resize image
    2. Convert image to NumPy array
    3. Normalize pixel values
    4. Add batch dimension

    Final shape:
    (1, 224, 224, 3)
    """

    image = image.resize(IMAGE_SIZE)

    image_array = np.array(image).astype("float32")

    if PREPROCESSING_MODE == "rescale_0_1":
        image_array = image_array / 255.0
    else:
        raise PredictionError(
            f"Unsupported preprocessing mode: {PREPROCESSING_MODE}"
        )

    image_array = np.expand_dims(image_array, axis=0)

    return image_array


def predict(model: Any, image_bytes: bytes) -> dict:
    """
    Run prediction on an uploaded image.

    This function does not know anything about FastAPI.
    It only receives:
    - TensorFlow model
    - image bytes

    And returns:
    - freshness result
    - confidence
    """

    image = load_image_from_bytes(image_bytes)
    validate_image_content(image)
    processed_image = preprocess_image(image)

    try:
        prediction = model.predict(processed_image, verbose=0)

    except Exception as exc:
        raise PredictionError("TensorFlow model prediction failed.") from exc

    try:
        probability = float(prediction[0][0])

    except Exception as exc:
        raise PredictionError(
            f"Unexpected model output shape: {prediction.shape}"
        ) from exc
    
    if probability >= PREDICTION_THRESHOLD:
        freshness = POSITIVE_CLASS_LABEL
        confidence = probability
    else:
        freshness = NEGATIVE_CLASS_LABEL
        confidence = 1.0 - probability
    confidence_percent = round(confidence * 100, 2)
    return {
        "freshness": freshness,
        "confidence": confidence,
        "confidence_percent": confidence_percent,
        "model": MODEL_NAME,
        "message": f"Fruit predicted as {freshness} with {confidence_percent}% confidence",
    }


def predict_crop(model: Any, crop: np.ndarray) -> dict:
    """
    Predict freshness from a YOLO detected crop.

    Input:
        crop:
            OpenCV image (BGR numpy array)

    Output:
        Freshness prediction result
    """

    if crop is None or crop.size == 0:
        raise InvalidImageError(
            "Empty crop received for freshness prediction."
        )


    # Convert OpenCV BGR image to PIL RGB image
    image = Image.fromarray(
        cv2.cvtColor(
            crop,
            cv2.COLOR_BGR2RGB
        )
    )


    validate_image_content(image)


    processed_image = preprocess_image(
        image
    )


    try:
        prediction = model.predict(
            processed_image,
            verbose=0
        )

    except Exception as exc:
        raise PredictionError(
            "TensorFlow model prediction failed."
        ) from exc


    try:
        probability = float(
            prediction[0][0]
        )

    except Exception as exc:
        raise PredictionError(
            f"Unexpected model output shape: {prediction.shape}"
        ) from exc


    if probability >= PREDICTION_THRESHOLD:

        freshness = POSITIVE_CLASS_LABEL
        confidence = probability

    else:

        freshness = NEGATIVE_CLASS_LABEL
        confidence = 1.0 - probability


    confidence_percent = round(
        confidence * 100,
        2
    )


    return {
        "freshness": freshness,

        "confidence": confidence,

        "confidence_percent": confidence_percent,

        "model": MODEL_NAME,

        "message":
            f"Fruit predicted as {freshness} "
            f"with {confidence_percent}% confidence"
    }