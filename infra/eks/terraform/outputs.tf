output "app_public_ip" {
  description = "Elastic IP of the application (NLB)."
  value       = aws_eip.app.public_ip
}

output "app_url" {
  value = local.app_url
}

output "domain_url" {
  value = "https://${var.domain_name} (active when enable_https = true)"
}

output "backend_health_url" {
  value = "${local.app_url}/snapstock-backend-http/health"
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "kubeconfig_command" {
  value = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "scaling_summary" {
  value = <<-EOT
    backend  : 2-6 replicas (KEDA, CPU 65%)
    frontend : 2-4 replicas (KEDA, CPU 70%)
    ai       : 2-8 replicas (KEDA, CPU 60%) on workload=ai nodes
    nodes    : system 2-3 x ${join(",", var.system_instance_types)}, ai 2-${var.ai_max_nodes} x ${var.ai_instance_type} (cluster-autoscaler)
  EOT
}
