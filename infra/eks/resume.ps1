# Start the SnapStock K3s demo server and wait for the public website.
# RDS is not started because this deployment uses its local PostgreSQL volume.

param([string]$Profile = "snapstock-login")

$ErrorActionPreference = "Stop"
$region = "ap-south-1"
$account = "471547181436"
$server = "i-059a3eb481e38c2fd"
$url = "https://snapstock.rashmika.dev/"
$healthUrl = "https://snapstock.rashmika.dev/snapstock-backend-http/health"

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

if ($state -eq "stopped") {
    aws ec2 start-instances --instance-ids $server --profile $Profile --region $region `
        --query "StartingInstances[0].CurrentState.Name" --output text | Out-Null
    Assert-Aws "starting the K3s server"
    Write-Host "K3s demo server -> starting"
} elseif ($state -ne "running") {
    throw "K3s demo server is '$state'; wait for that transition to finish and run this script again."
} else {
    Write-Host "K3s demo server is already running"
}

aws ec2 wait instance-status-ok --instance-ids $server --profile $Profile --region $region
Assert-Aws "waiting for the K3s server checks"

Write-Host "Waiting for frontend, backend, and AI containers..."
$ready = $false
foreach ($attempt in 1..60) {
    try {
        $page = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 10
        if ($page.StatusCode -eq 200 -and $health.status -eq "ok") {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 10
    }
}

if (-not $ready) {
    throw "The server started, but the website did not become healthy within 10 minutes."
}

Write-Host "SnapStock is ready: $url"
Write-Host "Stop it after the demo with: .\infra\eks\pause.ps1"
