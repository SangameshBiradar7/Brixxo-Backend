@echo off
echo 🔧 BuildConnect - Fix Dependencies
echo ===================================
echo.

echo This script will fix npm dependency conflicts.
echo.

cd backend

echo 📦 Clearing npm cache...
call npm cache clean --force

echo 📦 Installing with legacy peer deps...
call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    echo ❌ Still having issues. Trying force install...
    call npm install --legacy-peer-deps --force
)

if %errorlevel% neq 0 (
    echo ❌ Dependency installation failed.
    echo 💡 Try deleting node_modules and package-lock.json, then run this script again.
    echo.
    echo To delete: rmdir /s node_modules && del package-lock.json
) else (
    echo ✅ Dependencies installed successfully!
)

echo.
pause