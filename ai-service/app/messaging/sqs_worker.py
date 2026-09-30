"""Event-driven analysis worker.

Consumes IMAGE_UPLOADED jobs from the SQS jobs queue, downloads the image from S3, runs the
same analysis as POST /analyze and publishes ANALYSIS_COMPLETED / ANALYSIS_FAILED to the
results queue, which the backend consumes.

Enabled only when SQS_ANALYSIS_JOB_QUEUE_URL and SQS_ANALYSIS_RESULT_QUEUE_URL are set.
Credentials come from the default AWS chain (IRSA on EKS). Locally, AWS_ENDPOINT_URL points
at LocalStack.
"""

import json
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.config import Config

from app.analysis.service import analyze_image
from app.common.exceptions import InvalidDetectionImageError, InvalidImageError
from app.logger import logger

# After this many deliveries a failing job is reported as ANALYSIS_FAILED instead of retried,
# so the scan never stays PROCESSING forever.
MAX_ATTEMPTS = int(os.getenv("ANALYSIS_MAX_ATTEMPTS", "3"))


class PermanentJobError(Exception):
    """The job can never succeed (bad message or unreadable image); do not retry."""


def job_queue_url() -> str:
    return os.getenv("SQS_ANALYSIS_JOB_QUEUE_URL", "")


def result_queue_url() -> str:
    return os.getenv("SQS_ANALYSIS_RESULT_QUEUE_URL", "")


def is_enabled() -> bool:
    return bool(job_queue_url() and result_queue_url())


def _client_kwargs(service_name: str) -> dict[str, Any]:
    kwargs: dict[str, Any] = {"region_name": os.getenv("AWS_REGION", "ap-south-1")}

    endpoint_url = os.getenv("AWS_ENDPOINT_URL")
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
        kwargs["aws_access_key_id"] = os.getenv("AWS_ACCESS_KEY_ID", "test")
        kwargs["aws_secret_access_key"] = os.getenv("AWS_SECRET_ACCESS_KEY", "test")
        if service_name == "s3":
            kwargs["config"] = Config(s3={"addressing_style": "path"})

    return kwargs


def get_s3_client():
    return boto3.client("s3", **_client_kwargs("s3"))


def get_sqs_client():
    return boto3.client("sqs", **_client_kwargs("sqs"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _send_result(sqs_client: Any, payload: dict[str, Any]) -> None:
    sqs_client.send_message(
        QueueUrl=result_queue_url(),
        MessageBody=json.dumps(payload),
        MessageAttributes={
            "eventType": {"DataType": "String", "StringValue": str(payload["eventType"])},
            "scanId": {"DataType": "String", "StringValue": str(payload["scanId"])},
        },
    )


def process_job(
    job: dict[str, Any],
    detection_model: Any,
    freshness_model: Any,
    s3_client: Any,
) -> dict[str, Any]:
    """Runs one IMAGE_UPLOADED job and returns the ANALYSIS_COMPLETED payload."""
    if job.get("eventType") != "IMAGE_UPLOADED":
        raise PermanentJobError(f"Unsupported queue event: {job.get('eventType')}")

    bucket = job.get("bucket") or os.getenv("S3_UPLOAD_BUCKET", "")
    object_key = job.get("objectKey")
    if not bucket or not object_key:
        raise PermanentJobError("The job is missing the image location.")

    image_bytes = s3_client.get_object(Bucket=bucket, Key=object_key)["Body"].read()

    try:
        result = analyze_image(detection_model, freshness_model, image_bytes)
    except (InvalidImageError, InvalidDetectionImageError) as error:
        raise PermanentJobError(str(error)) from error

    return {
        "eventType": "ANALYSIS_COMPLETED",
        "scanId": job["scanId"],
        "timestamp": _now(),
        "data": result.model_dump(mode="json") if hasattr(result, "model_dump") else result,
    }


def handle_message(
    record: dict[str, Any],
    detection_model: Any,
    freshness_model: Any,
    s3_client: Any,
    sqs_client: Any,
) -> bool:
    """Processes one SQS record. Returns True when it may be deleted from the jobs queue."""
    try:
        job = json.loads(record.get("Body") or "")
    except json.JSONDecodeError:
        logger.error("Dropping analysis job with an invalid body")
        return True

    scan_id = job.get("scanId") if isinstance(job, dict) else None
    if not scan_id:
        logger.error("Dropping analysis job without scanId")
        return True

    attempts = int(record.get("Attributes", {}).get("ApproximateReceiveCount", "1"))

    try:
        _send_result(sqs_client, process_job(job, detection_model, freshness_model, s3_client))
        logger.info("Analysis completed for scan %s", scan_id)
        return True
    except PermanentJobError as error:
        message = str(error)
    except Exception as error:  # S3, SQS or model errors: retry via SQS visibility timeout
        if attempts < MAX_ATTEMPTS:
            logger.exception("Analysis of scan %s failed (attempt %s), will retry", scan_id, attempts)
            return False
        message = "AI analysis failed. Please try another image."
        logger.exception("Analysis of scan %s failed after %s attempts", scan_id, attempts)

    try:
        _send_result(
            sqs_client,
            {"eventType": "ANALYSIS_FAILED", "scanId": scan_id, "timestamp": _now(), "errorMessage": message},
        )
    except Exception:
        logger.exception("Could not publish failure for scan %s; leaving job for retry", scan_id)
        return False

    logger.error("Analysis failed for scan %s: %s", scan_id, message)
    return True


def poll_once(detection_model: Any, freshness_model: Any, s3_client: Any, sqs_client: Any) -> int:
    """Long-polls the jobs queue once. Returns the number of records received."""
    response = sqs_client.receive_message(
        QueueUrl=job_queue_url(),
        MaxNumberOfMessages=1,  # one image at a time per worker; scale out with replicas
        WaitTimeSeconds=20,
        AttributeNames=["ApproximateReceiveCount"],
    )
    records = response.get("Messages", [])

    for record in records:
        if handle_message(record, detection_model, freshness_model, s3_client, sqs_client):
            sqs_client.delete_message(QueueUrl=job_queue_url(), ReceiptHandle=record["ReceiptHandle"])

    return len(records)


class WorkerState:
    def __init__(self) -> None:
        self.running = False
        self.last_poll_at: str | None = None
        self.processed = 0


state = WorkerState()


def _run(detection_model: Any, freshness_model: Any, stop: threading.Event) -> None:
    s3_client = get_s3_client()
    sqs_client = get_sqs_client()
    state.running = True
    logger.info("Analysis worker started: consuming %s", job_queue_url())

    while not stop.is_set():
        try:
            state.processed += poll_once(detection_model, freshness_model, s3_client, sqs_client)
            state.last_poll_at = _now()
        except Exception:
            logger.exception("Analysis worker poll failed")
            stop.wait(5)

    state.running = False


def start_worker_thread(detection_model: Any, freshness_model: Any) -> threading.Event | None:
    """Starts the background consumer if the queues are configured. Returns its stop event."""
    if not is_enabled():
        logger.info("Event-driven analysis disabled (SQS queues not configured)")
        return None

    stop = threading.Event()
    threading.Thread(
        target=_run,
        args=(detection_model, freshness_model, stop),
        daemon=True,
        name="snapstock-analysis-worker",
    ).start()
    return stop
