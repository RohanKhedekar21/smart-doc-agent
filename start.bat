@echo off
echo ========================================
echo   Smart Document Agent - Starting...
echo ========================================
echo.

:: Start backend in a new window
echo [1/2] Starting Python backend on http://127.0.0.1:8000 ...
start "SmartAgent Backend" cmd /k "cd backend && .\venv\Scripts\activate && python run.py"

:: Wait for backend to boot
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
echo [2/2] Starting React frontend on http://localhost:5173 ...
start "SmartAgent Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Both servers are starting!
echo   Frontend: http://localhost:5173
echo   Backend:  http://127.0.0.1:8000/docs
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
