import json
import os
from unittest.mock import Mock

from app.messaging.sqs_worker import process_message
from app.messaging.sqs_worker import consume_messages


def test_process_message_downloads_image_and_publishes_analysis_result(monkeypatch):
    monkeypatch.setenv("SQS_ANALYSIS_RESULT_QUEUE_URL", "https://sqs.ap-south-1.amazonaws.com/123456789012/results")
    fake_s3 = Mock()
    fake_s3.get_object.return_value = {
        "Body": Mock(read=Mock(return_value=b"fake-image-bytes"))
    }

    fake_sqs = Mock()
    fake_sqs.send_message.return_value = {"MessageId": "msg-1"}

    fake_analysis = {
        "image_width": 640,
        "image_height": 480,
        "total_count": 1,
        "counts": {"apple": {"fresh": 1, "rotten": 0, "total": 1}},
        "detections": [
            {
                "class_name": "apple",
                "confidence": 0.91,
                "bounding_box": {"x1": 10, "y1": 10, "x2": 60, "y2": 60},
                "freshness": "good",
                "freshness_confidence": 0.88,
                "freshness_confidence_percent": 88.0,
                "explanation": "ok",
            }
        ],
    }

    monkeypatch.setattr("app.messaging.sqs_worker.get_s3_client", lambda: fake_s3)
    monkeypatch.setattr("app.messaging.sqs_worker.get_sqs_client", lambda: fake_sqs)
    monkeypatch.setattr(
        "app.messaging.sqs_worker.analyze_image",
        lambda *_args, **_kwargs: fake_analysis,
    )

    message = {
        "eventType": "IMAGE_UPLOADED",
        "scanId": "scan-123",
        "businessId": "business-123",
        "shelfId": "shelf-456",
        "userId": "user-789",
        "bucket": "snapstock-ai-images-471547181436",
        "objectKey": "business-123/scan-123/image.jpg",
        "contentType": "image/jpeg",
        "timestamp": "2026-09-21T00:00:00.000Z",
    }

    result = process_message(message, detection_model=Mock(), freshness_model=Mock())

    assert result["eventType"] == "ANALYSIS_COMPLETED"
    assert result["scanId"] == "scan-123"
    assert result["businessId"] == "business-123"
    assert result["shelfId"] == "shelf-456"
    assert result["userId"] == "user-789"
    assert result["status"] == "COMPLETED"
    assert result["data"]["total_count"] == 1

    fake_s3.get_object.assert_called_once_with(
        Bucket="snapstock-ai-images-471547181436",
        Key="business-123/scan-123/image.jpg",
    )
    fake_sqs.send_message.assert_called_once()
    payload = json.loads(fake_sqs.send_message.call_args.kwargs["MessageBody"])
    assert payload["eventType"] == "ANALYSIS_COMPLETED"
    assert payload["scanId"] == "scan-123"


def test_consume_messages_publishes_failure_and_deletes_job(monkeypatch):
    monkeypatch.setenv("SQS_ANALYSIS_JOB_QUEUE_URL", "https://sqs.ap-south-1.amazonaws.com/123456789012/jobs")
    monkeypatch.setenv("SQS_ANALYSIS_RESULT_QUEUE_URL", "https://sqs.ap-south-1.amazonaws.com/123456789012/results")

    fake_sqs = Mock()
    fake_sqs.receive_message.return_value = {
        "Messages": [
            {
                "ReceiptHandle": "receipt-1",
                "Body": json.dumps({
                    "eventType": "IMAGE_UPLOADED",
                    "scanId": "scan-123",
                    "businessId": "business-123",
                    "objectKey": "business-123/scan-123/image.jpg",
                }),
            }
        ]
    }
    monkeypatch.setattr("app.messaging.sqs_worker.get_sqs_client", lambda: fake_sqs)
    monkeypatch.setattr(
        "app.messaging.sqs_worker.process_message",
        Mock(side_effect=RuntimeError("model inference failed")),
    )

    consume_messages(
        detection_model=Mock(),
        freshness_model=Mock(),
    )

    result_call = fake_sqs.send_message.call_args
    failure_payload = json.loads(result_call.kwargs["MessageBody"])
    assert failure_payload["eventType"] == "ANALYSIS_FAILED"
    assert failure_payload["scanId"] == "scan-123"
    assert failure_payload["errorMessage"] == "model inference failed"
    fake_sqs.delete_message.assert_called_once_with(
        QueueUrl="https://sqs.ap-south-1.amazonaws.com/123456789012/jobs",
        ReceiptHandle="receipt-1",
    )
