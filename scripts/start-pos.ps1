param(
  [int]$Port = 3000,
  [switch]$Production
)

$ErrorActionPreference = "Stop"

# Confirms that a required program is installed and gives the operator a useful setup message when it is missing.
function Assert-Command([string]$commandName, [string]$helpText) {
  if (-not (Get-Command $commandName -ErrorAction SilentlyContinue)) {
    throw "$commandName was not found. $helpText"
  }
}

# Stops any existing application process using the requested port so the POS can start without a port conflict.
function Stop-Port([int]$port) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -gt 0 } |
    ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# Safely removes only this project's generated Next.js cache before a fresh production build.
function Clear-NextCache {
  $project = Resolve-Path "."
  $next = Resolve-Path ".\.next" -ErrorAction SilentlyContinue

  if ($next -and $next.Path.StartsWith($project.Path)) {
    Write-Host "Clearing Next.js cache..."
    Remove-Item -LiteralPath $next.Path -Recurse -Force
  }
}

Assert-Command "node" "Install Node.js first."
Assert-Command "npm" "Install Node.js first."

if (-not (Test-Path ".env")) {
  throw ".env was not found. Copy .env.example to .env and set DATABASE_URL first."
}

$nodeVersion = node -v
Write-Host "Node: $nodeVersion"

Stop-Port $Port

if ($Production) {
  Clear-NextCache
  Write-Host "Building POS..."
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Production build failed."
  }
  $nextCommand = (Resolve-Path "node_modules\next\dist\bin\next").Path
  $serverArguments = @("`"$nextCommand`"", "start", "-p", "$Port")
} else {
  $nextCommand = (Resolve-Path "node_modules\next\dist\bin\next").Path
  $serverArguments = @("`"$nextCommand`"", "dev", "-p", "$Port")
}

Write-Host "Starting Jikon Grill POS on http://localhost:$Port"
$logDirectory = Join-Path (Get-Location) "logs"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$outputLog = Join-Path $logDirectory "pos-output.log"
$errorLog = Join-Path $logDirectory "pos-error.log"
$nodeCommand = (Get-Command node).Source
$serverProcess = Start-Process -FilePath $nodeCommand -ArgumentList $serverArguments -WorkingDirectory (Get-Location) -WindowStyle Hidden -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog -PassThru
$serverProcess.Id | Set-Content -Path ".pos-server.pid"

$url = "http://localhost:$Port/login"
$healthUrl = "http://localhost:$Port/api/health"
$ready = $false
for ($attempt = 1; $attempt -le 30; $attempt += 1) {
  Start-Sleep -Seconds 1
  try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    if ($health.status -eq "ok" -and $health.database -eq "connected") {
      $ready = $true
      break
    }
  } catch {
    Write-Host "Waiting for POS..."
  }
}

if (-not $ready) {
  Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
  throw "POS or PostgreSQL did not become ready on port $Port. Check logs\pos-error.log."
}

Start-Process $url
Write-Host "POS is ready:"
Write-Host $url
