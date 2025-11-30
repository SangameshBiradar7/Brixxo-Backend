@echo off
echo 🏗️ BuildConnect - Quick Start Helper
echo ====================================
echo.

echo 📋 Checking your current setup...
echo.

echo Current directory: %CD%
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo 📥 Please install Node.js from: https://nodejs.org/
    echo 📖 See INSTALLATION-GUIDE.md for detailed instructions.
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
    for /f "tokens=*" %%i in ('node --version') do echo    Version: %%i
)

echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Git is not installed
    echo 📖 This is optional. You can download the project manually.
    echo 📖 See INSTALLATION-GUIDE.md for manual download instructions.
) else (
    echo ✅ Git is installed
    for /f "tokens=*" %%i in ('git --version') do echo    Version: %%i
)

echo.

where mongod >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ MongoDB is not installed!
    echo 📥 Please install MongoDB from: https://www.mongodb.com/try/download/community
    echo 📖 See INSTALLATION-GUIDE.md for detailed instructions.
    echo.
    pause
    exit /b 1
) else (
    echo ✅ MongoDB is installed
)

echo.

echo 🎯 What would you like to do?
echo.
echo 1. Download project using Git (if you have the repository URL)
echo 2. Check if project files are already here
echo 3. Setup and run the application
echo 4. Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto :git_download
if "%choice%"=="2" goto :check_files
if "%choice%"=="3" goto :setup_run
if "%choice%"=="4" goto :exit

echo Invalid choice. Please run again.
pause
exit /b 1

:git_download
echo.
echo 📥 Git Download
echo ===============
echo.
echo You need the repository URL to download the project.
echo Example: https://github.com/username/dreamhouse.git
echo.
echo If you don't have a repository URL, choose option 2 for manual download.
echo.
set /p repo_url="Enter the repository URL (or press Enter to go back): "

if "%repo_url%"=="" (
    echo Returning to menu...
    goto :menu
)

echo Cloning repository from: %repo_url%
git clone %repo_url%
if %errorlevel% neq 0 (
    echo ❌ Failed to clone repository
    echo.
    echo Possible reasons:
    echo - Invalid repository URL
    echo - No internet connection
    echo - Repository is private (need authentication)
    echo.
    echo 📖 Try manual download: Go to the repository URL in your browser
    echo    Click "Code" → "Download ZIP" → Extract to this folder
    echo    Rename extracted folder to "dreamhouse"
    pause
    goto :menu
)

echo ✅ Repository cloned successfully

# Check if it created a folder with a different name
for /d %%i in (*) do (
    if not "%%i"=="dreamhouse" (
        if exist "%%i\backend\package.json" (
            echo Renaming %%i to dreamhouse...
            ren "%%i" dreamhouse
        )
    )
)

cd dreamhouse
goto :setup_run

:check_files
echo.
echo 📁 Checking Project Files
echo ========================
echo.

if exist "backend\package.json" (
    echo ✅ Backend files found
) else (
    echo ❌ Backend files not found
    echo 📖 You need to download the project first.
    echo 📖 See INSTALLATION-GUIDE.md for download instructions.
    pause
    exit /b 1
)

if exist "frontend\package.json" (
    echo ✅ Frontend files found
) else (
    echo ❌ Frontend files not found
    echo 📖 You need to download the project first.
    echo 📖 See INSTALLATION-GUIDE.md for download instructions.
    pause
    exit /b 1
)

echo.
echo ✅ All project files are present!
goto :setup_run

:setup_run
echo.
echo 🚀 Setting up and running the application
echo ==========================================
echo.

if not exist "backend\.env" (
    echo 🔧 Creating environment file...
    copy backend\.env backend\.env.local >nul 2>nul || (
        echo # MongoDB > backend\.env
        echo MONGO_URI=mongodb://localhost:27017/dreambuild >> backend\.env
        echo JWT_SECRET=your_super_secret_jwt_key_here >> backend\.env
        echo. >> backend\.env
        echo # OAuth (optional) >> backend\.env
        echo GOOGLE_CLIENT_ID=your_google_client_id >> backend\.env
        echo FACEBOOK_APP_ID=your_facebook_app_id >> backend\.env
    )
    echo ✅ Environment file created
)

echo 📦 Installing backend dependencies...
cd backend
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    echo 💡 Try: npm install --legacy-peer-deps --force
    cd ..
    pause
    exit /b 1
)

echo 📦 Installing frontend dependencies...
cd ../frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)

cd ..
echo ✅ Dependencies installed!

echo 🚀 Starting the application...
echo.

echo Starting backend server...
start cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting frontend server...
start cmd /k "cd frontend && npm run dev"

echo.
echo 🎉 Application started!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🌐 Backend API: http://localhost:5000
echo.
echo 📝 Next steps:
echo    1. Wait for both servers to finish starting
echo    2. Open http://localhost:3000 in your browser
echo    3. Register a new account
echo.
echo 🛠️  The servers are running in separate windows
echo 🛠️  Close those windows to stop the application
echo.
pause
goto :exit

:menu
echo.
goto :start

:exit
echo.
echo 👋 Goodbye!
echo.
pause