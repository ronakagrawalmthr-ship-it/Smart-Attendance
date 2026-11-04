@echo off
title Smart Attendance - Faculty & Student Mobile App (Expo Metro)
color 09
cls
echo ===============================================================================
echo     SMART ATTENDANCE SYSTEM - FACULTY & STUDENT MOBILE APP (EXPO METRO)
echo                        Created by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting Expo Metro Bundler for Smart Attendance Mobile App...
echo Once started, scan the terminal QR code with the Expo Go app on your phone.
echo (Make sure your phone and PC are on the same Wi-Fi, or use Ngrok Tunnel)
echo.
cd /d "%~dp0mobile-app"
npx expo start -c
pause
