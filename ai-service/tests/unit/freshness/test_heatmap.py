import os

import cv2
import numpy as np
import pytest

from app.freshness import heatmap as heatmap_module
from app.freshness.heatmap import save_heatmap


# Colour the JET colormap assigns to a heatmap value of 0, in BGR.
COLD_COLOR_BGR = np.array(
    [128, 0, 0],
    dtype=np.float32,
)

IMAGE_WEIGHT = 0.6
HEATMAP_WEIGHT = 0.4

# JPEG is lossy, so exact pixel equality is not available.
JPEG_TOLERANCE = 12


# ============================================================
# Helper functions
# ============================================================

@pytest.fixture
def output_dir(tmp_path, monkeypatch):
    """
    Redirect saved heatmaps into a temporary directory.
    """

    monkeypatch.setattr(
        heatmap_module,
        "OUTPUT_DIR",
        str(tmp_path),
    )

    return tmp_path


def create_image(
    color=(1.0, 0.0, 0.0),
    size=(64, 64),
):
    """
    Preprocessed RGB image in the 0..1 range, as the model receives it.
    """

    image = np.zeros(
        (*size, 3),
        dtype=np.float32,
    )

    image[:, :] = color

    return image


def create_heatmap(
    value=0.0,
    size=(7, 7),
):
    return np.full(
        size,
        value,
        dtype=np.float32,
    )


# ============================================================
# File output
# ============================================================

def test_save_heatmap_writes_jpeg_into_output_dir(output_dir):
    path = save_heatmap(
        create_image(),
        create_heatmap(),
    )

    assert path.endswith(".jpg")

    assert os.path.dirname(path) == str(output_dir)

    assert os.path.exists(path)


def test_save_heatmap_uses_unique_filenames(output_dir):
    first = save_heatmap(
        create_image(),
        create_heatmap(),
    )

    second = save_heatmap(
        create_image(),
        create_heatmap(),
    )

    assert first != second

    assert len(list(output_dir.iterdir())) == 2


# ============================================================
# Geometry
# ============================================================

def test_save_heatmap_resizes_heatmap_to_image_size(output_dir):
    """
    The heatmap comes from the feature map (7x7), not the input image.
    """

    path = save_heatmap(
        create_image(size=(64, 48)),
        create_heatmap(size=(7, 7)),
    )

    written = cv2.imread(path)

    assert written.shape == (64, 48, 3)


# ============================================================
# Colour handling
# ============================================================

def test_save_heatmap_writes_bgr_channel_order(output_dir):
    """
    Regression: the model input is RGB while OpenCV writes BGR, so a red
    image must not be saved as a blue one.
    """

    path = save_heatmap(
        create_image(color=(1.0, 0.0, 0.0)),
        create_heatmap(value=0.0),
    )

    # imread returns BGR.
    blue, green, red = cv2.imread(path)[32, 32].astype(np.float32)

    expected = (
        IMAGE_WEIGHT * np.array([0.0, 0.0, 255.0], dtype=np.float32)
        + HEATMAP_WEIGHT * COLD_COLOR_BGR
    )

    assert red == pytest.approx(expected[2], abs=JPEG_TOLERANCE)
    assert green == pytest.approx(expected[1], abs=JPEG_TOLERANCE)
    assert blue == pytest.approx(expected[0], abs=JPEG_TOLERANCE)

    assert red > blue


def test_save_heatmap_clips_out_of_range_pixels(output_dir):
    """
    Values above 1.0 must saturate to white instead of wrapping around
    when the float image is cast to uint8.
    """

    path = save_heatmap(
        create_image(color=(1.5, 1.5, 1.5)),
        create_heatmap(value=0.0),
    )

    written = cv2.imread(path)[32, 32].astype(np.float32)

    saturated = (
        IMAGE_WEIGHT * 255.0
        + HEATMAP_WEIGHT * COLD_COLOR_BGR
    )

    np.testing.assert_allclose(
        written,
        saturated,
        atol=JPEG_TOLERANCE,
    )


def test_save_heatmap_hot_and_cold_regions_differ(output_dir):
    """
    A hot region must be tinted differently from a cold one, otherwise
    the overlay carries no explanation.
    """

    heatmap = np.zeros(
        (8, 8),
        dtype=np.float32,
    )

    heatmap[:4] = 1.0

    path = save_heatmap(
        create_image(color=(0.5, 0.5, 0.5)),
        heatmap,
    )

    written = cv2.imread(path)

    hot = written[8, 32].astype(np.float32)
    cold = written[56, 32].astype(np.float32)

    # JET runs from blue (cold) to red (hot).
    assert hot[2] > cold[2]
    assert cold[0] > hot[0]
