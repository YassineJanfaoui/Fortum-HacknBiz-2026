param(
    [int]$ApiPort = 8000,
    [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend-next"

function Stop-Port {
    param([int]$Port)
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object {
            Write-Host "Stopping process $_ on port $Port"
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
}

function Test-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

function Wait-Http {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
            return
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "Timed out waiting for $Url"
}

Test-Command "python"
Test-Command "npm"

if (-not (Test-Path (Join-Path $Root ".env"))) {
    Write-Warning "No .env file found. Copy .env.example to .env and fill in keys for live LLM/Etherscan calls."
}

if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    Push-Location $Frontend
    npm install
    Pop-Location
}

Stop-Port $ApiPort
Stop-Port $FrontendPort

Write-Host "Starting Sentinel Ledger API on http://127.0.0.1:$ApiPort"
Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoProfile",
    "-Command",
    "Set-Location '$Root'; python -m uvicorn backend.api.main:app --port $ApiPort"
) -WindowStyle Hidden

Start-Sleep -Seconds 3

Write-Host "Starting Next.js dashboard on http://127.0.0.1:$FrontendPort"
Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoProfile",
    "-Command",
    "`$env:NEXT_TELEMETRY_DISABLED='1'; Set-Location '$Frontend'; npx next dev -p $FrontendPort"
) -WindowStyle Hidden

Wait-Http "http://127.0.0.1:$ApiPort/" 45
Wait-Http "http://127.0.0.1:$FrontendPort/" 60

$api = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/"
$ui = Invoke-WebRequest -Uri "http://127.0.0.1:$FrontendPort/" -UseBasicParsing

Write-Host "API status: $($api.status)"
Write-Host "Dashboard status: $($ui.StatusCode)"
Write-Host "Open http://127.0.0.1:$FrontendPort"
