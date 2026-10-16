@echo off
title Smart Attendance - Web Showcase & Teacher Console (Port 3000)
color 0b
cls
echo ===============================================================================
echo     SMART ATTENDANCE SYSTEM - WEB SHOWCASE & TEACHER CONSOLE (PORT 3000)
echo                       Engineered by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting Web Frontend & Teacher Console on http://localhost:3000 ...
echo (Ensure Backend is running on port 8000 for live data sync)
echo.
cd /d "%~dp0web-frontend"
npm run dev -- -p 3000
pause
