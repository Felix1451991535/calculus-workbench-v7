param([string]$AppRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath($AppRoot)
$nodePath = Join-Path $taskRoot 'runtime\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) { throw '缺少打包运行时，请先生成完整软件包。' }
$maintenanceScript = Join-Path $taskRoot 'automation\Run-Maintenance.ps1'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 45)
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$dailyAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$maintenanceScript`" -AppRoot `"$taskRoot`"" -WorkingDirectory $taskRoot
$weeklyAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$maintenanceScript`" -AppRoot `"$taskRoot`" -Weekly" -WorkingDirectory $taskRoot
$daily = New-ScheduledTaskTrigger -Daily -At '20:00'
$login = New-ScheduledTaskTrigger -AtLogOn -User $user
$weekly = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At '10:00'
Register-ScheduledTask -TaskName 'CalculusWorkbenchV7-Daily' -Action $dailyAction -Trigger @($daily,$login) -Settings $settings -Principal $principal -Description 'V7 每日与登录健康检查；Candidate 修复，禁止直接修改 Stable' -Force | Out-Null
Register-ScheduledTask -TaskName 'CalculusWorkbenchV7-Weekly' -Action $weeklyAction -Trigger $weekly -Settings $settings -Principal $principal -Description 'V7 每周回归、备份恢复和公式压力检查' -Force | Out-Null
Write-Host '已注册 V7 每日与每周维护。电脑关机期间暂停；密钥缺失时 AI 修复报告 BLOCKED。'
