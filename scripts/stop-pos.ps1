param(
  [int]$Port = 3000
)

$pidFile = Join-Path (Get-Location) ".pos-server.pid"
if (Test-Path $pidFile) {
  $trackedProcessId = Get-Content $pidFile | Select-Object -First 1
  if ($trackedProcessId -match "^\d+$") {
    Stop-Process -Id ([int]$trackedProcessId) -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped tracked POS process $trackedProcessId."
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if (-not $connections) {
  Write-Host "No additional POS server is running on port $Port."
  exit 0
}

$processIds = $connections | Where-Object { $_.OwningProcess -gt 0 } | Select-Object -ExpandProperty OwningProcess -Unique

if (-not $processIds) {
  Write-Host "No stoppable POS server process was found on port $Port."
  exit 0
}

foreach ($processId in $processIds) {
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped process $processId on port $Port."
}

Write-Host "POS server stopped."
