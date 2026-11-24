@echo off
title Smart Attendance - Master Control Launcher
color 0b
cls
echo ===============================================================================
echo            SMART ATTENDANCE SYSTEM - 1-CLICK MASTER LAUNCHER
echo                        Created by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting all backend, frontend, ngrok tunnel, and mobile services...
echo.

:: 1. Start Backend Server (FastAPI on Port 8000)
echo [1/7] Booting Central Backend & AI Biometrics Engine (Port 8000)...
start "Smart Attendance - Backend API (8000)" "%~dp0start_backend.bat"

:: Wait 3 seconds for backend to initialize
ping 127.0.0.1 -n 4 >nul

:: 2. Start Ngrok Cloud Tunnel (Dedicated Domain for Backend Port 8000)
echo [2/7] Booting Ngrok Cloud Tunnel on Dedicated Domain (Port 8000)...
start "Smart Attendance - Ngrok Cloud Tunnel" "%~dp0start_ngrok.bat"

:: 3. Start Web Frontend & Teacher Console (Port 3000)
echo [3/7] Booting Web Showcase & Teacher Console (Port 3000)...
start "Smart Attendance - Web & Teacher (3000)" cmd /k "cd /d "%~dp0web-frontend" && npm run dev -- -H 0.0.0.0 -p 3000"

:: 4. Start Admin Institutional Portal (Port 3001)
echo [4/7] Booting Institutional Governance Admin Portal (Port 3001)...
start "Smart Attendance - Admin Portal (3001)" cmd /k "cd /d "%~dp0admin-portal" && npm run dev -- -H 0.0.0.0 -p 3001"

:: 5. Start Student Academic Portal (Port 3002)
echo [5/7] Booting Student Academic Portal (Port 3002)...
start "Smart Attendance - Student Portal (3002)" cmd /k "cd /d "%~dp0student-portal" && npm run dev -- -H 0.0.0.0 -p 3002"

:: 6. Start HOD Command Hub (Port 3003)
echo [6/7] Booting HOD Departmental Command Deck (Port 3003)...
start "Smart Attendance - HOD Portal (3003)" cmd /k "cd /d "%~dp0hod-portal" && npm run dev -- -H 0.0.0.0 -p 3003"

:: 7. Start Mobile App (Expo Metro Server & QR Code in Terminal)
echo [7/7] Booting Faculty & Student Mobile App & Generating Expo QR Code...
start "Smart Attendance - Mobile App (Expo QR)" cmd /k "cd /d "%~dp0mobile-app" && title Smart Attendance - Mobile App (Expo QR) && npx expo start -c"

echo.
echo ===============================================================================
echo                        ALL SERVICES ARE NOW ACTIVE!
echo ===============================================================================
echo.
echo  [API Backend]        http://localhost:8000/docs  (FastAPI Swagger Engine)
echo  [Cloud Backend]      https://smart-attendance-api-o49f.onrender.com
echo.
echo  LIVE CLOUD PRODUCTION PORTALS (Vercel):
echo  - Main Showcase:     https://web-frontend-five-gray.vercel.app
echo  - Admin Portal:      https://admin-portal-eta-lilac.vercel.app
echo  - Student Portal:    https://student-portal-one-ruby.vercel.app
echo  - HOD Command Hub:   https://hod-portal.vercel.app
echo.
echo  LOCAL DEVELOPMENT PORTALS:
echo  - Main Showcase:     http://localhost:3000
echo  - Admin Portal:      http://localhost:3001
echo  - Student Portal:    http://localhost:3002
echo  - HOD Command Hub:   http://localhost:3003
echo  - Mobile App:        Expo Terminal is OPEN! Scan the QR Code with Expo Go!
echo.
echo  To safely close all services anytime, run: stop_all.bat
echo ===============================================================================
echo.
pause
