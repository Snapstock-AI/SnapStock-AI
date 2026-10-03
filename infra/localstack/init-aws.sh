#!/bin/sh
# Creates the local event-driven analysis resources in LocalStack (runs on container start):
#   S3 bucket for scan uploads (browser uploads with a presigned POST, so CORS allows POST)
#   SQS jobs queue (backend -> AI worker) and results queue (AI worker -> backend), each with a DLQ
# Mirrors infra/eks/terraform/events.tf.
set -eu

bucket="${S3_UPLOAD_BUCKET:-snapstock-uploads}"
job_queue="${ANALYSIS_JOB_QUEUE_NAME:-snapstock-analysis-jobs}"
result_queue="${ANALYSIS_RESULT_QUEUE_NAME:-snapstock-analysis-results}"
allowed_origins="${S3_CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"

region="${AWS_DEFAULT_REGION:-ap-south-1}"
if ! awslocal s3api head-bucket --bucket "$bucket" 2>/dev/null; then
  if [ "$region" = "us-east-1" ]; then
    awslocal s3api create-bucket --bucket "$bucket"
  else
    awslocal s3api create-bucket --bucket "$bucket" --create-bucket-configuration "LocationConstraint=$region"
  fi
fi

origins_json="$(printf '%s' "$allowed_origins" | sed 's/[^,][^,]*/"&"/g')"
cat > /tmp/s3-cors.json <<JSON
{
  "CORSRules": [
    {
      "AllowedOrigins": [${origins_json}],
      "AllowedMethods": ["POST", "PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
JSON
awslocal s3api put-bucket-cors --bucket "$bucket" --cors-configuration file:///tmp/s3-cors.json

# create_queue <name> <visibility-timeout-seconds>
create_queue() {
  name="$1"
  visibility="$2"

  awslocal sqs create-queue --queue-name "${name}-dlq" >/dev/null
  dlq_url="$(awslocal sqs get-queue-url --queue-name "${name}-dlq" --query QueueUrl --output text)"
  dlq_arn="$(awslocal sqs get-queue-attributes --queue-url "$dlq_url" --attribute-names QueueArn --query Attributes.QueueArn --output text)"

  cat > "/tmp/${name}.json" <<JSON
{
  "VisibilityTimeout": "${visibility}",
  "ReceiveMessageWaitTimeSeconds": "20",
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"${dlq_arn}\",\"maxReceiveCount\":\"5\"}"
}
JSON
  awslocal sqs create-queue --queue-name "$name" --attributes "file:///tmp/${name}.json" >/dev/null
}

# Jobs take up to ~2 minutes on CPU; results are quick to persist.
create_queue "$job_queue" 180
create_queue "$result_queue" 60

echo "LocalStack ready: s3://$bucket, SQS $job_queue and $result_queue (with DLQs)"
