@echo off
setlocal

set ROOT=%~dp0
set FRONTEND_DIR=%ROOT%attendance_frontend
set FRONTEND_DIST=%FRONTEND_DIR%\dist
set EMBED_DIR=%ROOT%backend\cmd\server\frontend
set CONFIGS_SRC=%ROOT%backend\configs
set OUTPUT_DIR=%ROOT%dist\windows
set BINARY_NAME=facego.exe
set ZIP_NAME=facego-windows.zip

echo [1/4] Building frontend...
cd /d "%FRONTEND_DIR%"
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed.
    exit /b 1
)

echo [2/4] Copying frontend dist to embed directory...
if exist "%EMBED_DIR%" (
    rmdir /s /q "%EMBED_DIR%"
)
xcopy /e /i /q "%FRONTEND_DIST%" "%EMBED_DIR%"
if errorlevel 1 (
    echo ERROR: Failed to copy frontend dist.
    exit /b 1
)

echo [3/4] Building Go backend...
cd /d "%ROOT%backend"
go build -o "%BINARY_NAME%" ./cmd/server
if errorlevel 1 (
    echo ERROR: Go build failed.
    exit /b 1
)

echo [4/4] Packaging to dist/windows...
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
move /y "%ROOT%backend\%BINARY_NAME%" "%OUTPUT_DIR%\%BINARY_NAME%"

if not exist "%OUTPUT_DIR%\configs" mkdir "%OUTPUT_DIR%\configs"
copy /y "%CONFIGS_SRC%\sample.yaml" "%OUTPUT_DIR%\configs\sample.yaml"
if errorlevel 1 (
    echo ERROR: Failed to copy sample.yaml.
    exit /b 1
)

powershell -NoProfile -Command "Compress-Archive -Force -Path '%OUTPUT_DIR%\%BINARY_NAME%', '%OUTPUT_DIR%\configs' -DestinationPath '%OUTPUT_DIR%\%ZIP_NAME%'"
if errorlevel 1 (
    echo ERROR: Zip failed.
    exit /b 1
)

echo.
echo Build complete: dist\windows\%ZIP_NAME%
endlocal
