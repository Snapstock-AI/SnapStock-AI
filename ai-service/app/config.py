from pathlib import Path


# =========================================================
# Base directories
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

# Local model storage:
# ai-service/models/
MODEL_DIR = BASE_DIR / "models"


# =========================================================
# Freshness classification model
# =========================================================

# Hugging Face repository containing the MobileNet model
HF_REPO_ID = "Senu-12/fruit-freshness-classifier"

# File location inside the Hugging Face repository
HF_MODEL_FILE = "mobilenet/mobilenet_model.keras"

# Local location:
# ai-service/models/mobilenet/mobilenet_model.keras
MODEL_PATH = MODEL_DIR / HF_MODEL_FILE

# Old model location, kept for backward compatibility
LEGACY_MODEL_PATH = MODEL_DIR / "mobilenet_model.keras"


# Freshness image settings
IMAGE_SIZE = (224, 224)
PREPROCESSING_MODE = "rescale_0_1"

POSITIVE_CLASS_LABEL = "good"
NEGATIVE_CLASS_LABEL = "bad"

PREDICTION_THRESHOLD = 0.5

MODEL_NAME = "mobilenet"


# =========================================================
# YOLO fruit and vegetable detection model
# =========================================================

# Your Hugging Face model repository
HF_DETECTION_REPO_ID = (
    "Senu-12/snapstock-fruit-vegetable-detector"
)

# File location inside your Hugging Face repository
HF_DETECTION_MODEL_FILE = (
    "yolov8/fruit_vegetable_yolov8m.pt"
)

# Local location:
# ai-service/models/detection/fruit_vegetable_yolov8m.pt
DETECTION_MODEL_PATH = (
    MODEL_DIR
    / "detection"
    / "fruit_vegetable_yolov8m.pt"
)

# YOLO prediction settings
YOLO_IMAGE_SIZE = 640
YOLO_CONFIDENCE_THRESHOLD = 0.30
YOLO_IOU_THRESHOLD = 0.50
YOLO_AGNOSTIC_NMS = True

DETECTION_MODEL_NAME = "fruit_vegetable_yolov8m"


# =========================================================
# Shared image-upload settings
# =========================================================

MAX_IMAGE_SIZE_MB = 5
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}