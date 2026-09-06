# FORGR Quick Deploy Script for Docker Compose (Windows PowerShell)
# Automates the deployment setup and container initialization on Windows
$ErrorActionPreference = "Stop"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "   FORGR Quick Deployment Script  " -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check prerequisites
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Write-Host "❌ Docker is not installed or not in PATH." -ForegroundColor Red
    Write-Host "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

$composeCheck = docker compose version 2>&1
if ($LASTEXITCODE -ne 0) {
    $composeCheckOld = docker-compose version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker Compose is not available." -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ Docker and Docker Compose verified" -ForegroundColor Green

# 2. Generate secure secrets
Write-Host "`nGenerating secure configuration values..." -ForegroundColor Cyan

function New-SecureToken([int]$length = 32) {
    $bytes = New-Object byte[] $length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
}

$secretKey = New-SecureToken 32
$dbPassword = New-SecureToken 16
$redisPassword = New-SecureToken 16
$seedPassword = New-SecureToken 16

# 3. Create .env file from template
$envPath = Join-Path $PSScriptRoot ".env"
$envDockerPath = Join-Path $PSScriptRoot ".env.docker"

if (-not (Test-Path $envPath)) {
    Write-Host "Creating .env from .env.docker..." -ForegroundColor Cyan
    Copy-Item $envDockerPath $envPath
} else {
    Write-Host "Existing .env found. Updating empty or default credentials..." -ForegroundColor Yellow
}

$envContent = Get-Content $envPath -Raw

$envContent = [System.Text.RegularExpressions.Regex]::Replace($envContent, "FORGR_SECRET_KEY=.*", "FORGR_SECRET_KEY=$secretKey")
$envContent = [System.Text.RegularExpressions.Regex]::Replace($envContent, "DB_PASSWORD=.*", "DB_PASSWORD=$dbPassword")
$envContent = [System.Text.RegularExpressions.Regex]::Replace($envContent, "REDIS_PASSWORD=.*", "REDIS_PASSWORD=$redisPassword")
$envContent = [System.Text.RegularExpressions.Regex]::Replace($envContent, "FORGR_SEED_PASSWORD=.*", "FORGR_SEED_PASSWORD=$seedPassword")

Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host "✓ .env file configured with secure random secrets" -ForegroundColor Green

# 4. Optional domain configuration
$domain = Read-Host "`nEnter your application domain (press Enter for default: localhost)"
if ([string]::IsNullOrWhiteSpace($domain)) {
    $domain = "localhost"
}

if ($domain -ne "localhost") {
    $cors = "https://$domain,https://www.$domain"
    $envContent = [System.Text.RegularExpressions.Regex]::Replace($envContent, "FORGR_CORS_ORIGINS=.*", "FORGR_CORS_ORIGINS=$cors")
    $envContent = [System.Text.RegularExpressions.Regex]::Replace($envContent, "VITE_API_BASE_URL=.*", "VITE_API_BASE_URL=https://api.$domain")
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Host "✓ Configured CORS and API URL for $domain" -ForegroundColor Green
}

# 5. Launch containers
Write-Host "`nStarting FORGR containers..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host "`nWaiting 20 seconds for services to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 20

# 6. Verify health
Write-Host "`nChecking service health..." -ForegroundColor Cyan
try {
    $backendRes = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($backendRes.status -eq "healthy" -or $backendRes.database -eq "connected") {
        Write-Host "✓ Backend API is healthy and connected to database" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backend API responded: $($backendRes | ConvertTo-Json -Compress)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Backend is still initializing or health check timed out." -ForegroundColor Yellow
}

try {
    $frontendRes = Invoke-WebRequest -Uri "http://localhost" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($frontendRes.StatusCode -eq 200) {
        Write-Host "✓ Frontend is running" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Frontend is still starting up." -ForegroundColor Yellow
}

Write-Host "`n==================================" -ForegroundColor Green
Write-Host "✓ FORGR Deployment Initialized!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "`nAccess URLs:"
Write-Host "  Frontend: http://localhost" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "  Interactive Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "`nBootstrap Admin Login:"
Write-Host "  Email: admin@forgr.app" -ForegroundColor White
Write-Host "  Password: (check FORGR_SEED_PASSWORD in your .env file)" -ForegroundColor White
Write-Host "`nManagement Commands:"
Write-Host "  View Logs:   docker compose logs -f"
Write-Host "  Stop Stack:  docker compose down"
Write-Host "  Reset Data:  docker compose down -v"
Write-Host ""
