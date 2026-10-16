@echo off
title Smart Attendance - HOD Departmental Command Deck (Port 3003)
color 03
cls
echo ===============================================================================
echo     SMART ATTENDANCE SYSTEM - HOD COMMAND DECK (PORT 3003)
echo                       Engineered by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting HOD Departmental Command Deck on http://localhost:3003 ...
echo (Ensure Backend is running on port 8000 for live data sync)
echo.
cd /d "%~dp0hod-portal"
npm run dev -- -p 3003
pause
