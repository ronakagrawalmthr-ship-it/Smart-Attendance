@echo off
title Smart Attendance - Student Academic Portal (Port 3002)
color 0e
cls
echo ===============================================================================
echo     SMART ATTENDANCE SYSTEM - STUDENT ACADEMIC PORTAL (PORT 3002)
echo                       Engineered by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting Student Academic Portal on http://localhost:3002 ...
echo (Ensure Backend is running on port 8000 for live data sync)
echo.
cd /d "%~dp0student-portal"
npm run dev -- -p 3002
pause
