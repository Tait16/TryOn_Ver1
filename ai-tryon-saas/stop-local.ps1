# stop-local.ps1

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Stopping Docker services..." -ForegroundColor Yellow

Set-Location "$ROOT\infra"
docker compose down

Set-Location $ROOT

Write-Host "Docker services stopped." -ForegroundColor Green
Write-Host "Close API, Dashboard and Widget PowerShell windows manually if they are still running."