# start-local.ps1

Write-Host "Starting AI Try-On local environment..." -ForegroundColor Cyan

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

function Copy-Env-If-Missing {
    param (
        [string]$ExampleFile,
        [string]$TargetFile
    ) 

    if (!(Test-Path $TargetFile)) {
        if (Test-Path $ExampleFile) {
            Copy-Item $ExampleFile $TargetFile
            Write-Host "Created env file: $TargetFile" -ForegroundColor Green
        } else {
            Write-Host "Missing example env file: $ExampleFile" -ForegroundColor Red
        }
    }
} 
   
# Prepare env files
Copy-Env-If-Missing "$ROOT\services\api\.env.example" "$ROOT\services\api\.env"
Copy-Env-If-Missing "$ROOT\apps\dashboard\.env.local.example" "$ROOT\apps\dashboard\.env.local"
Copy-Env-If-Missing "$ROOT\apps\widget\.env.local.example" "$ROOT\apps\widget\.env.local"

# Start API
Write-Host "Starting FastAPI API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$ROOT\services\api'; if (!(Test-Path .venv)) { python -m venv .venv }; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt; uvicorn app.main:app --reload --port 8000"
)

# Start Dashboard
Write-Host "Starting Dashboard..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$ROOT\apps\dashboard'; if (!(Test-Path node_modules)) { npm install }; npm run dev"
)

# Start Widget
Write-Host "Starting Widget..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$ROOT\apps\widget'; if (!(Test-Path node_modules)) { npm install }; npm run dev"
)

Set-Location $ROOT

Write-Host ""
Write-Host "Local environment is starting." -ForegroundColor Green
Write-Host "API:       http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Dashboard: http://127.0.0.1:3000/clients/login" -ForegroundColor Green
Write-Host "Widget:    http://127.0.0.1:3001/widget/tryon?shop_ref=44444444-4444-4444-4444-444444444444" -ForegroundColor Green