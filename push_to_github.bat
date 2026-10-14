@echo off
cd /d "%~dp0"
echo ===================================================
echo   Pushing Smart Attendance Project to GitHub...
echo ===================================================
echo.
git push -u origin main
echo.
echo ===================================================
echo   Finished! You can close this window.
echo ===================================================
pause
