# Static public IP for the application, attached to the internet-facing NLB that the AWS Load
# Balancer Controller creates for the frontend Service (see app.tf).
#
# An NLB needs one Elastic IP per enabled subnet/AZ. It must be enabled in every AZ the frontend
# pods can run in: targets in an AZ the NLB does not serve are "Target.NotInUse" and the site goes
# down (happened when the pods were rescheduled into the other AZ after a pause/resume).
# With cross-zone load balancing on, the primary IP (aws_eip.app) reaches pods in either AZ, so
# it stays the single address to use.

resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "${var.name}-app"
  }
}

resource "aws_eip" "app_secondary" {
  domain = "vpc"

  tags = {
    Name = "${var.name}-app-secondary"
  }
}

locals {
  app_public_subnets = module.vpc.public_subnets

  # The controller pairs the i-th allocation with the i-th subnet of ITS OWN subnet ordering,
  # which here is [ap-south-1b, ap-south-1a] (observed in its model), not the annotation order.
  # The NLB was created with the primary IP in ap-south-1a and AWS forbids moving an attached
  # Elastic IP, so the primary allocation must come second.
  app_eip_allocations = [aws_eip.app_secondary.allocation_id, aws_eip.app.allocation_id]
}
