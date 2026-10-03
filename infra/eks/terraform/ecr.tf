# Private registries for images that are not on GHCR yet:
#   snapstock-client      - frontend built with the nginx backend proxy
#   snapstock-ai-service  - AI image built with CPU-only PyTorch (fixes the exit-139 crash)
#   snapstock-server      - backend with the invitation confirm page (branch fix/invitation-confirm-page)
# Nodes pull from them with their default ECR read-only node role.

locals {
  ecr_repos = toset(["snapstock-client", "snapstock-ai-service", "snapstock-server"])
}

resource "aws_ecr_repository" "app" {
  for_each             = local.ecr_repos
  name                 = each.key
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = local.ecr_repos
  repository = aws_ecr_repository.app[each.key].name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

output "ecr_repositories" {
  value = { for k, r in aws_ecr_repository.app : k => r.repository_url }
}
