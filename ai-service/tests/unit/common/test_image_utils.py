from io import BytesIO

import numpy as np
import pytest
from PIL import Image

from app.common.exceptions import InvalidImageError, PredictionError
from app.common.image_utils import (
    load_image_from_bytes,
    pil_to_opencv,
    preprocess_image,
    validate_image_content,
)


def create_test_image(
    width: int = 100,
    height: int = 100,
    color=(255, 0, 0),
) -> Image.Image:
    """Create a simple RGB image for testing."""
    return Image.new(
        "RGB",
        (width, height),
        color=color,
    )


def image_to_bytes(
    image: Image.Image,
    image_format: str = "JPEG",
) -> bytes:
    """Convert a PIL image into bytes."""
    buffer = BytesIO()
    image.save(buffer, format=image_format)
    return buffer.getvalue()


def test_load_valid_jpeg_image():
    image = create_test_image()
    image_bytes = image_to_bytes(image, "JPEG")

    loaded_image = load_image_from_bytes(image_bytes)

    assert isinstance(loaded_image, Image.Image)
    assert loaded_image.mode == "RGB"
    assert loaded_image.size == (100, 100)


def test_load_valid_png_image():
    image = create_test_image()
    image_bytes = image_to_bytes(image, "PNG")

    loaded_image = load_image_from_bytes(image_bytes)

    assert isinstance(loaded_image, Image.Image)
    assert loaded_image.mode == "RGB"
    assert loaded_image.size == (100, 100)


def test_load_invalid_image_bytes():
    invalid_bytes = b"this is not an image"

    with pytest.raises(
        InvalidImageError,
        match="Uploaded file is not a valid image",
    ):
        load_image_from_bytes(invalid_bytes)


def test_load_empty_bytes():
    with pytest.raises(InvalidImageError):
        load_image_from_bytes(b"")


def test_pil_to_opencv_converts_rgb_to_bgr():
    # RGB = Red
    image = Image.new(
        "RGB",
        (1, 1),
        color=(255, 0, 0),
    )

    opencv_image = pil_to_opencv(image)

    assert isinstance(opencv_image, np.ndarray)
    assert opencv_image.shape == (1, 1, 3)

    # OpenCV uses BGR.
    assert opencv_image[0, 0].tolist() == [0, 0, 255]


def test_preprocess_image_shape():
    image = create_test_image()

    processed = preprocess_image(image)

    assert isinstance(processed, np.ndarray)

    # Batch size, height, width, channels
    assert processed.shape == (1, 224, 224, 3)


def test_preprocess_image_normalizes_values():
    image = create_test_image(
        color=(255, 128, 0),
    )

    processed = preprocess_image(image)

    assert processed.min() >= 0.0
    assert processed.max() <= 1.0


def test_preprocess_image_uses_float32():
    image = create_test_image()

    processed = preprocess_image(image)

    assert processed.dtype == np.float32


def test_validate_blank_image_raises_error():
    blank_image = Image.new(
        "RGB",
        (100, 100),
        color=(128, 128, 128),
    )

    with pytest.raises(
        InvalidImageError,
        match="not contain enough visual information",
    ):
        validate_image_content(blank_image)


def test_validate_image_with_visual_variation():
    image_array = np.zeros(
        (100, 100, 3),
        dtype=np.uint8,
    )

    image_array[:50] = 0
    image_array[50:] = 255

    image = Image.fromarray(image_array)

    # Should not raise an exception.
    validate_image_content(image)