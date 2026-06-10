param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [switch]$Clean,
  [string]$ConfirmText = ""
)

$ErrorActionPreference = "Stop"

# Reads the private PostgreSQL connection URL from .env so the restore command can connect to the database.
function Get-DatabaseUrl {
  $envPath = Join-Path (Get-Location) ".env"
  if (-not (Test-Path $envPath)) {
    throw ".env was not found. Copy .env.example to .env and set DATABASE_URL first."
  }

  $line = Get-Content $envPath | Where-Object { $_ -match "^\s*DATABASE_URL\s*=" } | Select-Object -First 1
  if (-not $line) {
    throw "DATABASE_URL was not found in .env."
  }

  return ($line -replace "^\s*DATABASE_URL\s*=\s*", "").Trim().Trim('"').Trim("'")
}

# Removes unsupported query options from the connection URL before passing it to pg_restore.
function Get-PostgresConnection {
  $databaseUrl = Get-DatabaseUrl
  $uriBuilder = [System.UriBuilder]$databaseUrl

  if ($uriBuilder.Query) {
    $uriBuilder.Query = ""
  }

  return @{
    Url = $uriBuilder.Uri.AbsoluteUri
  }
}

# Finds an installed PostgreSQL command-line tool either on PATH or in the standard Windows installation folder.
function Get-PostgresTool([string]$toolName) {
  $command = Get-Command $toolName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $postgresRoot = "C:\Program Files\PostgreSQL"
  if (Test-Path $postgresRoot) {
    $tool = Get-ChildItem $postgresRoot -Recurse -Filter "$toolName.exe" -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match "\\bin\\" } |
      Sort-Object FullName -Descending |
      Select-Object -First 1

    if ($tool) {
      return $tool.FullName
    }
  }

  throw "$toolName was not found. Install PostgreSQL command line tools or add PostgreSQL bin to PATH."
}

if (-not (Test-Path $BackupFile)) {
  throw "Backup file was not found: $BackupFile"
}

if ($ConfirmText -ne "RESTORE") {
  throw "Restore is destructive. Run again with -ConfirmText RESTORE."
}

$connection = Get-PostgresConnection
$pgRestore = Get-PostgresTool "pg_restore"
$args = @("--no-owner", "--no-privileges", "--dbname=$($connection.Url)")

if ($Clean) {
  $args = @("--clean", "--if-exists") + $args
}

& $pgRestore @args $BackupFile

if ($LASTEXITCODE -ne 0) {
  throw "Database restore failed."
}

Write-Host "Restore completed from:"
Write-Host $BackupFile
