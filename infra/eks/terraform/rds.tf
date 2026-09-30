# PostgreSQL for the backend. Private subnets only; reachable from the EKS nodes.

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_security_group" "rds" {
  name        = "${var.name}-rds"
  description = "PostgreSQL from EKS nodes"
  vpc_id      = module.vpc.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_nodes" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = module.eks.node_security_group_id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

# The backend's TypeORM data source connects with a plain URL (no ssl option), so the
# in-VPC connection is not forced to TLS. The DB is private and SG-restricted.
resource "aws_db_parameter_group" "pg" {
  name_prefix = "${var.name}-pg16-"
  family      = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "0"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.name}-pg"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "snapstock"
  username = "snapstock"
  password = random_password.db.result

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.pg.name
  publicly_accessible    = false
  multi_az               = var.db_multi_az

  backup_retention_period      = 1 # Free plan maximum
  deletion_protection          = true
  skip_final_snapshot          = false
  final_snapshot_identifier    = "${var.name}-pg-final"
  auto_minor_version_upgrade   = true
  performance_insights_enabled = false

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [engine_version]
  }
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.name}/database"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.db.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}
