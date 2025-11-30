@echo off
echo ========================================
echo   DreamBuild Marketplace Setup
echo ========================================
echo.

echo Setting up DreamBuild Marketplace...
echo.

cd /d "%~dp0"

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js is installed
echo.

echo Checking MongoDB...
mongod --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: MongoDB not found locally. Make sure MongoDB is running or use MongoDB Atlas.
    echo You can install MongoDB from: https://www.mongodb.com/try/download/community
) else (
    echo ✓ MongoDB is installed
)
echo.

echo Setting up backend...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
) else (
    echo ✓ Backend dependencies already installed
)

echo Creating backend .env file if it doesn't exist...
if not exist .env (
    copy .env.example .env 2>nul
    if errorlevel 1 (
        echo Creating default .env file...
        echo MONGO_URI=mongodb://localhost:27017/dreambuild > .env
        echo JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production >> .env
        echo GOOGLE_CLIENT_ID=your_google_client_id >> .env
        echo GOOGLE_CLIENT_SECRET=your_google_client_secret >> .env
        echo FACEBOOK_APP_ID=your_facebook_app_id >> .env
        echo FACEBOOK_APP_SECRET=your_facebook_app_secret >> .env
        echo CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name >> .env
        echo CLOUDINARY_API_KEY=your_cloudinary_api_key >> .env
        echo CLOUDINARY_API_SECRET=your_cloudinary_api_secret >> .env
        echo STRIPE_SECRET_KEY=your_stripe_secret_key >> .env
        echo STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key >> .env
    )
    echo ✓ Created .env file - Please update with your actual credentials
) else (
    echo ✓ .env file already exists
)
cd ..
echo.

echo Setting up frontend...
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
) else (
    echo ✓ Frontend dependencies already installed
)
cd ..
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure MongoDB is running locally, or update MONGO_URI in backend/.env for MongoDB Atlas
echo 2. Update the .env files with your actual API keys and credentials
echo 3. Start the backend: cd backend && npm run dev
echo 4. Start the frontend: cd frontend && npm run dev
echo 5. Open http://localhost:3000 in your browser
echo.
echo For detailed setup instructions, see INSTALLATION-GUIDE.md
echo.
pause