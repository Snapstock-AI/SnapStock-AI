# HTTPS for the public app (Option B: keep the NLB and its Elastic IP, add a TLS listener).
#
#   https://<domain_name>  --443/TLS (ACM certificate)--> NLB --> nginx :8080 (app)
#   http://<domain_name>   --80--> NLB --> nginx :8081 (301 redirect to https)
#
# The domain's DNS is hosted outside AWS (name.com for rashmika.dev), so two records are added
# by hand there:
#   1. the ACM validation CNAME (output acm_validation_record)
#   2. an A record <domain_name> -> the app Elastic IP (output app_public_ip)
#
# Roll-out:
#   a) apply with enable_https = false: requests the certificate (free, auto-renewed)
#   b) add both DNS records; deploy a frontend image whose nginx listens on 8081
#   c) set enable_https = true and apply: waits for the certificate, adds the 443 listener,
#      switches port 80 to the redirect and moves the app URLs to https://<domain_name>

resource "aws_acm_certificate" "app" {
  count             = var.domain_name == "" ? 0 : 1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Blocks until ACM reports the certificate as ISSUED (DNS record must exist).
resource "aws_acm_certificate_validation" "app" {
  count           = var.enable_https ? 1 : 0
  certificate_arn = aws_acm_certificate.app[0].arn
}

locals {
  https_certificate_arn = var.enable_https ? aws_acm_certificate_validation.app[0].certificate_arn : ""
  public_host           = var.enable_https ? var.domain_name : ""
}

output "acm_validation_record" {
  description = "Add this CNAME at the domain's DNS provider so ACM can issue the certificate."
  value = var.domain_name == "" ? null : {
    for o in aws_acm_certificate.app[0].domain_validation_options : o.domain_name => {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  }
}

output "acm_certificate_status" {
  value = var.domain_name == "" ? null : aws_acm_certificate.app[0].status
}
