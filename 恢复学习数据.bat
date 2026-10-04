@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 恢复前请关闭工作台，当前数据会另存为备份。
set /p "backupName=请输入 backups 目录中的备份名称："
"runtime\node.exe" "automation\restore.mjs" "%backupName%"
pause
