$ErrorActionPreference = "Stop"

# Stops the release check immediately when the command that just ran returned an error.
function Assert-LastExitCode([string]$step) {
  if ($LASTEXITCODE -ne 0) {
    throw "$step failed."
  }
}

# Reads one named setting from the private .env file without exposing the rest of the file.
function Get-EnvValue([string]$name) {
  $line = Get-Content ".env" | Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  return ($line -replace "^\s*$name\s*=\s*", "").Trim().Trim('"').Trim("'")
}

if (-not (Test-Path ".env")) {
  throw ".env was not found."
}

$databaseUrl = Get-EnvValue "DATABASE_URL"
$sessionSecret = Get-EnvValue "NEXTAUTH_SECRET"

if (-not $databaseUrl) {
  throw "DATABASE_URL is missing from .env."
}

if (-not $sessionSecret -or $sessionSecret.Length -lt 32 -or $sessionSecret -eq "replace-with-a-long-random-secret") {
  throw "NEXTAUTH_SECRET must be a unique value with at least 32 characters."
}

Write-Host "Checking lint..."
npm run lint
Assert-LastExitCode "Lint"

Write-Host "Checking Prisma schema..."
npx prisma validate
Assert-LastExitCode "Prisma validation"

Write-Host "Checking database migrations..."
npx prisma migrate status
Assert-LastExitCode "Prisma migration status"

Write-Host "Checking package vulnerabilities..."
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$auditOutput = npm audit --audit-level=moderate 2>&1
$auditExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
$auditOutput | ForEach-Object { Write-Host $_ }

if ($auditExitCode -ne 0) {
  $auditText = $auditOutput -join "`n"
  if ($auditText -match "audit endpoint returned an error|audit request .* failed") {
    Write-Warning "Package audit registry is unavailable. Run npm audit when internet access is restored."
  } else {
    throw "Package audit found a release blocker."
  }
}

Write-Host "Building production app..."
npm run build
Assert-LastExitCode "Production build"

Write-Host "Release checks passed."
