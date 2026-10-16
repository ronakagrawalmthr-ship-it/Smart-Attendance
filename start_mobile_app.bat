@echo off
title Smart Attendance - Teacher Mobile App (Expo Metro)
color 09
cls
echo ===============================================================================
echo     SMART ATTENDANCE SYSTEM - TEACHER MOBILE APP (EXPO METRO SERVER)
echo                       Engineered by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting Expo Metro Bundler for Teacher Mobile App...
echo Once started, scan the terminal QR code with the Expo Go app on your phone.
echo (Make sure your phone and PC are on the same Wi-Fi, or use Ngrok Tunnel)
echo.
cd /d "%~dp0mobile-app"
npx expo start -c
pause
