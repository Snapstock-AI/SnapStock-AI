#!/bin/sh

set -eu

bucket="${S3_UPLOAD_BUCKET:-${S3_BUCKET_NAME:-snapstock-uploads}}"
request_queue="${ANALYSIS_REQUEST_QUEUE_NAME:-snapstock-analysis-jobs}"
result_queue="${ANALYSIS_RESULT_QUEUE_NAME:-snapstock-analysis-results}"

awslocal s3api head-bucket --bucket "$bucket" 2>/dev/null || \
  awslocal s3api create-bucket \
    --bucket "$bucket"

create_queue_with_dlq() {
  queue_name="$1"
  dlq_name="${queue_name}-dlq"

  awslocal sqs create-queue --queue-name "$dlq_name" >/dev/null
  dlq_url="$(awslocal sqs get-queue-url --queue-name "$dlq_name" --query QueueUrl --output text)"
  dlq_arn="$(awslocal sqs get-queue-attributes --queue-url "$dlq_url" --attribute-names QueueArn --query Attributes.QueueArn --output text)"

  redrive_policy="{\"deadLetterTargetArn\":\"$dlq_arn\",\"maxReceiveCount\":\"3\"}"
  queue_attributes="$(python -c 'import json, sys; print(json.dumps({"RedrivePolicy": sys.argv[1]}))' "$redrive_policy")"
  awslocal sqs create-queue \
    --queue-name "$queue_name" \
    --attributes "$queue_attributes" \
    >/dev/null
}

create_queue_with_dlq "$request_queue"
create_queue_with_dlq "$result_queue"

echo "LocalStack resources initialized: S3 bucket $bucket, queues $request_queue and $result_queue"