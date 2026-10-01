variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "name" {
  description = "Prefix for all resources."
  type        = string
  default     = "snapstock-prod"
}

variable "kubernetes_version" {
  description = "EKS version. Check `aws eks describe-addon-versions` for what the region supports."
  type        = string
  default     = "1.34"
}

variable "vpc_cidr" {
  description = "Separate from the old K3s VPC (10.20.0.0/16)."
  type        = string
  default     = "10.30.0.0/16"
}

# ---- Node groups --------------------------------------------------------------

# The account is on the AWS Free plan: only free-tier-eligible types can launch
# (c7i-flex.large, m7i-flex.large, t3.small, ...). Check with:
#   aws ec2 describe-instance-types --filters Name=free-tier-eligible,Values=true

variable "system_instance_types" {
  description = "2 vCPU / 4 GB."
  type        = list(string)
  default     = ["c7i-flex.large"]
}

variable "ai_instance_type" {
  description = "2 vCPU / 8 GB, one AI pod per node."
  type        = string
  default     = "m7i-flex.large"
}

variable "ai_max_nodes" {
  type    = number
  default = 3
}

# ---- Database -------------------------------------------------------------------

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_multi_az" {
  description = "Turn on when the client needs database high availability (doubles RDS cost)."
  type        = bool
  default     = false
}

# ---- Application ----------------------------------------------------------------

# App versions are released by CI/CD (helm upgrade --set <svc>.image.tag=dev-<sha>).
# Terraform keeps whatever is deployed (helm_release reuse_values). Set image tags here only
# for a first-time install or to deliberately pin a version, e.g.
#   image_tags = { backend = "dev-<sha>", frontend = "dev-<sha>", ai = "dev-<sha>" }
variable "image_tags" {
  description = "Optional image tag overrides per service (backend, frontend, ai). Empty = keep the deployed versions."
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for k in keys(var.image_tags) : contains(["backend", "frontend", "ai"], k)])
    error_message = "image_tags keys must be backend, frontend or ai."
  }
}

variable "certificate_arn" {
  description = "ACM certificate ARN. Empty = HTTP only (use once a domain exists)."
  type        = string
  default     = ""
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "google_client_id" {
  type    = string
  default = ""
}

variable "smtp_host" {
  type    = string
  default = ""
}

variable "smtp_port" {
  type    = string
  default = "587"
}

variable "smtp_user" {
  type    = string
  default = ""
}

variable "smtp_pass" {
  type      = string
  sensitive = true
  default   = ""
}

# ---- CI/CD ----------------------------------------------------------------------

variable "github_repo" {
  type    = string
  default = "Snapstock-AI/SnapStock-AI"
}

variable "github_branch" {
  type    = string
  default = "dev"
}

# ---- Event-driven analysis ----------------------------------------------------------

variable "extra_cors_origins" {
  description = "Additional browser origins allowed to upload to the scans bucket (e.g. a future domain)."
  type        = list(string)
  default     = []
}

variable "scan_image_retention_days" {
  description = "Uploaded scan images are deleted after this many days."
  type        = number
  default     = 90
}

# ---- Public domain and HTTPS (see https.tf) ------------------------------------------

variable "domain_name" {
  description = "Public hostname of the app. Its DNS is managed outside AWS (name.com)."
  type        = string
  default     = "snapstock.rashmika.dev"
}

variable "enable_https" {
  description = "Serve the app on https://domain_name (needs the ACM certificate issued and the frontend nginx redirect deployed). Set false only when bootstrapping a new stack."
  type        = bool
  default     = true
}
