from pathlib import Path
from app.logger import logger
import tensorflow as tf
from huggingface_hub import hf_hub_download

from app.config import (
    HF_MODEL_FILE,
    HF_REPO_ID,
    LEGACY_MODEL_PATH,
    MODEL_DIR,
    MODEL_PATH,
)


def get_model():

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    model_path = MODEL_PATH

    if MODEL_PATH.exists():
        logger.info("Using existing model")

    elif LEGACY_MODEL_PATH.exists():
        logger.info("Using legacy model path")
        model_path = LEGACY_MODEL_PATH

    else:
        logger.info("Model not found. Downloading...")

        downloaded_path = hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=HF_MODEL_FILE,
            local_dir=MODEL_DIR,
        )

        model_path = Path(downloaded_path)

    logger.info("Loading TensorFlow model...")

    model = tf.keras.models.load_model(
        model_path,
        compile=False,
    )

    logger.info("Model loaded")

    return model
