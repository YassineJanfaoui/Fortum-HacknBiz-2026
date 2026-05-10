$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Workspace = Split-Path -Parent $Root

$Targets = @(
    (Join-Path $Root "sentinel_audit.db"),
    (Join-Path $Root ".pytest_cache"),
    (Join-Path $Root "package-lock.json"),
    (Join-Path $Root "frontend-next\.next"),
    (Join-Path $Workspace "opa.exe")
)

foreach ($target in $Targets) {
    if (Test-Path -LiteralPath $target) {
        $resolved = (Resolve-Path -LiteralPath $target).Path
        if ($resolved.StartsWith($Workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $resolved -Recurse -Force
            Write-Host "Removed $resolved"
        }
    }
}

foreach ($base in @((Join-Path $Root "backend"), (Join-Path $Root "tests"))) {
    if (Test-Path -LiteralPath $base) {
        Get-ChildItem -LiteralPath $base -Recurse -Directory -Filter "__pycache__" -Force |
            ForEach-Object {
                Remove-Item -LiteralPath $_.FullName -Recurse -Force
                Write-Host "Removed $($_.FullName)"
            }
    }
}
