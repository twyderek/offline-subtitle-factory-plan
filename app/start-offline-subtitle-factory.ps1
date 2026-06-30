$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = if ($env:PORT) { $env:PORT } else { "8790" }
$Url = "http://127.0.0.1:$Port"
$NodeExe = Join-Path $AppDir "tools\node\node.exe"

Set-Location $AppDir

if (-not (Test-Path $NodeExe)) {
  Write-Host ""
  Write-Host "[ERROR] Project-local Node.js was not found." -ForegroundColor Red
  Write-Host "Please run setup-local-tools.bat first."
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host ""
Write-Host "Starting Offline Subtitle Factory..." -ForegroundColor Cyan
Write-Host "App folder: $AppDir"
Write-Host "Node: $NodeExe"
Write-Host "URL: $Url"
Write-Host ""

$existing = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort ([int]$Port) -State Listen -ErrorAction SilentlyContinue
foreach ($connection in $existing) {
  Write-Host "Stopping existing server PID $($connection.OwningProcess) ..." -ForegroundColor Yellow
  Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
}

$env:PATH = "$AppDir\tools\ffmpeg\bin;$AppDir\tools\python-venv\Scripts;$env:PATH"
$env:XDG_CACHE_HOME = Join-Path $AppDir "tools"
$env:WHISPER_CACHE = Join-Path $AppDir "tools\whisper-models"

Start-Process $Url
& $NodeExe server.mjs
