$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ToolsDir = Join-Path $AppDir "tools"
$DownloadsDir = Join-Path $ToolsDir "_downloads"
$NodeDir = Join-Path $ToolsDir "node"
$FfmpegDir = Join-Path $ToolsDir "ffmpeg"
$VenvDir = Join-Path $ToolsDir "python-venv"
$WhisperModelsDir = Join-Path $ToolsDir "whisper-models"

$NodeVersion = "v24.13.0"
$NodeZipUrl = "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-x64.zip"
$FfmpegZipUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

New-Item -ItemType Directory -Force -Path $ToolsDir, $DownloadsDir, $WhisperModelsDir | Out-Null

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Download-File($Url, $OutFile) {
  if (Test-Path $OutFile) {
    Write-Host "Using cached download: $OutFile"
    return
  }
  Write-Host "Downloading: $Url"
  Invoke-WebRequest -Uri $Url -OutFile $OutFile
}

function Remove-AndCreate($Path) {
  if (Test-Path $Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

Write-Step "Install portable Node.js into tools/node"
$NodeExe = Join-Path $NodeDir "node.exe"
if (-not (Test-Path $NodeExe)) {
  $NodeZip = Join-Path $DownloadsDir "node-$NodeVersion-win-x64.zip"
  try {
    Download-File $NodeZipUrl $NodeZip
    $NodeExtract = Join-Path $DownloadsDir "node-extract"
    Remove-AndCreate $NodeExtract
    Expand-Archive -LiteralPath $NodeZip -DestinationPath $NodeExtract -Force
    $ExtractedNode = Get-ChildItem -LiteralPath $NodeExtract -Directory | Select-Object -First 1
    if (-not $ExtractedNode) { throw "Node archive did not contain a folder." }
    Remove-AndCreate $NodeDir
    Copy-Item -Path (Join-Path $ExtractedNode.FullName "*") -Destination $NodeDir -Recurse -Force
  } catch {
    Write-Host "Download failed, trying to copy installed Node.js..." -ForegroundColor Yellow
    $ExistingNode = Get-Command node -ErrorAction SilentlyContinue
    if (-not $ExistingNode) { throw "Node.js setup failed: $($_.Exception.Message)" }
    $ExistingNodeDir = Split-Path -Parent $ExistingNode.Source
    Remove-AndCreate $NodeDir
    Copy-Item -Path (Join-Path $ExistingNodeDir "*") -Destination $NodeDir -Recurse -Force
  }
} else {
  Write-Host "Node.js already exists: $NodeExe"
}

Write-Step "Install portable FFmpeg into tools/ffmpeg"
$FfmpegExe = Join-Path $FfmpegDir "bin\ffmpeg.exe"
if (-not (Test-Path $FfmpegExe)) {
  $FfmpegZip = Join-Path $DownloadsDir "ffmpeg-release-essentials.zip"
  Download-File $FfmpegZipUrl $FfmpegZip
  $FfmpegExtract = Join-Path $DownloadsDir "ffmpeg-extract"
  Remove-AndCreate $FfmpegExtract
  Expand-Archive -LiteralPath $FfmpegZip -DestinationPath $FfmpegExtract -Force
  $ExtractedFfmpeg = Get-ChildItem -LiteralPath $FfmpegExtract -Directory | Where-Object { Test-Path (Join-Path $_.FullName "bin\ffmpeg.exe") } | Select-Object -First 1
  if (-not $ExtractedFfmpeg) { throw "FFmpeg archive did not contain bin\ffmpeg.exe." }
  Remove-AndCreate $FfmpegDir
  Copy-Item -Path (Join-Path $ExtractedFfmpeg.FullName "*") -Destination $FfmpegDir -Recurse -Force
} else {
  Write-Host "FFmpeg already exists: $FfmpegExe"
}

Write-Step "Create project-local Python venv and install Whisper"
$PythonExe = $null
if (Test-Path (Join-Path $VenvDir "Scripts\python.exe")) {
  $PythonExe = Join-Path $VenvDir "Scripts\python.exe"
} else {
  $SystemPython = Get-Command python -ErrorAction SilentlyContinue
  if (-not $SystemPython) {
    $PyLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($PyLauncher) {
      & $PyLauncher.Source -3 -m venv $VenvDir
    } else {
      throw "Python was not found. Install Python once, then rerun setup-local-tools.bat. Suggested: winget install Python.Python.3.11"
    }
  } else {
    & $SystemPython.Source -m venv $VenvDir
  }
  $PythonExe = Join-Path $VenvDir "Scripts\python.exe"
}

$PipExe = Join-Path $VenvDir "Scripts\pip.exe"
& $PythonExe -m pip install --upgrade pip
& $PipExe install --upgrade openai-whisper

Write-Step "Verify local tools"
$LocalNode = Join-Path $NodeDir "node.exe"
$LocalWhisper = Join-Path $VenvDir "Scripts\whisper.exe"
& $LocalNode --version
& $FfmpegExe -version | Select-Object -First 1
& $PythonExe --version
& $PythonExe -c "import whisper; print('openai-whisper import ok')"

Write-Host ""
Write-Host "All local tools are ready under:" -ForegroundColor Green
Write-Host $ToolsDir
Write-Host ""
Write-Host "Whisper models will be cached under:"
Write-Host $WhisperModelsDir
