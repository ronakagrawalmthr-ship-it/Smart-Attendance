@echo off
title Smart Attendance - Ngrok Cloud Tunnel (Port 8000)
color 0f
cls
echo ===============================================================================
echo     SMART ATTENDANCE SYSTEM - NGROK CLOUD TUNNEL (PORT 8000)
echo                       Engineered by Ronak Agrawal
echo ===============================================================================
echo.
echo Forwarding local backend (http://localhost:8000) to a public HTTPS URL...
echo Copy the "Forwarding" https:// URL shown below and paste it in your Mobile App / Portal.
echo.
ngrok http 8000
pause
