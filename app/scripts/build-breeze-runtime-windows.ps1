param(
  [string]$OutputDirectory = '',
  [string]$PythonExecutable = '',
  [string]$BreezeRevision = 'c0993ecd98522d61066d3f5ce769e35c848b7855',
  [string]$PatchedWhisperRevision = 'f94c6ba670a35ee8d720d4221e102f4685c288d6',
  [string]$RuntimeVersion = '2026.08.1',
  [string]$TorchRequirement = 'torch==2.4.1+cpu',
  [string]$TorchIndexUrl = 'https://download.pytorch.org/whl/cpu',
  [switch]$LicenseReviewApproved
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $PSScriptRoot '..\..\breeze-runtime-build' }

function Require-Command([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) { throw "Required build command not found: $Name" }
  return $command.Source
}

function Invoke-Checked([string]$File, [string[]]$Arguments) {
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $File $($Arguments -join ' ')" }
}

if (-not $LicenseReviewApproved) {
  throw 'Complete the Breeze, patched Whisper, PyTorch, Python, and dependency license review before creating a Release asset.'
}

$git = Require-Command 'git'
$python = if ($PythonExecutable) { (Resolve-Path -LiteralPath $PythonExecutable).Path } else { Require-Command 'python' }
$sevenZip = Get-Command 7z -ErrorAction SilentlyContinue
if (-not $sevenZip) { throw '7z is required; install 7-Zip in CI before running this script.' }
if ($RuntimeVersion -notmatch '^\d+\.\d+\.\d+$') { throw "RuntimeVersion must be semver: $RuntimeVersion" }

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputFullPath = [IO.Path]::GetFullPath($OutputDirectory)
if ([IO.Path]::GetPathRoot($outputFullPath) -eq $outputFullPath -or $outputFullPath.Length -lt 8) {
  throw "OutputDirectory is too broad or unsafe: $outputFullPath"
}
$work = Join-Path $OutputDirectory 'work'
$repo = Join-Path $work 'Breeze-ASR-25'
$venv = Join-Path $work 'venv'
$stage = Join-Path $work 'runtime'
$zipPath = Join-Path $OutputDirectory "breeze-runtime-win-x64-cpu-$RuntimeVersion.zip"
$manifestPath = Join-Path $OutputDirectory 'breeze-asr-25-win-x64-cpu.json'
$metadataPath = Join-Path $OutputDirectory 'release-metadata.json'

if (Test-Path -LiteralPath $OutputDirectory) { Remove-Item -LiteralPath $OutputDirectory -Recurse -Force }
New-Item -ItemType Directory -Force -Path $work, $stage | Out-Null

Invoke-Checked $git @('clone', '--recurse-submodules', 'https://github.com/mtkresearch/Breeze-ASR-25.git', $repo)
Invoke-Checked $git @('-C', $repo, 'checkout', '--recurse-submodules', $BreezeRevision)
$checkedOutRevision = (& $git '-C' $repo 'rev-parse' 'HEAD').Trim()
if ($checkedOutRevision -ne $BreezeRevision) { throw "Breeze revision mismatch: $checkedOutRevision / $BreezeRevision" }
$patchedPath = Join-Path $repo 'third_party\whisper-patch-breeze'
if (-not (Test-Path -LiteralPath $patchedPath -PathType Container)) { throw 'Breeze patched Whisper submodule is missing.' }
$patchedRevision = (& $git '-C' $patchedPath 'rev-parse' 'HEAD').Trim()
if ($patchedRevision -ne $PatchedWhisperRevision) { throw "patched Whisper revision mismatch: $patchedRevision / $PatchedWhisperRevision" }

$versionOutput = (& $python '--version' 2>&1 | Out-String).Trim()
if ($versionOutput -notmatch 'Python 3\.11\.') { throw "Build Python must be Python 3.11: $versionOutput" }
Invoke-Checked $python @('-m', 'venv', '--copies', $venv)
$venvPython = Join-Path $venv 'Scripts\python.exe'
Invoke-Checked $venvPython @('-m', 'pip', 'install', '--upgrade', 'pip')
Invoke-Checked $venvPython @('-m', 'pip', 'install', '--index-url', $TorchIndexUrl, '--no-cache-dir', $TorchRequirement)
Invoke-Checked $venvPython @('-m', 'pip', 'install', (Join-Path $patchedPath '.'))

