@echo off
REM Build script for Pixiv Downloader (Windows)

echo ============================================
echo Pixiv Downloader - Windows Build Script
echo ============================================
echo.

REM Check if vcpkg is installed
if not defined VCPKG_ROOT (
    echo Error: VCPKG_ROOT environment variable not set
    echo Please install vcpkg and set VCPKG_ROOT to its installation directory
    echo Example: set VCPKG_ROOT=C:\path\to\vcpkg
    exit /b 1
)

echo VCPKG_ROOT: %VCPKG_ROOT%
echo.

REM Create build directory
if not exist build (
    mkdir build
    echo Created build directory
)

cd build

echo Configuring CMake...
cmake .. -DCMAKE_TOOLCHAIN_FILE=%VCPKG_ROOT%/scripts/buildsystems/vcpkg.cmake -DCMAKE_BUILD_TYPE=Release
if errorlevel 1 (
    echo CMake configuration failed
    cd ..
    exit /b 1
)

echo.
echo Building project...
cmake --build . --config Release
if errorlevel 1 (
    echo Build failed
    cd ..
    exit /b 1
)

echo.
echo ============================================
echo Build completed successfully!
echo Executable: build\bin\Release\pixiv_downloader.exe
echo ============================================

cd ..
