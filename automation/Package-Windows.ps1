param([string]$Version = '1.0.0')
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$stage = Join-Path $taskRoot "release\staging\$(Get-Date -Format yyyyMMdd-HHmmss)\CalculusWorkbench-v$Version-Windows-x64"
if (Test-Path -LiteralPath $stage) { throw '打包暂存目录已存在，拒绝覆盖。' }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
foreach ($dir in @('app\build','app\dist','automation','config')) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent (Join-Path $stage $dir)) | Out-Null
  if ($dir -eq 'config') {
    New-Item -ItemType Directory -Force -Path (Join-Path $stage $dir) | Out-Null
    if (Test-Path -LiteralPath (Join-Path $taskRoot 'config\update-public.pem')) { Copy-Item -LiteralPath (Join-Path $taskRoot 'config\update-public.pem') -Destination (Join-Path $stage 'config\update-public.pem') }
    if (Test-Path -LiteralPath (Join-Path $taskRoot 'config\distribution.json')) { Copy-Item -LiteralPath (Join-Path $taskRoot 'config\distribution.json') -Destination (Join-Path $stage 'config\distribution.json') }
  } else { Copy-Item -LiteralPath (Join-Path $taskRoot $dir) -Destination (Join-Path $stage $dir) -Recurse }
}
foreach ($dir in @('runtime','data','updates','backups','logs','exports')) { New-Item -ItemType Directory -Force -Path (Join-Path $stage $dir) | Out-Null }
$nodeCommand = Get-Command node
Copy-Item -LiteralPath $nodeCommand.Source -Destination (Join-Path $stage 'runtime\node.exe')
if (Test-Path -LiteralPath (Join-Path $taskRoot 'runtime\LICENSE.txt')) { Copy-Item -LiteralPath (Join-Path $taskRoot 'runtime\LICENSE.txt') -Destination (Join-Path $stage 'runtime\LICENSE.txt') }
Copy-Item -LiteralPath (Join-Path $taskRoot 'package.json'),(Join-Path $taskRoot 'package-lock.json'),(Join-Path $taskRoot 'README_使用说明.txt') -Destination $stage
if (Test-Path -LiteralPath (Join-Path $taskRoot 'ACCEPTANCE_REPORT.md')) { Copy-Item -LiteralPath (Join-Path $taskRoot 'ACCEPTANCE_REPORT.md') -Destination $stage }
[IO.File]::WriteAllText((Join-Path $stage 'config\current-version.json'), ('{"version":"' + $Version + '","directory":"."}'), (New-Object Text.UTF8Encoding($false)))
Get-ChildItem -LiteralPath $taskRoot -Filter '*.bat' | Copy-Item -Destination $stage
Push-Location $stage
try {
  # npm run injects user npm config into its child's environment. Keep this process-local.
  $env:npm_config_allow_scripts = $null
  npm ci --omit=dev --cache (Join-Path $taskRoot 'work\npm-cache') --fetch-retries=0 --fetch-timeout=15000
  if ($LASTEXITCODE -ne 0) { throw '生产依赖安装失败' }
} finally { Pop-Location }
$privateFiles = Get-ChildItem -LiteralPath $stage -Recurse -File | Where-Object { $_.Name -match '(\.sqlite($|-)|\.key$|private.*\.pem$|provider\.json$|local\.json$|\.log$)' -or $_.FullName -match '\\(data|backups|logs)\\.+' }
if ($privateFiles) { throw '发行包隐私检查失败' }
$archive = Join-Path $taskRoot "release\CalculusWorkbench-v$Version-Windows-x64.zip"
if (Test-Path -LiteralPath $archive) { throw '目标ZIP已存在，拒绝覆盖。' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory((Split-Path -Parent $stage),$archive,[IO.Compression.CompressionLevel]::Fastest,$false)
$sha = [Security.Cryptography.SHA256]::Create()
$stream = [IO.File]::OpenRead($archive)
try { $digest = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant(); Write-Host "SHA256 $digest" } finally { $stream.Dispose(); $sha.Dispose() }
