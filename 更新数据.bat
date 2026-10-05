@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo    AI 变现雷达 · 更新数据
echo ============================================
echo.
node --use-system-ca scripts/fetch.mjs
if errorlevel 1 (
  echo.
  echo [失败] 请确认已安装 Node.js
)
echo.
echo --------------------------------------------
echo   更新完成！回到网页按 F5 刷新即可。
echo --------------------------------------------
pause