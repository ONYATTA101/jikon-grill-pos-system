param(
  [string]$OutputDir = "backups"
)

$ErrorActionPreference = "Stop"

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

function Get-PostgresConnection {
  $databaseUrl = Get-DatabaseUrl
  $uriBuilder = [System.UriBuilder]$databaseUrl
  $schema = "public"

  if ($uriBuilder.Query) {
    $queryParts = $uriBuilder.Query.TrimStart("?").Split("&", [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($part in $queryParts) {
      $keyValue = $part.Split("=", 2)
      if ($keyValue.Length -eq 2 -and $keyValue[0] -eq "schema") {
        $schema = [System.Uri]::UnescapeDataString($keyValue[1])
      }
    }
    $uriBuilder.Query = ""
  }

  return @{
    Url = $uriBuilder.Uri.AbsoluteUri
    Schema = $schema
  }
}

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

$connection = Get-PostgresConnection
$pgDump = Get-PostgresTool "pg_dump"
$backupRoot = Join-Path (Get-Location) $OutputDir
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupRoot "jikon-grill-pos-$timestamp.dump"

& $pgDump --format=custom --no-owner --no-privileges --schema=$($connection.Schema) --file=$backupFile $($connection.Url)

if ($LASTEXITCODE -ne 0) {
  throw "Database backup failed."
}

Write-Host "Backup created:"
Write-Host $backupFile
