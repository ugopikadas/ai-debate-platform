@echo off
echo Starting AI Debate Platform...

echo.
echo Killing any existing Node processes...
taskkill /f /im node.exe 2>nul

echo.
echo Starting Backend Server...
cd ai-debate-platform\backend
start "Backend Server" cmd /k "npm run dev"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend Server...
cd ..\web-frontend
start "Frontend Server" cmd /k "npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3001
echo.
echo Press any key to exit...
pause >nul
