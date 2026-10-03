#!/bin/sh
# Creates real-AWS resources for running the event-driven scan pipeline from a laptop:
#   S3 bucket for scan uploads (browser presigned POST from the Vite dev server)
#   SQS jobs + results queues, each with a DLQ
# Mirrors infra/eks/terraform/events.tf, but with a separate "snapstock-dev" prefix so local
# runs never share queues with the EKS stack (each backend would consume and drop the
# other's results). Idempotent: safe to run again.
#
# Uses the caller's AWS CLI credentials (default profile). Usage (Git Bash):
#   MSYS_NO_PATHCONV=1 sh infra/dev-aws/setup-dev-aws.sh
set -eu

region="${AWS_REGION:-ap-south-1}"
prefix="${DEV_PREFIX:-snapstock-dev}"
account="$(aws sts get-caller-identity --query Account --output text)"
bucket="${prefix}-scans-${account}"
allowed_origins="${S3_CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"
tmp="$(mktemp -d)"
# Windows aws.exe cannot read Git Bash paths like /tmp/...; hand it a native path.
filearg() { if command -v cygpath >/dev/null 2>&1; then echo "file://$(cygpath -m "$1")"; else echo "file://$1"; fi; }

# ---- S3 ------------------------------------------------------------------------
if ! aws s3api head-bucket --bucket "$bucket" --region "$region" 2>/dev/null; then
  aws s3api create-bucket --bucket "$bucket" --region "$region" \
    --create-bucket-configuration "LocationConstraint=$region" >/dev/null
fi

aws s3api put-public-access-block --bucket "$bucket" --region "$region" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-encryption --bucket "$bucket" --region "$region" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

origins_json="$(printf '%s' "$allowed_origins" | sed 's/[^,][^,]*/"&"/g')"
cat > "$tmp/cors.json" <<JSON
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
aws s3api put-bucket-cors --bucket "$bucket" --region "$region" \
  --cors-configuration "$(filearg "$tmp/cors.json")"

# Dev images are throw-away.
aws s3api put-bucket-lifecycle-configuration --bucket "$bucket" --region "$region" \
  --lifecycle-configuration \
  '{"Rules":[{"ID":"expire-scan-images","Status":"Enabled","Filter":{"Prefix":"scans/"},"Expiration":{"Days":7}}]}'

# ---- SQS -----------------------------------------------------------------------
# create_queue <name> <visibility-timeout-seconds>
create_queue() {
  name="$1"
  visibility="$2"

  dlq_url="$(aws sqs create-queue --region "$region" --queue-name "${name}-dlq" \
    --attributes MessageRetentionPeriod=1209600,SqsManagedSseEnabled=true \
    --query QueueUrl --output text)"
  dlq_arn="$(aws sqs get-queue-attributes --region "$region" --queue-url "$dlq_url" \
    --attribute-names QueueArn --query Attributes.QueueArn --output text)"

  cat > "$tmp/${name}.json" <<JSON
{
  "VisibilityTimeout": "${visibility}",
  "ReceiveMessageWaitTimeSeconds": "20",
  "MessageRetentionPeriod": "345600",
  "SqsManagedSseEnabled": "true",
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"${dlq_arn}\",\"maxReceiveCount\":\"5\"}"
}
JSON
  aws sqs create-queue --region "$region" --queue-name "$name" \
    --attributes "$(filearg "$tmp/${name}.json")" --query QueueUrl --output text
}

job_url="$(create_queue "${prefix}-analysis-jobs" 180)"
result_url="$(create_queue "${prefix}-analysis-results" 60)"
rm -rf "$tmp"

cat <<EOF

Done. Put these in the root .env (backend and AI service both read them):

AWS_REGION=${region}
S3_UPLOAD_BUCKET=${bucket}
SQS_ANALYSIS_JOB_QUEUE_URL=${job_url}
SQS_ANALYSIS_RESULT_QUEUE_URL=${result_url}

Leave AWS_ENDPOINT_URL unset. Start the AI service with the same file so its SQS worker runs:
  cd ai-service && ./venv/Scripts/python -m uvicorn app.main:app --port 8000 --env-file ../.env
EOF
