data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name = var.name
  cidr = var.vpc_cidr
  azs  = local.azs

  private_subnets  = [cidrsubnet(var.vpc_cidr, 4, 0), cidrsubnet(var.vpc_cidr, 4, 1)] # /20 for pods
  public_subnets   = [cidrsubnet(var.vpc_cidr, 8, 128), cidrsubnet(var.vpc_cidr, 8, 129)]
  database_subnets = [cidrsubnet(var.vpc_cidr, 8, 140), cidrsubnet(var.vpc_cidr, 8, 141)]

  create_database_subnet_group = true

  enable_dns_hostnames = true

  # One NAT gateway keeps cost down. Nodes need it for GHCR and Hugging Face.
  enable_nat_gateway = true
  single_nat_gateway = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}
