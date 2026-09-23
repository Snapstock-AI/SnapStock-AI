# AWS analysis hardening

## Queue configuration

Deploy `event-driven-hardening.yaml` in `ap-south-1` after reviewing the existing queue names. It configures:

- 15-minute job visibility timeout for model inference
- 2-minute result visibility timeout for backend persistence
- three receives before moving a message to a DLQ
- 20-second long polling
- backlog and DLQ CloudWatch alarms

The 15-minute job timeout must be longer than the slowest model inference. If inference exceeds it, increase the queue timeout before production use.

## Worker permissions

Attach `analysis-worker-iam-policy.json` to the IAM role used by the AI worker after replacing the bucket and account placeholders. The worker only needs `s3:GetObject`, SQS receive/delete/attributes on the jobs queue, and SQS send on the results queue.

## Persistent worker

Build and deploy `ai-service/Dockerfile` as a persistent service. Set these runtime variables through the deployment secret manager, not in the image:

- `AWS_REGION`
- `S3_UPLOAD_BUCKET`
- `SQS_ANALYSIS_JOB_QUEUE_URL`
- `SQS_ANALYSIS_RESULT_QUEUE_URL`

Leave `AWS_ENDPOINT_URL` unset for real AWS. Configure the container platform to restart the task on exit and forward stdout/stderr to CloudWatch Logs.
