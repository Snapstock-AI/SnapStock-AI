from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from starlette.concurrency import run_in_threadpool

from app.config import (
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE_BYTES,
    MAX_IMAGE_SIZE_MB,
)
from app.config import (
    YOLO_CONFIDENCE_THRESHOLD,
)
from app.detection.detector import (
    InvalidDetectionImageError,
    detect_and_count,
)
from app.detection.schemas import DetectionResponse


router = APIRouter(
    prefix="/detect",
    tags=["Object Detection"],
)


@router.post(
    "",
    response_model=DetectionResponse,
)
async def detect_objects(
    file: Annotated[
        UploadFile,
        File(
            description=(
                "Image containing fruits or vegetables"
            )
        ),
    ],
    confidence_threshold: Annotated[
        float,
        Query(
            ge=0.0,
            le=1.0,
            description=(
                "Minimum confidence required for a detection"
            ),
        ),
    ] = YOLO_CONFIDENCE_THRESHOLD,
) -> DetectionResponse:
    content_type = file.content_type or ""

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported image type. "
                "Upload JPEG, PNG or WebP."
            ),
        )

    try:
        image_bytes = await file.read(
            MAX_IMAGE_SIZE_BYTES + 1
        )
    finally:
        await file.close()

    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"The uploaded image exceeds "
                f"{MAX_IMAGE_SIZE_MB} MB."
            ),
        )

    try:
        return await run_in_threadpool(
            detect_and_count,
            image_bytes,
            confidence_threshold,
        )
    except InvalidDetectionImageError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Object detection failed.",
        ) from error