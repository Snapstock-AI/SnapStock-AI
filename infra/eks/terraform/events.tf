# Event-driven scan analysis (mirrors infra/localstack/init-aws.sh):
#
#   browser --presigned POST--> S3 (scans bucket)
#   backend --IMAGE_UPLOADED--> SQS jobs --> AI worker --ANALYSIS_*--> SQS results --> backend
#
# Pods get AWS access through IRSA (no static keys). KEDA scales the AI deployment on the
# jobs-queue depth.

locals {
  app_namespace = "snapstock"
}

# ---- S3: scan image uploads ----------------------------------------------------

resource "aws_s3_bucket" "scans" {
  bucket        = "${var.name}-scans-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "scans" {
  bucket                  = aws_s3_bucket.scans.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "scans" {
  bucket = aws_s3_bucket.scans.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Browsers upload straight to S3 from the app's origin.
resource "aws_s3_bucket_cors_configuration" "scans" {
  bucket = aws_s3_bucket.scans.id

  cors_rule {
    # Both the domain (https) and the IP keep working for browser uploads during and after the switch.
    allowed_origins = distinct(concat([local.app_url, local.ip_url], var.extra_cors_origins))
    allowed_methods = ["POST", "PUT", "GET", "HEAD"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "scans" {
  bucket = aws_s3_bucket.scans.id

  rule {
    id     = "expire-scan-images"
    status = "Enabled"

    filter {
      prefix = "scans/"
    }

    expiration {
      days = var.scan_image_retention_days
    }
  }
}

# ---- SQS: jobs (backend -> AI) and results (AI -> backend), each with a DLQ -------

resource "aws_sqs_queue" "analysis_jobs_dlq" {
  name                      = "${var.name}-analysis-jobs-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "analysis_jobs" {
  name                       = "${var.name}-analysis-jobs"
  visibility_timeout_seconds = 180 # one CPU inference takes a few seconds; leave headroom
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 345600
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.analysis_jobs_dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_sqs_queue" "analysis_results_dlq" {
  name                      = "${var.name}-analysis-results-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "analysis_results" {
  name                       = "${var.name}-analysis-results"
  visibility_timeout_seconds = 60
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 345600
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.analysis_results_dlq.arn
    maxReceiveCount     = 5
  })
}

# ---- IAM (IRSA): least privilege per workload ----------------------------------------

data "aws_iam_policy_document" "backend_events" {
  statement {
    sid       = "ScanUploads" # presign uploads, verify the object exists
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.scans.arn}/scans/*"]
  }

  statement {
    sid       = "PublishJobs"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.analysis_jobs.arn]
  }

  statement {
    sid = "ConsumeResults"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes",
    ]
    resources = [aws_sqs_queue.analysis_results.arn]
  }
}

data "aws_iam_policy_document" "ai_events" {
  statement {
    sid       = "ReadScanImages"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.scans.arn}/scans/*"]
  }

  statement {
    sid = "ConsumeJobs"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes",
    ]
    resources = [aws_sqs_queue.analysis_jobs.arn]
  }

  statement {
    sid       = "PublishResults"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.analysis_results.arn]
  }
}

# KEDA reads the jobs-queue depth to scale the AI deployment.
data "aws_iam_policy_document" "keda_events" {
  statement {
    actions   = ["sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.analysis_jobs.arn]
  }
}

resource "aws_iam_policy" "backend_events" {
  name   = "${var.name}-backend-events"
  policy = data.aws_iam_policy_document.backend_events.json
}

resource "aws_iam_policy" "ai_events" {
  name   = "${var.name}-ai-events"
  policy = data.aws_iam_policy_document.ai_events.json
}

resource "aws_iam_policy" "keda_events" {
  name   = "${var.name}-keda-events"
  policy = data.aws_iam_policy_document.keda_events.json
}

module "backend_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.60"

  role_name        = "${var.name}-backend"
  role_policy_arns = { events = aws_iam_policy.backend_events.arn }

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["${local.app_namespace}:snapstock-backend"]
    }
  }
}

module "ai_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.60"

  role_name        = "${var.name}-ai"
  role_policy_arns = { events = aws_iam_policy.ai_events.arn }

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["${local.app_namespace}:snapstock-ai"]
    }
  }
}

module "keda_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "~> 5.60"

  role_name        = "${var.name}-keda-operator"
  role_policy_arns = { events = aws_iam_policy.keda_events.arn }

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["keda:keda-operator"]
    }
  }
}

output "event_pipeline" {
  value = {
    scans_bucket      = aws_s3_bucket.scans.bucket
    jobs_queue_url    = aws_sqs_queue.analysis_jobs.url
    results_queue_url = aws_sqs_queue.analysis_results.url
    jobs_dlq_url      = aws_sqs_queue.analysis_jobs_dlq.url
    results_dlq_url   = aws_sqs_queue.analysis_results_dlq.url
  }
}
