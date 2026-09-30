# SnapStock on EKS (ALB + KEDA + Cluster Autoscaler)

Independent of the old K3s server and of `infra/terraform`. Nothing here imports existing resources.

```
Internet -> NLB (Elastic IP) -> frontend (nginx) --/snapstock-backend-http/--> backend -> RDS Postgres

Scan analysis (event-driven, events.tf):
  browser --presigned POST--> S3 scans bucket
  backend --IMAGE_UPLOADED--> SQS jobs --> AI worker (workload=ai nodes)
  AI worker --ANALYSIS_COMPLETED/FAILED--> SQS results --> backend consumer --> RDS
KEDA scales AI on jobs-queue depth + CPU | Cluster Autoscaler scales nodes
```

Pods reach S3/SQS through IRSA roles (`snapstock-backend`, `snapstock-ai`, and `keda-operator`
for the queue-depth scaler). Both queues have DLQs (5 receives). The synchronous
`/detection/analyze` endpoint remains for the mobile app and as the web fallback.
Local development uses LocalStack (`docker compose up -d localstack`, see `.env.example`).

## Before you start (gates)
1. **AI `/analyze` must not crash** in Docker (exit 139 investigation in the deployment guide).
2. **Frontend image with the nginx proxy**: push the `client/` change to `dev`, let
   `.github/workflows/frontend-image.yml` build `snapstock-client:dev-<sha>`, and use that tag as `frontend_image_tag`.
3. Rotate the IAM access key that was pasted into chat earlier.

## Apply in stages (costs start at stage 2: about $320/month baseline)
```powershell
# 1. State bucket (once)
cd infra/eks/bootstrap
terraform init; terraform apply
terraform output -raw backend_config > ../terraform/backend.hcl

# 2. Network + cluster
cd ../terraform
copy terraform.tfvars.example terraform.tfvars      # fill in values, never commit
terraform init -backend-config=backend.hcl
terraform apply -target=module.vpc -target=module.eks

# 3. Everything else (add-ons, RDS, secret, app chart, ALB)
terraform plan -out=tfplan
terraform apply tfplan
terraform output          # app_url, backend_health_url, rds_endpoint, kubeconfig_command
```
Then set `client_url` in `terraform.tfvars` to the printed `app_url` and apply again.

## CI (optional, after stage 3)
Set GitHub repository variables `EKS_CLUSTER_NAME` (= `snapstock-prod`) and `EKS_DEPLOY_ROLE_ARN`
(`terraform output github_deploy_role_arn`). The `*-eks` jobs in the three image workflows then run
`helm upgrade --reset-then-reuse-values --set <svc>.image.tag=<sha>`. Without those variables they are skipped and the
existing K3s deploys continue unchanged.

## Verify
```powershell
aws eks update-kubeconfig --region ap-south-1 --name snapstock-prod
kubectl get nodes -L workload
kubectl -n snapstock get pods,scaledobject -o wide
curl http://<alb>/health ; curl http://<alb>/snapstock-backend-http/health
```

## Teardown
`terraform destroy` in `infra/eks/terraform` will refuse to delete RDS (`deletion_protection`, `prevent_destroy`) on purpose.
Remove those guards deliberately if you really want to delete the database. The state bucket lives in `bootstrap/` and is kept.
