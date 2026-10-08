# Stop the SnapStock K3s demo server between evaluation sessions.
# The local PostgreSQL volume, container images, and production Elastic IP are preserved.
# The website is offline while the instance is stopped.

param([string]$Profile = "snapstock-login")

$ErrorActionPreference = "Stop"
$region = "ap-south-1"
$account = "471547181436"
$server = "i-059a3eb481e38c2fd"
$db = "snapstock-prod-pg"

function Assert-Aws([string]$What) {
    if ($LASTEXITCODE -ne 0) {
        throw "AWS call failed while $What. Run 'aws login --profile $Profile' and try again."
    }
}

$actualAccount = aws sts get-caller-identity --profile $Profile --query Account --output text
Assert-Aws "checking the signed-in account"
if ($actualAccount -ne $account) {
    throw "Refusing to continue: profile '$Profile' is account $actualAccount, expected $account."
}

$state = aws ec2 describe-instances --instance-ids $server --profile $Profile --region $region `
    --query "Reservations[0].Instances[0].State.Name" --output text
Assert-Aws "checking the K3s server"

if ($state -eq "running") {
    aws ec2 stop-instances --instance-ids $server --profile $Profile --region $region `
        --query "StoppingInstances[0].CurrentState.Name" --output text | Out-Null
    Assert-Aws "stopping the K3s server"
    aws ec2 wait instance-stopped --instance-ids $server --profile $Profile --region $region
    Assert-Aws "waiting for the K3s server to stop"
    Write-Host "K3s demo server -> stopped"
} elseif ($state -eq "stopped") {
    Write-Host "K3s demo server is already stopped"
} else {
    throw "K3s demo server is '$state'; wait for that transition to finish and run this script again."
}

# RDS is retained only as a recoverable backup. Keep it stopped if AWS auto-starts it after 7 days.
$dbState = aws rds describe-db-instances --db-instance-identifier $db --profile $Profile --region $region `
    --query "DBInstances[0].DBInstanceStatus" --output text
Assert-Aws "checking RDS"
if ($dbState -eq "available") {
    aws rds stop-db-instance --db-instance-identifier $db --profile $Profile --region $region `
        --query "DBInstance.DBInstanceStatus" --output text | Out-Null
    Assert-Aws "stopping RDS"
    Write-Host "RDS backup instance -> stopping"
} else {
    Write-Host "RDS backup instance is '$dbState'"
}

Write-Host "Website offline; database and production IP preserved."
Write-Host "Start the demo with: .\infra\eks\resume.ps1"
