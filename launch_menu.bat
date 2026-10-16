@echo off
title Smart Attendance - Interactive Control Center
color 0b

:MENU
cls
echo ===============================================================================
echo            SMART ATTENDANCE SYSTEM - INTERACTIVE LAUNCH CONTROL
echo                       Engineered by Ronak Agrawal
echo ===============================================================================
echo.
echo  Choose which service you want to start, or launch everything:
echo.
echo   [1] Start Central Backend API           (Port 8000 - FastAPI)
echo   [2] Start Web Showcase & Teacher Console (Port 3000 - Next.js)
echo   [3] Start Admin Governance Portal        (Port 3001 - Next.js)
echo   [4] Start Student Academic Portal        (Port 3002 - Next.js)
echo   [5] Start HOD Departmental Command Deck  (Port 3003 - Next.js)
echo   [6] Start Teacher Mobile App             (Expo Metro Bundler)
echo   [7] Start Ngrok Cloud Tunnel             (Port 8000 - Public HTTPS)
echo.
echo   -----------------------------------------------------------------------------
echo   [8] Start ALL Services Simultaneously    (Master 1-Click Launch)
echo   [9] Stop ALL Running Services            (Kill Node, Python, Ngrok)
echo   [0] Exit Menu
echo.
echo ===============================================================================
set /p choice="Enter your choice [0-9]: "

if "%choice%"=="1" goto BACKEND
if "%choice%"=="2" goto WEB
if "%choice%"=="3" goto ADMIN
if "%choice%"=="4" goto STUDENT
if "%choice%"=="5" goto HOD
if "%choice%"=="6" goto MOBILE
if "%choice%"=="7" goto NGROK
if "%choice%"=="8" goto ALL
if "%choice%"=="9" goto STOP
if "%choice%"=="0" goto EXIT

echo.
echo [!] Invalid selection. Please enter a number between 0 and 9.
timeout /t 2 >nul
goto MENU

:BACKEND
echo Starting Central Backend API (Port 8000)...
start "Smart Attendance - Backend API (8000)" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"
goto MENU

:WEB
echo Starting Web Showcase & Teacher Console (Port 3000)...
start "Smart Attendance - Web & Teacher (3000)" cmd /k "cd /d "%~dp0web-frontend" && npm run dev -- -p 3000"
goto MENU

:ADMIN
echo Starting Admin Governance Portal (Port 3001)...
start "Smart Attendance - Admin Portal (3001)" cmd /k "cd /d "%~dp0admin-portal" && npm run dev -- -p 3001"
goto MENU

:STUDENT
echo Starting Student Academic Portal (Port 3002)...
start "Smart Attendance - Student Portal (3002)" cmd /k "cd /d "%~dp0student-portal" && npm run dev -- -p 3002"
goto MENU

:HOD
echo Starting HOD Departmental Command Deck (Port 3003)...
start "Smart Attendance - HOD Portal (3003)" cmd /k "cd /d "%~dp0hod-portal" && npm run dev -- -p 3003"
goto MENU

:MOBILE
echo Starting Teacher Mobile App (Expo Metro)...
start "Smart Attendance - Teacher Mobile App (Expo QR)" cmd /k "cd /d "%~dp0mobile-app" && title Smart Attendance - Teacher Mobile App (Expo QR) && npx expo start -c"
goto MENU

:NGROK
echo Starting Ngrok Cloud Tunnel (Port 8000)...
start "Smart Attendance - Ngrok Cloud Tunnel (8000)" cmd /k "title Smart Attendance - Ngrok Cloud Tunnel (8000) && ngrok http 8000"
goto MENU

:ALL
echo Launching all services...
call "%~dp0start_all.bat"
goto MENU

:STOP
echo Stopping all running services...
call "%~dp0stop_all.bat"
goto MENU

:EXIT
echo Exiting launcher control. Have a great day!
exit /b 0
