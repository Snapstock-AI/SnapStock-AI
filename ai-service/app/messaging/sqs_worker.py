import json
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.config import Config

from app.analysis.service import analyze_image
from app.logger import logger


def _client_kwargs(service_name: str) -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "region_name": os.getenv("AWS_REGION", "ap-south-1"),
    }

    endpoint_url = os.getenv("AWS_ENDPOINT_URL")
    access_key = os.getenv("AWS_ACCESS_KEY_ID")
    secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url

    if access_key and secret_key:
        kwargs["aws_access_key_id"] = access_key
        kwargs["aws_secret_access_key"] = secret_key

    if service_name == "s3" and endpoint_url:
        kwargs["config"] = Config(s3={"addressing_style": "path"})

    return kwargs


def get_s3_client():
    return boto3.client("s3", **_client_kwargs("s3"))


def get_sqs_client():
    return boto3.client("sqs", **_client_kwargs("sqs"))


def _result_queue_url() -> str:
    queue_url = (
        os.getenv("SQS_ANALYSIS_RESULT_QUEUE_URL")
        or os.getenv("AWS_ANALYSIS_RESULT_QUEUE_URL")
        or ""
    )
    if not queue_url:
        raise RuntimeError("SQS_ANALYSIS_RESULT_QUEUE_URL is required.")
    return queue_url


def _send_result(payload: dict[str, Any]) -> None:
    get_sqs_client().send_message(
        QueueUrl=_result_queue_url(),
        MessageBody=json.dumps(payload),
        MessageAttributes={
            "eventType": {
                "DataType": "String",
                "StringValue": str(payload["eventType"]),
            },
            "scanId": {
                "DataType": "String",
                "StringValue": str(payload["scanId"]),
            },
        },
    )


def process_message(message: dict[str, Any], detection_model: Any, freshness_model: Any) -> dict[str, Any]:
    payload = message if isinstance(message, dict) else json.loads(message)
    event_type = payload.get("eventType")

    if event_type != "IMAGE_UPLOADED":
        raise ValueError(f"Unsupported queue event: {event_type}")

    bucket = payload.get("bucket") or os.getenv("S3_UPLOAD_BUCKET", "snapstock-uploads")
    object_key = payload.get("objectKey")
    scan_id = payload.get("scanId")
    business_id = payload.get("businessId")
    shelf_id = payload.get("shelfId")
    user_id = payload.get("userId")

    if not object_key or not scan_id:
        raise ValueError("Message is missing scanId or objectKey.")

    response = get_s3_client().get_object(Bucket=bucket, Key=object_key)
    image_bytes = response["Body"].read()

    analysis_result = analyze_image(detection_model, freshness_model, image_bytes)
    if hasattr(analysis_result, "model_dump"):
        analysis_payload = analysis_result.model_dump()
    elif hasattr(analysis_result, "dict"):
        analysis_payload = analysis_result.dict()
    elif isinstance(analysis_result, dict):
        analysis_payload = analysis_result
    else:
        analysis_payload = json.loads(json.dumps(analysis_result))

    result_payload = {
        "eventType": "ANALYSIS_COMPLETED",
        "status": "COMPLETED",
        "scanId": scan_id,
        "businessId": business_id,
        "shelfId": shelf_id,
        "userId": user_id,
        "bucket": bucket,
        "objectKey": object_key,
        "contentType": payload.get("contentType"),
        "timestamp": payload.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "data": analysis_payload,
    }

    _send_result(result_payload)

    return result_payload


def consume_messages(
    queue_url: str | None = None,
    detection_model: Any = None,
    freshness_model: Any = None,
    max_messages: int = 1,
    wait_time_seconds: int = 20,
) -> list[dict[str, Any]]:
    if detection_model is None or freshness_model is None:
        raise ValueError("A detection model and freshness model are required.")

    source_queue_url = queue_url or os.getenv("SQS_ANALYSIS_JOB_QUEUE_URL") or os.getenv("AWS_ANALYSIS_REQUEST_QUEUE_URL")
    if not source_queue_url:
        raise RuntimeError("SQS_ANALYSIS_JOB_QUEUE_URL is required.")

    sqs_client = get_sqs_client()
    response = sqs_client.receive_message(
        QueueUrl=source_queue_url,
        MaxNumberOfMessages=max_messages,
        WaitTimeSeconds=wait_time_seconds,
        MessageAttributeNames=["All"],
    )

    messages = response.get("Messages", [])
    processed: list[dict[str, Any]] = []

    for record in messages:
        receipt_handle = record.get("ReceiptHandle")
        body = record.get("Body")
        payload: dict[str, Any] | None = None

        if not body:
            continue

        try:
            payload = json.loads(body)
            result = process_message(payload, detection_model, freshness_model)
            processed.append(result)
            logger.info("Analysis completed for scan %s", payload.get("scanId"))
            if receipt_handle:
                sqs_client.delete_message(
                    QueueUrl=source_queue_url,
                    ReceiptHandle=receipt_handle,
                )
        except Exception as error:
            scan_id = payload.get("scanId") if payload else None
            if not scan_id:
                logger.exception("Analysis job is invalid and will be retried")
                continue

            failure_payload = {
                "eventType": "ANALYSIS_FAILED",
                "status": "FAILED",
                "scanId": scan_id,
                "businessId": payload.get("businessId"),
                "shelfId": payload.get("shelfId"),
                "userId": payload.get("userId"),
                "bucket": payload.get("bucket"),
                "objectKey": payload.get("objectKey"),
                "contentType": payload.get("contentType"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "errorMessage": str(error),
            }

            try:
                _send_result(failure_payload)
            except Exception:
                logger.exception(
                    "Could not publish failure result for scan %s; leaving job for retry",
                    scan_id,
                )
                continue

            logger.error("Analysis failed for scan %s: %s", scan_id, error)
            if receipt_handle:
                sqs_client.delete_message(
                    QueueUrl=source_queue_url,
                    ReceiptHandle=receipt_handle,
                )

    return processed


def run_worker_loop(
    detection_model: Any,
    freshness_model: Any,
    poll_interval_seconds: float = 5.0,
) -> None:
    while True:
        try:
            consume_messages(
                detection_model=detection_model,
                freshness_model=freshness_model,
            )
        except Exception:
            logger.exception("Analysis worker iteration failed")
            time.sleep(poll_interval_seconds)
            continue

        time.sleep(poll_interval_seconds)


def start_worker_thread(
    detection_model: Any,
    freshness_model: Any,
    poll_interval_seconds: float = 5.0,
) -> threading.Thread:
    worker = threading.Thread(
        target=run_worker_loop,
        args=(detection_model, freshness_model, poll_interval_seconds),
        daemon=True,
        name="snapstock-analysis-worker",
    )
    worker.start()
    return worker
