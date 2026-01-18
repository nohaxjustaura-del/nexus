@echo off
echo ========================================
echo   FAISS VC Ranking Service
echo ========================================
echo.
echo Starting FAISS service on port 8001...
echo.

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if in correct directory
if not exist "faiss-service\faiss_api.py" (
    echo ERROR: Run this script from the project root directory
    pause
    exit /b 1
)

REM Check if requirements are installed
cd faiss-service

python -c "import faiss" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting FAISS API server...
echo Visit: http://localhost:8001/health
echo Press Ctrl+C to stop
echo.

python faiss_api.py

pause
