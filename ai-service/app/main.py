from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.freshness.model_loader import get_model
from app.freshness.routes import router as prediction_router
from app.detection.routes import router as detection_router
from app.analysis.routes import router as analysis_router
from app.detection.model_loader import get_detection_model
from app.messaging import sqs_worker
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs when the FastAPI application starts.

    We load the TensorFlow model once and store it in app.state.
    """

    app.state.freshness_model = get_model()
    app.state.detection_model = get_detection_model()

    # Event-driven analysis: consume the SQS jobs queue in the background (if configured).
    worker_stop = sqs_worker.start_worker_thread(
        app.state.detection_model,
        app.state.freshness_model,
    )

    yield

    if worker_stop is not None:
        worker_stop.set()


app = FastAPI(
    title="SnapStock-AI Service",
    description="AI microservice for fruit freshness classification",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(detection_router)
app.include_router(prediction_router)
app.include_router(analysis_router)

@app.get("/health")
def health():
    return {
        "status": "running",
        "detection_model_loaded": hasattr(app.state, "detection_model"),
        "freshness_model_loaded": hasattr(app.state, "freshness_model"),
        "queue_worker": {
            "enabled": sqs_worker.is_enabled(),
            "running": sqs_worker.state.running,
            "last_poll_at": sqs_worker.state.last_poll_at,
            "processed": sqs_worker.state.processed,
        },
    }
