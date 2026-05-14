@echo off
echo ========================================
echo   Smart Document Agent - Setup Script
echo ========================================
echo.

:: Backend setup
echo [1/4] Setting up Python backend...
cd backend
python -m venv venv
call .\venv\Scripts\activate
pip install -r requirements.txt
echo.

:: Frontend setup
echo [2/4] Setting up React frontend...
cd ..\frontend
call npm install
echo.

echo ========================================
echo   Setup complete!
echo   Run 'start.bat' to launch the app.
echo ========================================
pause
