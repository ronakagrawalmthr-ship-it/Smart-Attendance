@echo off
title Smart Attendance - Admin Governance Portal (Port 3001)
color 0d
cls
echo ===============================================================================
echo     SMART ATTENDANCE SYSTEM - EXECUTIVE ADMIN PORTAL (PORT 3001)
echo                        Created by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting Institutional Admin Portal on http://localhost:3001 ...
echo (Ensure Backend is running on port 8000 for live data sync)
echo.
cd /d "%~dp0admin-portal"
npm run dev -- -H 0.0.0.0 -p 3001
pause
