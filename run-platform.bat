@echo off
echo ========================================
echo    AI DEBATE PLATFORM STARTUP
echo ========================================
echo.

echo Step 1: Starting Backend Server...
cd /d "C:\Users\ugopi\CascadeProjects\ai-debate-platform\backend"
echo Current directory: %CD%
echo.

echo Checking if Node.js is available...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Starting backend server on port 5000...
start "AI Debate Backend" cmd /k "node src/index.js"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Step 2: Starting Frontend Server...
cd /d "C:\Users\ugopi\CascadeProjects\ai-debate-platform\web-frontend"
echo Current directory: %CD%

echo.
echo Starting frontend server on port 3002...
start "AI Debate Frontend" cmd /k "npm start"

echo.
echo ========================================
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3002
echo ========================================
echo.
echo Press any key to open the platform in browser...
pause > nul

echo Opening platform in browser...
start http://localhost:3002

echo.
echo Platform is running! Check the opened browser window.
echo Press any key to exit...
pause > nul
