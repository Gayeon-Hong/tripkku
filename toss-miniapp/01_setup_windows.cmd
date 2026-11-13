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
rem apps-in-toss.config.ts is already in the repo (appName tripggoo, webBundleDir dist).
rem Running "ait init" again overwrites it with a broken Windows path, so only run it when the file is missing.
if exist "apps-in-toss.config.ts" (
  echo [2/2] apps-in-toss.config.ts found. Skipping ait init.
) else (
  echo [2/2] SDK initialization...
  echo Enter the SAME appName as your Toss developer console: tripggoo
  call npx ait init
  if errorlevel 1 (
    echo ait init failed. See README and SDK docs.
    pause
    exit /b 1
  )
  echo CHECK apps-in-toss.config.ts: appName tripggoo, webBundleDir 'dist'.
)
echo Done. Next: 02_build_windows.cmd
pause
