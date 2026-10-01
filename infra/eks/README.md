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

## Before you start (first-time setup only)
1. **Images in ECR**: a brand-new stack has empty ECR repositories. Either let the pipelines push
   `dev-<sha>` images (after stage 2, with the repository variables below set), or push images
   yourself, then set `image_tags = { backend = "...", frontend = "...", ai = "..." }` in
   `terraform.tfvars` for the first `apply`. Later releases go through CI/CD.
2. Rotate the IAM access key that was pasted into chat earlier.

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

## Who deploys what

| Change | How it is deployed |
|---|---|
| **App code** (server/, client/, ai-service/) | **CI/CD**: push to `dev` -> tests -> image build -> push to GHCR + ECR (`dev-<commit>`) -> `helm upgrade --reset-then-reuse-values --set <svc>.image.tag=dev-<commit>` |
| **Infrastructure** (VPC, EKS, RDS, S3/SQS, IAM, chart settings) | **Terraform**: `terraform plan` + `terraform apply` in `infra/eks/terraform` |

Terraform does not pin app versions: `helm_release.snapstock` uses `reuse_values`, so an
apply keeps the image tags CI deployed last. Set `image_tags` in `terraform.tfvars` only for a
first install (empty ECR) or to deliberately pin a version.

The three pipelines share the `snapstock-eks-release` concurrency group, so releases run one
at a time (Helm locks the release).

### Enable CI/CD deploys
Set these GitHub repository variables (Settings -> Secrets and variables -> Actions -> Variables):

| Variable | Value |
|---|---|
| `EKS_CLUSTER_NAME` | `snapstock-prod` |
| `EKS_DEPLOY_ROLE_ARN` | `terraform output -raw github_deploy_role_arn` |
| `AWS_REGION` | `ap-south-1` |

Without them the EKS jobs are skipped (build and tests still run). Deploy jobs need the cluster
running: if it is paused (`pause.ps1`), run `resume.ps1` first or the rollout times out.
The legacy K3s/SSM deploy jobs only run when `K3S_DEPLOY_ENABLED` is `true`.

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