Invoke-Checked $venvPython @('-c', "import whisper; assert 'breeze-asr-25' in whisper.available_models()")
Invoke-Checked $venvPython @('-c', "import torch; assert torch.version.cuda is None and not torch.cuda.is_available(); print(torch.__version__)")

$basePrefix = (& $venvPython '-c' 'import sys; print(sys.base_prefix)').Trim()
Copy-Item -LiteralPath (Join-Path $basePrefix 'python.exe') -Destination (Join-Path $stage 'python.exe') -Force
Copy-Item -LiteralPath (Join-Path $basePrefix 'pythonw.exe') -Destination (Join-Path $stage 'pythonw.exe') -Force -ErrorAction SilentlyContinue
Copy-Item -LiteralPath (Join-Path $basePrefix 'python311.dll') -Destination (Join-Path $stage 'python311.dll') -Force
Copy-Item -LiteralPath (Join-Path $basePrefix 'DLLs') -Destination (Join-Path $stage 'DLLs') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $basePrefix 'Lib') -Destination (Join-Path $stage 'Lib') -Recurse -Force
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'Lib\site-packages') | Out-Null
Copy-Item -Path (Join-Path $venv 'Lib\site-packages\*') -Destination (Join-Path $stage 'Lib\site-packages') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $venv 'Scripts') -Destination (Join-Path $stage 'Scripts') -Recurse -Force

Get-ChildItem -LiteralPath $stage -Recurse -Force -File | Where-Object {
  $_.Name -match '^(pip|pip3|pip3\.11)(\.exe)?$' -or $_.Name -match '\.(pyc|pyo)$' -or $_.FullName -match '\\__pycache__\\'
} | Remove-Item -Force
Get-ChildItem -LiteralPath $stage -Recurse -Force -Directory | Where-Object { $_.Name -eq '__pycache__' } | Sort-Object FullName -Descending | Remove-Item -Recurse -Force

Invoke-Checked (Join-Path $stage 'python.exe') @('-c', "import whisper; assert 'breeze-asr-25' in whisper.available_models()")
Invoke-Checked (Join-Path $stage 'python.exe') @('-c', "import torch; assert torch.version.cuda is None and not torch.cuda.is_available(); print(torch.__version__)")

$breezeLicensePath = Join-Path $repo 'LICENSE'
$patchedWhisperLicensePath = Join-Path $patchedPath 'LICENSE'
if (-not (Test-Path -LiteralPath $breezeLicensePath -PathType Leaf)) { throw 'Breeze-ASR-25 LICENSE file is missing.' }
if (-not (Test-Path -LiteralPath $patchedWhisperLicensePath -PathType Leaf)) { throw 'patched Whisper LICENSE file is missing.' }
Copy-Item -LiteralPath $breezeLicensePath -Destination (Join-Path $stage 'THIRD-PARTY-BREEZE-ASR-25-MIT.txt') -Force
Copy-Item -LiteralPath $patchedWhisperLicensePath -Destination (Join-Path $stage 'THIRD-PARTY-WHISPER-PATCH-MIT.txt') -Force

