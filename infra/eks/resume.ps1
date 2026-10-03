# Resume the SnapStock EKS stack after pause.ps1.
#
#   .\infra\eks\resume.ps1                    # start RDS, scale EKS nodes back up, wait for the app
#   .\infra\eks\resume.ps1 -IncludeOldServer  # also start the old K3s server
#
# Takes ~10-15 minutes: RDS start (~5 min), nodes join (~3 min), AI pods download models (~3 min).
# The app then answers again on the same Elastic IP.

param([switch]$IncludeOldServer)

$ErrorActionPreference = "Stop"
$region  = "ap-south-1"
$cluster = "snapstock-prod"
$db      = "snapstock-prod-pg"
$oldServer = "i-059a3eb481e38c2fd"

# Fail fast on network problems: PowerShell does not stop on native command errors, so a TLS or
# connection failure (e.g. "SSL validation failed ... handshake failure" from a flaky Wi-Fi/VPN)
# would otherwise let the script continue with empty values.
function Assert-Aws([string]$what) {
    if ($LASTEXITCODE -ne 0) { throw "AWS call failed while $what. Check your internet/VPN connection and run the script again." }
}
$ok = $false
foreach ($attempt in 1..3) {
    aws sts get-caller-identity --query Account --output text | Out-Null
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
    Write-Host "AWS not reachable (attempt $attempt/3), retrying in 10 s..."
    Start-Sleep -Seconds 10
}
if (-not $ok) { throw "Cannot reach AWS (TLS/network error). Check your internet/VPN connection and try again." }
# Same sizes as infra/eks/terraform/eks.tf (min/desired 2).
$sizes = @{ "system" = 2; "ai" = 2 }

$status = aws rds describe-db-instances --db-instance-identifier $db --region $region --query "DBInstances[0].DBInstanceStatus" --output text
if ($status -eq "stopped") {
    aws rds start-db-instance --db-instance-identifier $db --region $region --query "DBInstance.DBInstanceStatus" --output text | Out-Null
    Write-Host "RDS $db -> starting"
}

foreach ($ng in (aws eks list-nodegroups --cluster-name $cluster --region $region --query "nodegroups" --output text).Split()) {
    if (-not $ng) { continue }
    $prefix = ($ng -split "-")[0]
    $count = $sizes[$prefix]
    if (-not $count) { $count = 1 }
    $max = aws eks describe-nodegroup --cluster-name $cluster --nodegroup-name $ng --region $region --query "nodegroup.scalingConfig.maxSize" --output text
    aws eks update-nodegroup-config --cluster-name $cluster --nodegroup-name $ng --region $region `
        --scaling-config "minSize=$count,maxSize=$max,desiredSize=$count" --query "update.status" --output text | Out-Null
    Write-Host "node group $ng -> $count nodes"
}

if ($IncludeOldServer) {
    aws ec2 start-instances --instance-ids $oldServer --region $region --query "StartingInstances[0].CurrentState.Name" --output text | Out-Null
    Write-Host "old K3s server $oldServer -> starting"
}

Write-Host "Waiting for RDS..."
aws rds wait db-instance-available --db-instance-identifier $db --region $region
Assert-Aws "waiting for the database"

aws eks update-kubeconfig --region $region --name $cluster | Out-Null
Assert-Aws "configuring kubectl"
Write-Host "Waiting for the app pods (AI pods load models on start)..."
foreach ($d in "snapstock-backend", "snapstock-frontend", "snapstock-ai") {
    kubectl -n snapstock rollout status "deploy/$d" --timeout=20m
    if ($LASTEXITCODE -ne 0) { throw "deployment $d did not become ready" }
}

# The backend keeps its DB connection pool; restart it so it reconnects cleanly after RDS was stopped.
kubectl -n snapstock rollout restart deploy/snapstock-backend | Out-Null
kubectl -n snapstock rollout status deploy/snapstock-backend --timeout=10m

# The NLB re-registers the new pod IPs as targets; wait until at least one is healthy.
$tg = aws elbv2 describe-target-groups --region $region --query "TargetGroups[?contains(TargetGroupName,'snapstoc')].TargetGroupArn | [0]" --output text
Assert-Aws "finding the load balancer target group"
foreach ($i in 1..30) {
    $states = aws elbv2 describe-target-health --region $region --target-group-arn $tg --query "TargetHealthDescriptions[].TargetHealth.State" --output text
    if (($states -split "\s+") -contains "healthy") { break }
    Start-Sleep -Seconds 10
}
Write-Host "Load balancer targets: $states"

$ip = aws ec2 describe-addresses --region $region --filters "Name=tag:Name,Values=snapstock-prod-app" --query "Addresses[0].PublicIp" --output text
Write-Host "`nSnapStock is back: http://$ip"
