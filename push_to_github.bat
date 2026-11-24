@echo off
cd /d "%~dp0"
echo ===================================================
echo   Syncing & Pushing Smart Attendance to GitHub...
echo              Created by Ronak Agrawal
echo ===================================================
echo.
echo Staging all changes...
git add .
echo Committing updates...
git commit -m "Production release: 24/7 Cloud hosting, real-world deep-link QR, and IST time sync"
echo.
echo Pushing to GitHub repository...
git push origin main
echo.
echo ===================================================
echo   Finished! GitHub is updated and Vercel will auto-build.
echo ===================================================
pause
