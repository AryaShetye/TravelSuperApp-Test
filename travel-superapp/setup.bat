@echo off
echo ============================================
echo  Travel Super App - First-Time Setup
echo ============================================
echo.

echo [1/4] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend npm install failed
    pause
    exit /b 1
)
echo Backend dependencies installed.
echo.

echo [2/4] Copying backend .env file...
if not exist .env (
    copy .env.example .env
    echo .env created. Please edit backend\.env with your API keys before starting.
) else (
    echo .env already exists, skipping.
)
cd ..

echo [3/4] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend npm install failed
    pause
    exit /b 1
)
echo Frontend dependencies installed.
echo.

echo [4/4] Copying frontend .env file...
if not exist .env (
    copy .env.example .env
    echo Frontend .env created.
) else (
    echo Frontend .env already exists, skipping.
)
cd ..

echo.
echo ============================================
echo  Setup Complete!
echo ============================================
echo.
echo NEXT STEPS:
echo  1. Edit backend\.env with your API keys
echo  2. Make sure PostgreSQL and MongoDB are running
echo  3. Run: psql -U postgres -f database\schema.sql
echo  4. Run: start-dev.bat to start all services
echo  5. (Optional) Run: cd backend ^&^& node utils/seed.js
echo.
pause
