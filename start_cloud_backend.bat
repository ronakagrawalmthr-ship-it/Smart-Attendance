@echo off
title "Smart Attendance - Cloud Backend and Tunnel Launcher"
color 0a
cls
echo ===============================================================================
echo       SMART ATTENDANCE SYSTEM - 1-CLICK CLOUD SYSTEM LAUNCHER
echo                        Created by Ronak Agrawal
echo ===============================================================================
echo.
echo [1/3] Clearing stale processes on port 8000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [2/3] Starting Central FastAPI Backend API (Port 8000)...
start "Smart Attendance - Backend API (8000)" "%~dp0start_backend.bat"

echo Waiting 3 seconds for Backend to initialize...
ping 127.0.0.1 -n 4 >nul

echo [3/3] Starting Dedicated Ngrok Cloud Tunnel...
set "NGROK_BIN=ngrok"
if exist "%APPDATA%\npm\node_modules\ngrok\bin\ngrok.exe" (
    set "NGROK_BIN=%APPDATA%\npm\node_modules\ngrok\bin\ngrok.exe"
) else if exist "%APPDATA%\npm\node_modules\@expo\ngrok\node_modules\@expo\ngrok-bin-win32-x64\ngrok.exe" (
    set "NGROK_BIN=%APPDATA%\npm\node_modules\@expo\ngrok\node_modules\@expo\ngrok-bin-win32-x64\ngrok.exe"
)
start "Smart Attendance - Ngrok Dedicated Cloud Tunnel" cmd /k "title Smart Attendance - Ngrok Dedicated Cloud Tunnel & \"%NGROK_BIN%\" http 8000 --url=monika-monohydroxy-jimmy.ngrok-free.dev --host-header=rewrite"

echo Waiting 2 seconds for tunnel sync...
ping 127.0.0.1 -n 3 >nul

echo.
echo ===============================================================================
echo                     SYSTEM ONLINE - OPENING PORTAL!
echo ===============================================================================
echo  Backend Docs:       http://localhost:8000/docs
echo  Backend Cloud URL:  https://monika-monohydroxy-jimmy.ngrok-free.dev
echo  Web Showcase:       https://web-frontend-five-gray.vercel.app
echo  Admin Portal:       https://admin-portal-eta-lilac.vercel.app
echo  Student Portal:     https://student-portal-one-ruby.vercel.app
echo  HOD Hub:            https://hod-portal.vercel.app
echo ===============================================================================
echo.
start https://web-frontend-five-gray.vercel.app
