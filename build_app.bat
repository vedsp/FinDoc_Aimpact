@echo off
echo ========================================================
echo        FinDocAI Standalone Build Script
echo ========================================================
echo.
echo Step 1: Building React Frontend...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error: Frontend build failed!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo Step 2: Preparing Python Backend...
cd backend
if not exist ".venv\Scripts\python.exe" (
    echo Error: Virtual environment not found at backend\.venv
    echo Please create it with: python -m venv backend\.venv
    pause
    exit /b 1
)
call .venv\Scripts\python.exe -m pip install pyinstaller pydantic-settings passlib bcrypt python-multipart psycopg email-validator "python-jose[cryptography]"
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies!
    pause
    exit /b %errorlevel%
)

echo.
echo Step 3: Packaging as FinDocAI.exe...
call .venv\Scripts\python.exe -m PyInstaller --name "FinDocAI" --onefile --clean --paths . --icon "../frontend/public/favicon.ico" --hidden-import pydantic_settings --hidden-import passlib.handlers.bcrypt --hidden-import psycopg --hidden-import email_validator --hidden-import reportlab --add-data "../frontend/dist:frontend_dist" app/main.py
if %errorlevel% neq 0 (
    echo Error: PyInstaller failed!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo ========================================================
echo  SUCCESS!
echo  Your standalone app is at: backend\dist\FinDocAI.exe
echo  Send ONLY that single .exe to your team.
echo  They just double-click it - no setup needed!
echo ========================================================
pause
