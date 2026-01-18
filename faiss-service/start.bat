@echo off
echo Starting FAISS VC Ranking Service...
echo.
cd /d "%~dp0"
python faiss_api.py
pause
