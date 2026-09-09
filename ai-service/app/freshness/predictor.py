from functools import lru_cache
from io import BytesIO
import logging

from keras import Model
import cv2
import numpy as np
from PIL import Image

from .gradcam import GradCAM
from .heatmap import save_heatmap

from app.config import (
    MODEL_NAME,
    NEGATIVE_CLASS_LABEL,
    POSITIVE_CLASS_LABEL,
    PREDICTION_THRESHOLD,
)

from app.common.image_utils import (
    validate_image_content,
    load_image_from_bytes,
    preprocess_image,
)

from app.freshness.schemas import PredictionResponse

from app.common.exceptions import (
    InvalidImageError,
    PredictionError,
)


logger = logging.getLogger(__name__)



@lru_cache(maxsize=1)
def _get_gradcam(model: Model) -> GradCAM:
    """
    Building the Grad-CAM graph is expensive, and the model is a singleton
    held on the app state, so build it once.
    """

    return GradCAM(model)



def _predict_probability(
    model: Model,
    image: Image.Image,
):

    validate_image_content(image)

    processed_image = preprocess_image(image)

    try:

        prediction = model.predict(
            processed_image,
            verbose=0,
        )

        return (
            float(prediction[0][0]),
            processed_image
        )


    except Exception as exc:

        raise PredictionError(
            "TensorFlow model prediction failed."
        ) from exc



def _generate_gradcam(
    model,
    processed_image,
    probability
):

    # binary classification
    class_id = 1 if probability >= 0.5 else 0

    try:

        gradcam = _get_gradcam(model)

        heatmap = gradcam.generate(
            processed_image,
            class_id
        )

        return save_heatmap(
            processed_image[0],
            heatmap
        )


    except Exception:

        # Explainability is optional: a failed heatmap must not cost the
        # caller their prediction.
        logger.warning(
            "Grad-CAM generation failed; returning prediction without an "
            "explanation.",
            exc_info=True,
        )

        return None



def _build_prediction_result(
    probability,
    heatmap_path=None
):

    if probability >= PREDICTION_THRESHOLD:

        freshness = POSITIVE_CLASS_LABEL
        confidence = probability

    else:

        freshness = NEGATIVE_CLASS_LABEL
        confidence = 1 - probability



    confidence_percent = round(
        confidence * 100,
        2
    )


    return PredictionResponse(

        freshness=freshness,

        confidence=confidence,

        confidence_percent=confidence_percent,

        model=MODEL_NAME,

        message=(
            f"Fruit predicted as {freshness} "
            f"with {confidence_percent}% confidence"
        ),

        explanation=heatmap_path

    )



def predict(
    model: Model,
    image_bytes: bytes,
):

    image = load_image_from_bytes(
        image_bytes
    )


    probability, processed_image = _predict_probability(
        model,
        image
    )


    heatmap_path = _generate_gradcam(
        model,
        processed_image,
        probability
    )


    return _build_prediction_result(
        probability,
        heatmap_path
    )



def predict_crop(
    model: Model,
    crop: np.ndarray,
):

    if crop is None or crop.size == 0:

        raise InvalidImageError(
            "Empty crop received for freshness prediction."
        )


    image = Image.fromarray(

        cv2.cvtColor(
            crop,
            cv2.COLOR_BGR2RGB
        )

    )


    probability, processed_image = _predict_probability(
        model,
        image
    )


    heatmap_path = _generate_gradcam(
        model,
        processed_image,
        probability
    )


    return _build_prediction_result(
        probability,
        heatmap_path
    )