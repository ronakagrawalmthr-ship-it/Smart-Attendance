@echo off
title Smart Attendance - Master Control Launcher
color 0b
cls
echo ===============================================================================
echo            SMART ATTENDANCE SYSTEM - 1-CLICK MASTER LAUNCHER
echo                  Platform Engineered by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting all backend and frontend services...
echo.

:: 1. Start Backend Server (FastAPI on Port 8000)
echo [1/5] Booting Central Backend & AI Biometrics Engine (Port 8000)...
start "Smart Attendance - Backend API (8000)" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: 2. Start Web Frontend & Teacher Console (Port 3000)
echo [2/5] Booting Web Showcase & Teacher Console (Port 3000)...
start "Smart Attendance - Web & Teacher (3000)" cmd /k "cd /d "%~dp0web-frontend" && npm run dev -- -p 3000"

:: 3. Start Admin Institutional Portal (Port 3001)
echo [3/5] Booting Institutional Governance Admin Portal (Port 3001)...
start "Smart Attendance - Admin Portal (3001)" cmd /k "cd /d "%~dp0admin-portal" && npm run dev -- -p 3001"

:: 4. Start Student Academic Portal (Port 3002)
echo [4/5] Booting Student Academic Portal (Port 3002)...
start "Smart Attendance - Student Portal (3002)" cmd /k "cd /d "%~dp0student-portal" && npm run dev -- -p 3002"

:: 5. Start HOD Command Hub (Port 3003)
echo [5/5] Booting HOD Departmental Command Deck (Port 3003)...
start "Smart Attendance - HOD Portal (3003)" cmd /k "cd /d "%~dp0hod-portal" && npm run dev -- -p 3003"

echo.
echo ===============================================================================
echo                        ALL SERVICES ARE NOW ACTIVE!
echo ===============================================================================
echo.
echo  [API Backend]     http://localhost:8000/docs  (FastAPI Swagger Engine)
echo  [Main Showcase]   http://localhost:3000       (Landing & Teacher Console)
echo  [Admin Portal]    http://localhost:3001       (Executive Admin Suite)
echo  [Student Portal]  http://localhost:3002       (Student Profile & Attendance)
echo  [HOD Command Hub] http://localhost:3003       (Classes, Excel & Analytics)
echo.
echo  Tip: To launch the Mobile App on phone, run in a separate terminal:
echo       cd mobile-app ^&^& npx expo start
echo.
echo  To safely close all services anytime, run: stop_all.bat
echo ===============================================================================
echo.
pause
