@echo off
REM ============================================================
REM VoyageAI — Windows Launch Script
REM ============================================================

echo.
echo  ===================================================
echo    VoyageAI - Starting Local Server
echo  ===================================================
echo.

REM Try Python 3 first
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Python found - starting server on http://localhost:8080
    echo.
    echo Press Ctrl+C to stop the server.
    echo.
    start http://localhost:8080
    python -m http.server 8080
    goto :end
)

REM Try python3 alias
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Python 3 found - starting server on http://localhost:8080
    start http://localhost:8080
    python3 -m http.server 8080
    goto :end
)

REM Try Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Node.js found - starting server with npx serve
    start http://localhost:3000
    npx serve -p 3000
    goto :end
)

echo ERROR: Neither Python nor Node.js is installed.
echo.
echo Please install one of the following:
echo   - Python 3: https://www.python.org/downloads/
echo   - Node.js:  https://nodejs.org/
echo.
echo Alternatively, just double-click index.html to open directly.
pause

:end
