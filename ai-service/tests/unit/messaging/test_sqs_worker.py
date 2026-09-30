import io
import json
from unittest.mock import MagicMock

import pytest

from app.common.exceptions import InvalidImageError
from app.messaging import sqs_worker


@pytest.fixture(autouse=True)
def queues(monkeypatch):
    monkeypatch.setenv("SQS_ANALYSIS_JOB_QUEUE_URL", "https://sqs/jobs")
    monkeypatch.setenv("SQS_ANALYSIS_RESULT_QUEUE_URL", "https://sqs/results")


def job(**overrides):
    body = {
        "eventType": "IMAGE_UPLOADED",
        "scanId": "scan-1",
        "bucket": "scan-bucket",
        "objectKey": "scans/biz/scan-1/apple.jpg",
    }
    body.update(overrides)
    return body


def record(body, attempts=1):
    return {
        "Body": body if isinstance(body, str) else json.dumps(body),
        "ReceiptHandle": "rh-1",
        "Attributes": {"ApproximateReceiveCount": str(attempts)},
    }


def s3_with_image():
    s3 = MagicMock()
    s3.get_object.return_value = {"Body": io.BytesIO(b"image-bytes")}
    return s3


def sent_results(sqs):
    return [json.loads(call.kwargs["MessageBody"]) for call in sqs.send_message.call_args_list]


def test_completed_job_publishes_result_and_is_deleted(monkeypatch):
    analysis = MagicMock()
    analysis.model_dump.return_value = {"total_count": 1, "detections": [{"class_name": "apple"}]}
    analyze = MagicMock(return_value=analysis)
    monkeypatch.setattr(sqs_worker, "analyze_image", analyze)
    s3, sqs = s3_with_image(), MagicMock()

    assert sqs_worker.handle_message(record(job()), "det", "fresh", s3, sqs) is True

    s3.get_object.assert_called_once_with(Bucket="scan-bucket", Key="scans/biz/scan-1/apple.jpg")
    analyze.assert_called_once_with("det", "fresh", b"image-bytes")
    [result] = sent_results(sqs)
    assert result["eventType"] == "ANALYSIS_COMPLETED"
    assert result["scanId"] == "scan-1"
    assert result["data"]["total_count"] == 1
    assert sqs.send_message.call_args.kwargs["QueueUrl"] == "https://sqs/results"


def test_unreadable_image_is_reported_failed_without_retry(monkeypatch):
    monkeypatch.setattr(
        sqs_worker, "analyze_image", MagicMock(side_effect=InvalidImageError("Invalid image file."))
    )
    sqs = MagicMock()

    assert sqs_worker.handle_message(record(job()), "det", "fresh", s3_with_image(), sqs) is True

    [result] = sent_results(sqs)
    assert result == {
        "eventType": "ANALYSIS_FAILED",
        "scanId": "scan-1",
        "timestamp": result["timestamp"],
        "errorMessage": "Invalid image file.",
    }


def test_transient_error_is_retried_via_sqs(monkeypatch):
    monkeypatch.setattr(sqs_worker, "analyze_image", MagicMock())
    s3 = MagicMock()
    s3.get_object.side_effect = ConnectionError("S3 unreachable")
    sqs = MagicMock()

    assert sqs_worker.handle_message(record(job(), attempts=1), "det", "fresh", s3, sqs) is False
    sqs.send_message.assert_not_called()


def test_transient_error_on_last_attempt_fails_the_scan(monkeypatch):
    s3 = MagicMock()
    s3.get_object.side_effect = ConnectionError("S3 unreachable")
    sqs = MagicMock()

    attempts = sqs_worker.MAX_ATTEMPTS
    assert sqs_worker.handle_message(record(job(), attempts=attempts), "det", "fresh", s3, sqs) is True

    [result] = sent_results(sqs)
    assert result["eventType"] == "ANALYSIS_FAILED"
    assert result["scanId"] == "scan-1"


def test_unsupported_event_is_reported_failed(monkeypatch):
    sqs = MagicMock()

    assert sqs_worker.handle_message(record(job(eventType="SOMETHING_ELSE")), "d", "f", MagicMock(), sqs) is True
    [result] = sent_results(sqs)
    assert result["eventType"] == "ANALYSIS_FAILED"


def test_garbage_message_is_dropped_without_result():
    sqs = MagicMock()

    assert sqs_worker.handle_message(record("not json"), "d", "f", MagicMock(), sqs) is True
    sqs.send_message.assert_not_called()


def test_poll_once_deletes_only_finished_records(monkeypatch):
    sqs = MagicMock()
    sqs.receive_message.return_value = {"Messages": [record(job())]}
    monkeypatch.setattr(sqs_worker, "handle_message", MagicMock(return_value=True))

    assert sqs_worker.poll_once("d", "f", MagicMock(), sqs) == 1
    sqs.delete_message.assert_called_once_with(QueueUrl="https://sqs/jobs", ReceiptHandle="rh-1")


def test_worker_disabled_without_queues(monkeypatch):
    monkeypatch.delenv("SQS_ANALYSIS_JOB_QUEUE_URL")

    assert sqs_worker.is_enabled() is False
    assert sqs_worker.start_worker_thread("d", "f") is None
