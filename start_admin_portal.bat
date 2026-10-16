@echo off
title Smart Attendance - Admin Governance Portal (Port 3001)
color 0d
cls
echo ===============================================================================
echo     SMART ATTENDANCE SYSTEM - EXECUTIVE ADMIN PORTAL (PORT 3001)
echo                       Engineered by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting Institutional Admin Portal on http://localhost:3001 ...
echo (Ensure Backend is running on port 8000 for live data sync)
echo.
cd /d "%~dp0admin-portal"
npm run dev -- -p 3001
pause
