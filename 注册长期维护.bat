@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 即将注册当前 Windows 用户的每日20:00、登录自检和周六10:00维护任务。
echo 不修改旧软件任务。移动目录后请重新运行此脚本更新任务路径。
powershell -NoProfile -ExecutionPolicy Bypass -File "automation\Register-MaintenanceTasks.ps1"
pause
