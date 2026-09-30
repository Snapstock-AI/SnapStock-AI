locals {
  app_url = "http://${aws_eip.app.public_ip}"
}

resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = "snapstock"
  }

  depends_on = [module.eks]
}

resource "kubernetes_secret_v1" "backend" {
  metadata {
    name      = "snapstock-backend-secrets"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  data = {
    DATABASE_URL = "postgres://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
    JWT_SECRET   = var.jwt_secret
    CLIENT_URL   = local.app_url
    # E-mail links (verify, reset, invitation) open the backend's own pages through the nginx proxy.
    SERVER_PUBLIC_URL = "${local.app_url}/snapstock-backend-http"
    # HTTP only (no certificate yet): stop the CSP from forcing form posts to https.
    CSP_UPGRADE_INSECURE = var.certificate_arn == "" ? "false" : "true"
    GOOGLE_CLIENT_ID     = var.google_client_id
    SMTP_HOST            = var.smtp_host
    SMTP_PORT            = var.smtp_port
    SMTP_USER            = var.smtp_user
    SMTP_PASS            = var.smtp_pass
  }
}

resource "helm_release" "snapstock" {
  name      = "snapstock"
  namespace = kubernetes_namespace_v1.app.metadata[0].name
  chart     = "${path.module}/../../../deploy/helm/snapstock"

  # Migration Job (pre-install hook) and first pod start can take a while: models download.
  timeout = 1800
  wait    = true

  values = [yamlencode({
    backend  = { image = { repository = aws_ecr_repository.app["snapstock-server"].repository_url, tag = var.backend_image_tag } }
    frontend = { image = { repository = aws_ecr_repository.app["snapstock-client"].repository_url, tag = var.frontend_image_tag } }
    ai       = { image = { repository = aws_ecr_repository.app["snapstock-ai-service"].repository_url, tag = var.ai_image_tag } }
    events = {
      enabled        = true
      region         = var.region
      bucket         = aws_s3_bucket.scans.bucket
      jobQueueUrl    = aws_sqs_queue.analysis_jobs.url
      resultQueueUrl = aws_sqs_queue.analysis_results.url
    }
    serviceAccounts = {
      backend = { roleArn = module.backend_irsa.iam_role_arn }
      ai      = { roleArn = module.ai_irsa.iam_role_arn }
    }
    exposure = "nlb-eip"
    publicService = {
      eipAllocation = join(",", local.app_eip_allocations)
      subnet        = join(",", local.app_public_subnets)
    }
    ingress = { certificateArn = var.certificate_arn }
  })]

  depends_on = [
    helm_release.aws_lb_controller,
    helm_release.keda,
    aws_s3_bucket_cors_configuration.scans,
    helm_release.cluster_autoscaler,
    kubernetes_secret_v1.backend,
    aws_vpc_security_group_ingress_rule.rds_from_nodes,
  ]
}
