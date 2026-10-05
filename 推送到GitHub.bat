@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo    推送 AI 雷达 到 GitHub
echo ============================================
echo.
echo 请先在 GitHub 网页上新建一个空仓库（不要勾选 README）
echo 然后复制它的地址（形如 https://github.com/用户名/ai-radar.git）
echo.
set /p URL="把仓库地址粘贴到这里，然后回车: "
echo.
git init
git config user.name "JXGM"
git config user.email "jxgm@users.noreply.github.com"
git add -A
git commit -m "init: ai radar panel"
git branch -M main
git remote remove origin 2>nul
git remote add origin %URL%
echo.
echo 接下来会要求登录：
echo   Username 输入你的 GitHub 用户名
echo   Password 粘贴你的 Personal Access Token（不是登录密码）
echo.
git push -u origin main
echo.
echo ============================================
echo   完成！接下来去仓库 Settings - Pages 开启
echo ============================================
pause