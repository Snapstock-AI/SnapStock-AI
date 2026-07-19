from pathlib import Path

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
        print("Using existing model")

    elif LEGACY_MODEL_PATH.exists():
        print("Using legacy model path")
        model_path = LEGACY_MODEL_PATH

    else:
        print("Model not found. Downloading...")

        downloaded_path = hf_hub_download(
            repo_id=HF_REPO_ID,
            filename=HF_MODEL_FILE,
            local_dir=MODEL_DIR,
        )

        model_path = Path(downloaded_path)

    print("Loading TensorFlow model...")

    model = tf.keras.models.load_model(
        model_path,
        compile=False,
    )

    print("Model loaded")

    return model
