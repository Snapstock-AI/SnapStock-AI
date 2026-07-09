from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile, status

from app.config import ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES
from app.model_loader import get_model
from app.predictor import InvalidImageError, PredictionError, predict
from app.schemas import HealthResponse, PredictionResponse

from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs when the FastAPI application starts.

    We load the TensorFlow model once and store it in app.state.
    """

    app.state.model = get_model()

    yield

    # Cleanup can be added later if needed.


app = FastAPI(
    title="SnapStock-AI Service",
    description="AI microservice for fruit freshness classification",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.43.130:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status": "running",
        "model_loaded": hasattr(app.state, "model"),
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict_image(file: UploadFile = File(...)):
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
        result = predict(app.state.model, image_bytes)
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