from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


# Local model location
MODEL_DIR = BASE_DIR / "models"


# Hugging Face
HF_REPO_ID = "Senu-12/fruit-freshness-classifier"
HF_MODEL_FILE = "mobilenet/mobilenet_model.keras"


MODEL_PATH = MODEL_DIR / HF_MODEL_FILE
LEGACY_MODEL_PATH = MODEL_DIR / "mobilenet_model.keras"


# Image settings
IMAGE_SIZE = (224, 224)
PREPROCESSING_MODE = "rescale_0_1"


MAX_IMAGE_SIZE_MB = 5
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

POSITIVE_CLASS_LABEL = "good"
NEGATIVE_CLASS_LABEL = "bad"

PREDICTION_THRESHOLD = 0.5

MODEL_NAME = "mobilenet"