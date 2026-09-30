locals {
  ca_tags = {
    "k8s.io/cluster-autoscaler/enabled"     = "true"
    "k8s.io/cluster-autoscaler/${var.name}" = "owned"
  }

  ai_labels = { workload = "ai" }

  ai_taints = {
    ai = {
      key    = "workload"
      value  = "ai"
      effect = "NO_SCHEDULE"
    }
  }

  # AI image (~5 GB) + models need room.
  ai_disk = {
    xvda = {
      device_name = "/dev/xvda"
      ebs = {
        volume_size           = 50
        volume_type           = "gp3"
        delete_on_termination = true
      }
    }
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name               = var.name
  kubernetes_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  endpoint_public_access                   = true
  enable_irsa                              = true
  enable_cluster_creator_admin_permissions = true

  # GitHub Actions deploys with this role (see github.tf).
  access_entries = {
    github = {
      principal_arn = aws_iam_role.github_deploy.arn
      policy_associations = {
        admin = {
          policy_arn   = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
  }

  addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni = {
      before_compute = true
    }
    metrics-server = {}
  }

  # Instance types are limited to the account's allowed (free-tier-eligible) list.
  eks_managed_node_groups = {
    # Backend, frontend, load balancer controller, KEDA, autoscaler.
    system = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = var.system_instance_types
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      max_size       = 3
      desired_size   = 2
      labels         = { workload = "platform" }
      tags           = local.ca_tags
    }

    # AI inference nodes: one AI pod per node.
    ai = {
      ami_type              = "AL2023_x86_64_STANDARD"
      instance_types        = [var.ai_instance_type]
      capacity_type         = "ON_DEMAND"
      min_size              = 2
      max_size              = var.ai_max_nodes
      desired_size          = 2
      labels                = local.ai_labels
      taints                = local.ai_taints
      block_device_mappings = local.ai_disk
      tags                  = local.ca_tags
    }
  }
}
