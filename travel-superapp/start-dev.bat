@echo off
echo ============================================
echo  Travel Super App - Development Startup
echo ============================================
echo.
echo Starting all services...
echo.
echo [1/3] Starting Node.js backend on port 5000...
start "Backend" cmd /k "cd backend && npm run dev"

echo [2/3] Starting Spring Boot microservice on port 8080...
start "Spring Boot" cmd /k "cd spring-service && mvn spring-boot:run"

echo [3/3] Starting React frontend on port 3000...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo ============================================
echo  All services starting in separate windows
echo ============================================
echo.
echo  Frontend:    http://localhost:3000
echo  Backend API: http://localhost:5000/api/health
echo  Spring Boot: http://localhost:8080/actuator/health
echo.
pause
