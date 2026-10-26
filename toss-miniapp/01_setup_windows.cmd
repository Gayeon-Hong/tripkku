@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/2] npm dependencies ...
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Install Node.js 22 LTS: https://nodejs.org/
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo npm install failed. Check internet and npm errors.
  pause
  exit /b 1
)
echo [2/2] SDK initialization...
echo Enter the SAME appName as your Toss developer console.
call npx ait init
if errorlevel 1 (
  echo ait init failed. See README and SDK docs.
  pause
  exit /b 1
)
echo Done. CHECK apps-in-toss.config.ts appName, webBundleDir=dist.
pause
