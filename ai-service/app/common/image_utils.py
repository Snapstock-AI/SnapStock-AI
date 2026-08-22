
import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError
from app.config import (
    IMAGE_SIZE,
    PREPROCESSING_MODE,
)
from io import BytesIO
from app.common.exceptions import (
    InvalidImageError,
    PredictionError,
)


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

def pil_to_opencv(image: Image.Image) -> np.ndarray:
    """
    Convert a PIL RGB image into an OpenCV BGR image.
    """

    return cv2.cvtColor(
        np.array(image),
        cv2.COLOR_RGB2BGR,
    )

def image_to_bytes(
    image: Image.Image,
    image_format: str = "JPEG",
) -> bytes:

    buffer = BytesIO()

    image.save(
        buffer,
        format=image_format,
    )

    return buffer.getvalue()

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