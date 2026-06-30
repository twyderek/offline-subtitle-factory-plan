@echo off
setlocal EnableExtensions

set "APP_DIR=%~dp0"
set "PORT=8790"
set "URL=http://127.0.0.1:%PORT%"
set "NODE_EXE=%APP_DIR%tools\node\node.exe"
set "SERVER_FILE=%APP_DIR%server.mjs"

cd /d "%APP_DIR%"

if not exist "%NODE_EXE%" (
  echo.
  echo [ERROR] Project-local Node.js was not found.
  echo Please run setup-local-tools.bat first.
  echo.
  pause
  exit /b 1
)

if not exist "%SERVER_FILE%" (
  echo.
  echo [ERROR] Missing server file:
  echo %SERVER_FILE%
  echo Please restore server.mjs or download the complete app package again.
  echo.
  pause
  exit /b 1
)

echo.
echo Starting Offline Subtitle Factory...
echo App folder: %APP_DIR%
echo Node: %NODE_EXE%
echo URL: %URL%
echo.

for /f "tokens=5" %%P in ('netstat -ano ^| findstr "127.0.0.1:%PORT%" ^| findstr "LISTENING"') do (
  echo Stopping existing server on port %PORT% ...
  taskkill /PID %%P /F >nul 2>nul
)

set "PATH=%APP_DIR%tools\ffmpeg\bin;%APP_DIR%tools\python-venv\Scripts;%PATH%"
set "XDG_CACHE_HOME=%APP_DIR%tools"
set "WHISPER_CACHE=%APP_DIR%tools\whisper-models"

start "" "%URL%"
"%NODE_EXE%" "%SERVER_FILE%"

echo.
echo Server stopped.
pause
