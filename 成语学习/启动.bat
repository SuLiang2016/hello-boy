@echo off
chcp 65001 >nul
cd /d %~dp0
if not exist node_modules (
  echo 第一次运行，先安装依赖，需要几分钟...
  call npm install --no-audit --no-fund
)
if not exist dist (
  echo 正在构建页面...
  call npm run build
)
echo.
echo ============================================
echo   平板和电脑连同一个 WiFi，用平板浏览器
echo   打开下面打印的「平板访问」地址即可
echo   关闭这个窗口或按 Ctrl+C 停止
echo ============================================
echo.
node server\index.js
pause