$metadataFiles = Get-ChildItem -LiteralPath (Join-Path $venv 'Lib\site-packages') -Recurse -File -Filter 'METADATA' | Sort-Object FullName
$installedPackages = foreach ($metadataFile in $metadataFiles) {
  $metadata = Get-Content -LiteralPath $metadataFile.FullName -Raw
  $name = ([regex]::Match($metadata, '(?m)^Name:\s*(.+)$')).Groups[1].Value.Trim()
  $version = ([regex]::Match($metadata, '(?m)^Version:\s*(.+)$')).Groups[1].Value.Trim()
  $license = ([regex]::Match($metadata, '(?m)^License:\s*(.+)$')).Groups[1].Value.Trim()
  $homePage = ([regex]::Match($metadata, '(?m)^(?:Home-page|Project-URL):\s*(.+)$')).Groups[1].Value.Trim()
  $classifiers = [regex]::Matches($metadata, '(?m)^Classifier:\s*License :: (.+)$') | ForEach-Object { $_.Groups[1].Value.Trim() }
  if ($name) {
    [ordered]@{
      name = $name
      version = $version
      license = if ($license) { $license } else { $null }
      licenseClassifiers = @($classifiers)
      projectUrl = if ($homePage) { $homePage } else { $null }
    }
  }
}
$licenseEvidence = [ordered]@{
  schemaVersion = 1
  reviewStatus = 'engineering-evidence'
  licenseReviewApprovedByBuildInput = [bool]$LicenseReviewApproved
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  sourceLicenses = @(
    [ordered]@{ name = 'Breeze-ASR-25'; revision = $BreezeRevision; license = 'MIT'; repository = 'https://github.com/mtkresearch/Breeze-ASR-25'; licenseFile = 'THIRD-PARTY-BREEZE-ASR-25-MIT.txt' },
    [ordered]@{ name = 'whisper-patch-breeze'; revision = $PatchedWhisperRevision; license = 'MIT'; repository = 'https://github.com/Splend1d/whisper-patch-breeze'; licenseFile = 'THIRD-PARTY-WHISPER-PATCH-MIT.txt' },
    [ordered]@{ name = 'Python'; version = $versionOutput; license = 'Python Software Foundation License'; licenseUrl = 'https://docs.python.org/3.11/license.html' },
    [ordered]@{ name = 'PyTorch'; requirement = $TorchRequirement; license = 'BSD-3-Clause'; licenseUrl = 'https://github.com/pytorch/pytorch/blob/main/LICENSE' }
  )
  installedPackages = @($installedPackages)
}
$licenseEvidence | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $stage 'runtime-license-review.json') -Encoding utf8
$noticeLines = @(
  'Offline Subtitle Factory Breeze ASR 25 managed runtime',
  "Runtime version: $RuntimeVersion",
  "Breeze-ASR-25 revision: $BreezeRevision (MIT; see THIRD-PARTY-BREEZE-ASR-25-MIT.txt)",
  "patched Whisper revision: $PatchedWhisperRevision (MIT; see THIRD-PARTY-WHISPER-PATCH-MIT.txt)",
  "Python: $versionOutput (Python Software Foundation License; https://docs.python.org/3.11/license.html)",
  "PyTorch requirement: $TorchRequirement (BSD-3-Clause; https://github.com/pytorch/pytorch/blob/main/LICENSE)",
  '',
  'The complete installed-package metadata evidence is in runtime-license-review.json.'
)
$noticeLines | Set-Content -LiteralPath (Join-Path $stage 'THIRD-PARTY-NOTICES.txt') -Encoding utf8

$packageManifest = [ordered]@{
  schemaVersion = 1
  engine = 'breeze-asr-25'
  runtimeVersion = $RuntimeVersion
  platform = 'win32'
  arch = 'x64'
  variant = 'cpu'
  pythonVersion = '3.11'
  torchRequirement = $TorchRequirement
  torchIndexUrl = $TorchIndexUrl
  releaseStatus = 'candidate'
  download = [ordered]@{ available = $false; url = $null; filename = $null; size = $null; uncompressedSize = $null; sha256 = $null }
  entrypoint = 'python.exe'
  probe = [ordered]@{ module = 'whisper'; requiredModel = 'breeze-asr-25' }
  source = [ordered]@{ breezeRepository = 'https://github.com/mtkresearch/Breeze-ASR-25'; breezeRevision = $BreezeRevision; patchedWhisperRevision = $PatchedWhisperRevision }
}
$packageManifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $stage 'runtime-manifest.json') -Encoding utf8

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
Push-Location $stage
try { & $sevenZip.Source 'a' '-tzip' '-mx=9' $zipPath '*'; if ($LASTEXITCODE -ne 0) { throw 'Runtime ZIP creation failed.' } }
finally { Pop-Location }

$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$zipSize = (Get-Item -LiteralPath $zipPath).Length
$uncompressedSize = (Get-ChildItem -LiteralPath $stage -Recurse -File | Measure-Object -Property Length -Sum).Sum
$packageManifest.releaseStatus = 'published-candidate'
$packageManifest.download = [ordered]@{
  available = $true
  url = "https://github.com/twyderek/offline-subtitle-factory-app/releases/download/breeze-runtime-$RuntimeVersion/breeze-runtime-win-x64-cpu-$RuntimeVersion.zip"
  filename = [IO.Path]::GetFileName($zipPath)
  size = [int64]$zipSize
  uncompressedSize = [int64]$uncompressedSize
  sha256 = $zipHash
}
$packageManifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8
[ordered]@{ manifest = $packageManifest; archive = [ordered]@{ filename = [IO.Path]::GetFileName($zipPath); size = $zipSize; sha256 = $zipHash }; licenseReview = 'approved-by-build-input' } | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $metadataPath -Encoding utf8

Write-Output "Runtime package: $zipPath"
Write-Output "Runtime manifest: $manifestPath"
Write-Output "SHA-256: $zipHash"
