# Pause the SnapStock EKS stack to save credits (overnight / between work sessions).
#
#   .\infra\eks\pause.ps1                    # EKS nodes -> 0, stop RDS
#   .\infra\eks\pause.ps1 -IncludeOldServer  # also stop the old K3s server (snapstock.rashmika.dev goes offline)
#
# Do NOT stop the EKS "system"/"ai" instances from the EC2 console: they belong to Auto Scaling
# groups and would be replaced. Scaling the node groups to 0 is the supported way.
#
# Still billed while paused (~$4-5/day): EKS control plane, NAT gateway, NLB, Elastic IPs,
# RDS storage, S3/ECR storage. Nothing is deleted; data, images and the Elastic IP are kept.
# Note: AWS automatically restarts a stopped RDS instance after 7 days.

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

foreach ($ng in (aws eks list-nodegroups --cluster-name $cluster --region $region --query "nodegroups" --output text).Split()) {
    if (-not $ng) { continue }
    $max = aws eks describe-nodegroup --cluster-name $cluster --nodegroup-name $ng --region $region --query "nodegroup.scalingConfig.maxSize" --output text
    aws eks update-nodegroup-config --cluster-name $cluster --nodegroup-name $ng --region $region `
        --scaling-config "minSize=0,maxSize=$max,desiredSize=0" --query "update.status" --output text | Out-Null
    Write-Host "node group $ng -> 0 nodes"
}

# The PodDisruptionBudgets keep one replica of each app alive, which blocks the scale-in drain.
# Deleting the pods directly (--disable-eviction) lets the nodes shut down in a few minutes.
aws eks update-kubeconfig --region $region --name $cluster | Out-Null
foreach ($node in (kubectl get nodes -o name)) {
    kubectl drain $node --ignore-daemonsets --delete-emptydir-data --disable-eviction --force --timeout=120s | Out-Null
    Write-Host "drained $node"
}

$status = aws rds describe-db-instances --db-instance-identifier $db --region $region --query "DBInstances[0].DBInstanceStatus" --output text
if ($status -eq "available") {
    aws rds stop-db-instance --db-instance-identifier $db --region $region --query "DBInstance.DBInstanceStatus" --output text | Out-Null
    Write-Host "RDS $db -> stopping"
} else {
    Write-Host "RDS $db is '$status' (not stopped by this script)"
}

if ($IncludeOldServer) {
    aws ec2 stop-instances --instance-ids $oldServer --region $region --query "StoppingInstances[0].CurrentState.Name" --output text | Out-Null
    Write-Host "old K3s server $oldServer -> stopping (its Elastic IP 15.252.170.236 is kept)"
}

Write-Host "`nPaused. Resume with: .\infra\eks\resume.ps1"
