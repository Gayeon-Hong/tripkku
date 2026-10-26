@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Checking appName in apps-in-toss.config.ts. It MUST match Toss console.
echo Building .ait bundle...
call npm run build
if errorlevel 1 (
  echo Build failed. Read the error output. No valid .ait created.
  pause
  exit /b 1
)
echo Build complete. Searching for .ait files:
where /r . *.ait
if errorlevel 1 echo Not found in this folder. Check build output and SDK docs.
pause
