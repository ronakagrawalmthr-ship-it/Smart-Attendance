@echo off
title Smart Attendance - Central Backend API (Port 8000)
color 0a
cls
echo ===============================================================================
echo       SMART ATTENDANCE SYSTEM - FASTAPI BACKEND & BIOMETRICS ENGINE
echo                       Engineered by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting FastAPI Backend Server on http://localhost:8000 ...
echo Swagger API Documentation will be available at: http://localhost:8000/docs
echo.
cd /d "%~dp0backend"
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Python Virtual Environment (venv) not found in backend directory!
    echo Please create it first: python -m venv venv
    pause
    exit /b 1
)
venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
pause
