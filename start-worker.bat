@echo off
echo.
echo ========================================
echo   NEXUS background worker
echo ========================================
echo.
echo Starting automated data update system...
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Loading environment variables...
echo.

REM Load environment variables from .env.local
if exist ".env.local" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env.local") do (
        set "%%a=%%b"
    )
    echo ✅ Environment variables loaded
) else (
    echo ⚠️  Warning: .env.local not found
)

echo.
echo Starting worker in background...
echo Press Ctrl+C to stop the worker
echo.

REM Start the worker
npm run worker:start

pause
