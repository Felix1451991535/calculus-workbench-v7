param([Parameter(Mandatory=$true)][string]$AppRoot,[switch]$Weekly)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath($AppRoot)
$nodePath = Join-Path $taskRoot 'runtime\node.exe'
$scriptPath = Join-Path $taskRoot 'automation\maintenance.mjs'
$reportRoot = Join-Path $taskRoot 'logs\maintenance'
New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
$stamp = Get-Date -Format yyyyMMdd-HHmmss
$arguments = @("`"$scriptPath`"",'--repair')
if ($Weekly) { $arguments += '--weekly' }
$taskProcess = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -Wait -RedirectStandardOutput (Join-Path $reportRoot "$stamp-stdout.txt") -RedirectStandardError (Join-Path $reportRoot "$stamp-stderr.txt")
exit $taskProcess.ExitCode
