from huggingface_hub import hf_hub_download
import tensorflow as tf

REPO_ID = "Senu-12/fruit-freshness-classifier"

MODEL_FILES = {
    "cnn": "cnn/cnn_model.keras",
    "mobilenet": "mobilenet/mobilenet_model.keras",
}

def load_model(model_name):
    if model_name not in MODEL_FILES:
        raise ValueError(f"Unknown model: {model_name}")

    path = hf_hub_download(
        repo_id=REPO_ID,
        filename=MODEL_FILES[model_name]
    )

    return tf.keras.models.load_model(path)