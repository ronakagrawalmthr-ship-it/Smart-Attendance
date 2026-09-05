@echo off
title Smart Attendance - Shutdown Master
color 0c
cls
echo ===============================================================================
echo            SMART ATTENDANCE SYSTEM - 1-CLICK SHUTDOWN
echo ===============================================================================
echo.
echo Stopping all running backend and frontend services...
echo.

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,3000,3001,3002,3003 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

taskkill /F /FI "WINDOWTITLE eq Smart Attendance - Backend API (8000)*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Smart Attendance - Web & Teacher (3000)*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Smart Attendance - Admin Portal (3001)*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Smart Attendance - Student Portal (3002)*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Smart Attendance - HOD Portal (3003)*" >nul 2>&1

echo [OK] Ports 8000, 3000, 3001, 3002, and 3003 have been released.
echo [OK] All Smart Attendance servers stopped successfully.
echo.
echo ===============================================================================
pause
