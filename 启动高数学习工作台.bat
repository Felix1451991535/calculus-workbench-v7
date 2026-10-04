@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "runtime\node.exe" (
  echo 发行包缺少运行时，请下载完整 Windows ZIP。
  pause
  exit /b 1
)
"runtime\node.exe" "automation\launch.mjs"
if errorlevel 1 pause
