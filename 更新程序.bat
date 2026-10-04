@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 请先在软件消息箱下载更新，并关闭工作台服务。
"runtime\node.exe" "automation\updater.mjs" --root "%cd%"
pause
