import os
import shutil
from functools import lru_cache
from pathlib import Path

from huggingface_hub import hf_hub_download
from ultralytics import YOLO

from app.config import (
    DETECTION_MODEL_PATH,
    HF_DETECTION_MODEL_FILE,
    HF_DETECTION_REPO_ID,
)


def detection_model_exists() -> bool:
    """Return True when the local YOLO checkpoint exists and is not empty."""

    return (
        DETECTION_MODEL_PATH.is_file()
        and DETECTION_MODEL_PATH.stat().st_size > 0
    )


def ensure_detection_model() -> Path:
    """
    Return the local model path.

    Download the checkpoint from Hugging Face only when
    the local model is missing.
    """

    if detection_model_exists():
        print(
            "YOLO detection model found locally:\n"
            f"{DETECTION_MODEL_PATH}"
        )
        return DETECTION_MODEL_PATH

    print("YOLO detection model is not available locally.")
    print(f"Repository: {HF_DETECTION_REPO_ID}")
    print(f"Model file: {HF_DETECTION_MODEL_FILE}")

    DETECTION_MODEL_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    try:
        cached_path = hf_hub_download(
            repo_id=HF_DETECTION_REPO_ID,
            filename=HF_DETECTION_MODEL_FILE,
            token=os.getenv("HF_TOKEN"),
        )
    except Exception as error:
        raise RuntimeError(
            "Failed to download the YOLO detection model. "
            "Check the Hugging Face repository, filename, "
            "internet connection and access token."
        ) from error

    cached_path = Path(cached_path)

    temporary_path = DETECTION_MODEL_PATH.with_suffix(
        DETECTION_MODEL_PATH.suffix + ".part"
    )

    try:
        shutil.copy2(
            cached_path,
            temporary_path,
        )

        temporary_path.replace(
            DETECTION_MODEL_PATH
        )
    finally:
        if temporary_path.exists():
            temporary_path.unlink()

    if not detection_model_exists():
        raise RuntimeError(
            "The model download finished, but the local "
            "checkpoint is missing or empty."
        )

    print(
        "YOLO detection model downloaded successfully:\n"
        f"{DETECTION_MODEL_PATH}"
    )

    return DETECTION_MODEL_PATH


@lru_cache(maxsize=1)
def get_detection_model() -> YOLO:
    """
    Download the model when necessary and load it once.

    Later requests reuse the same model instance.
    """

    model_path = ensure_detection_model()

    print(f"Loading YOLO model: {model_path}")

    try:
        model = YOLO(str(model_path))
    except Exception as error:
        raise RuntimeError(
            "The YOLO checkpoint exists, but it could not be loaded."
        ) from error

    print(
        "YOLO model loaded successfully. "
        f"Supported classes: {len(model.names)}"
    )

    return model