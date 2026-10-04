$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$version = (Get-Content -Raw -LiteralPath package.json | ConvertFrom-Json).version
$product = "CalculusWorkbench-v$version-Windows-x64"
$stage = Get-ChildItem -LiteralPath release/staging -Directory | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName $product } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $stage) { throw '先运行 npm run package:windows 生成当前版本的干净程序发行包。' }
$desktopPayload = Join-Path $projectRoot 'work/desktop-payload'
if (Test-Path -LiteralPath $desktopPayload) { throw '已有桌面暂存目录。先保留或移动旧暂存目录，再重新打包，避免混入旧文件。' }
New-Item -ItemType Directory -Path $desktopPayload -Force | Out-Null
foreach ($item in @('app','automation','node_modules','runtime','config','package.json','package-lock.json','README_使用说明.txt','ACCEPTANCE_REPORT.md')) {
  Copy-Item -LiteralPath (Join-Path $stage $item) -Destination $desktopPayload -Recurse
}
& node desktop/node_modules/electron-builder/cli.js --projectDir desktop --win nsis --x64
if ($LASTEXITCODE -ne 0) { throw '桌面发行包构建失败' }
Write-Host '桌面安装包已生成。发布前必须运行实际桌面与安装/卸载验收。'
