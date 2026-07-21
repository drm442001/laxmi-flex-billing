@echo off
setlocal

echo.
echo [1/3] Building Next.js application...
call npx next build
if errorlevel 1 exit /b %errorlevel%

echo.
echo [2/3] Removing Next.js temporary development and symlink folders...
if exist ".next\dev" rmdir /s /q ".next\dev"
if exist ".next\node_modules" rmdir /s /q ".next\node_modules"

echo.
echo [3/3] Creating Windows Setup and Portable EXE...
call npx electron-builder --win nsis portable
exit /b %errorlevel%