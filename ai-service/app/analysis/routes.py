from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
    Request,
)
from starlette.concurrency import run_in_threadpool

from app.analysis.schemas import AnalysisResponse
from app.analysis.service import analyze_image

from app.config import (
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_SIZE_BYTES,
    MAX_IMAGE_SIZE_MB,
)


router = APIRouter(
    prefix="/analyze",
    tags=["Image Analysis"],
)


@router.post(
    "",
    response_model=AnalysisResponse,
)
async def analyze(
    request: Request,
    file: Annotated[
        UploadFile,
        File(
            description="Image containing fruits or vegetables"
        ),
    ],
) -> AnalysisResponse:

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
            analyze_image,
            request.app.state.detection_model,
            request.app.state.freshness_model,
            image_bytes,
            
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error