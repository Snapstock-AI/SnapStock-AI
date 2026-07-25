from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
    Request,
    status,
)
from app.config import ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES
from app.freshness.predictor import predict
from app.freshness.schemas import PredictionResponse
from app.common.exceptions import InvalidImageError, PredictionError

router = APIRouter(
    prefix="/predict",
    tags=["Freshness Classifier"],  
)


@router.post("", response_model=PredictionResponse)
async def predict_image(
    request: Request,
    file: UploadFile = File(...)):
    """
    Receive an uploaded image and return freshness prediction.
    """

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Please upload JPEG, PNG, or WEBP image.",
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image file is too large.",
        )

    try:
        result = predict(
            request.app.state.freshness_model,
            image_bytes
        )
        return result

    except InvalidImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except PredictionError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    finally:
        await file.close()