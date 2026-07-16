@echo off
title ZEN FLOW Mobile Preview - Keep This Window Open
cd /d "%~dp0"

set "NODE=%~dp0..\work\node-v22.23.1-win-x64\node.exe"
set "TSX=%~dp0node_modules\tsx\dist\cli.mjs"

if not exist "%NODE%" (
  echo.
  echo [ERROR] Project Node.js was not found.
  echo Please do not move this file. Show this window to Codex for help.
  echo.
  pause
  exit /b 1
)

if not exist "%TSX%" (
  echo.
  echo [ERROR] Project packages were not found.
  echo.
  pause
  exit /b 1
)

set "LAN_IP="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$r=Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue ^| Sort-Object RouteMetric ^| Select-Object -First 1; if($r){(Get-NetIPAddress -InterfaceIndex $r.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue ^| Select-Object -First 1).IPAddress}"`) do set "LAN_IP=%%I"

echo.
echo ============================================================
echo   ZEN FLOW MOBILE PREVIEW
echo ============================================================
echo.
echo   KEEP THIS WINDOW OPEN while using mobile preview.
echo   Phone and computer must use the same Wi-Fi.
echo.
if defined LAN_IP (
  echo   PHONE URL: http://%LAN_IP%:3000
) else (
  echo   Run ipconfig and use the IPv4 address with port 3000.
)
echo.
echo   COMPUTER URL: http://127.0.0.1:3000/mobile-preview.html
echo.
echo ============================================================
echo.

"%NODE%" "%TSX%" server.ts

echo.
echo Mobile preview has stopped. Double-click this file to restart it.
pause
