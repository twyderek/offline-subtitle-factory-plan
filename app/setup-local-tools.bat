@echo off
setlocal EnableExtensions

set "APP_DIR=%~dp0"
set "PS1=%APP_DIR%scripts\setup-local-tools.ps1"

if not exist "%PS1%" (
  echo [ERROR] Missing setup script: %PS1%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 (
  echo.
  echo [ERROR] Local tool setup failed.
  pause
  exit /b 1
)

echo.
echo Local tool setup completed.
pause
