@echo off
echo ============================================
echo    BuildConnect Network Access Setup
echo ============================================
echo.
echo This script will help you set up your application
echo to be accessible from other devices on your network.
echo.
echo Step 1: Finding your IP address...
echo.

for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
    for /f "tokens=*" %%a in ("%%i") do (
        set IP=%%a
        goto :found
    )
)

:found
if defined IP (
    echo Your IP address appears to be: %IP%
    echo.
    echo Step 2: Updating frontend configuration...
    echo.

    cd frontend
    echo BACKEND_URL=http://%IP%:5000> .env.local
    echo Updated frontend/.env.local with BACKEND_URL=http://%IP%:5000
    cd ..

    echo.
    echo Step 3: Instructions
    echo ===================
    echo.
    echo 1. Make sure your backend is running: cd backend && npm run dev
    echo 2. Make sure your frontend is running: cd frontend && npm run dev
    echo 3. Allow firewall access if prompted
    echo 4. Other devices can now access your app at:
    echo    Frontend: http://%IP%:3001
    echo    Backend:  http://%IP%:5000
    echo.
    echo 5. If the IP address is incorrect, edit frontend/.env.local manually
    echo.
    echo ============================================
    echo Setup complete! Your app should now be accessible
    echo from other devices on your network.
    echo ============================================

) else (
    echo Could not automatically detect your IP address.
    echo Please manually find your IP address and update frontend/.env.local
    echo.
    echo Example: BACKEND_URL=http://192.168.1.100:5000
)

pause