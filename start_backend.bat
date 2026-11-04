@echo off
title Smart Attendance - Central Backend API (Port 8000)
color 0a
cls
echo ===============================================================================
echo       SMART ATTENDANCE SYSTEM - FASTAPI BACKEND & BIOMETRICS ENGINE
echo                        Created by Ronak Agrawal
echo ===============================================================================
echo.
echo Starting FastAPI Backend Server on http://localhost:8000 ...
echo Swagger API Documentation will be available at: http://localhost:8000/docs
echo.
cd /d "%~dp0backend"
if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
    if not errorlevel 1 goto end
    echo.
    echo [NOTICE] venv python failed, attempting system python...
)
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
if not errorlevel 1 goto end
py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
:end
pause
