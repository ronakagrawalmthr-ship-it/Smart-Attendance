@echo off
title Smart Attendance - Ngrok Cloud Tunnel (monika-monohydroxy-jimmy.ngrok-free.dev)
color 0f
cls
echo ===============================================================================
echo     SMART ATTENDANCE SYSTEM - DEDICATED NGROK CLOUD TUNNEL
echo                        Created by Ronak Agrawal
echo ===============================================================================
echo.
echo Binding local FastAPI backend (http://localhost:8000) to your dedicated domain:
echo  https://monika-monohydroxy-jimmy.ngrok-free.dev
echo.
echo Connected Portals:
echo  - Main & Teacher:   https://web-frontend-five-gray.vercel.app
echo  - Admin Portal:     https://admin-portal-eta-lilac.vercel.app
echo  - Student Portal:   https://student-portal-one-ruby.vercel.app
echo  - HOD Hub:          https://hod-portal.vercel.app
echo.
ngrok http 8000 --url=monika-monohydroxy-jimmy.ngrok-free.dev
pause
