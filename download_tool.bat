@echo off
set VERSION=v1.16.1
set FILENAME=mediamtx_%VERSION%_windows_amd64.zip
set URL=https://github.com%

:: 1. Check if MediaMTX exists
if not exist "mediamtx.exe" (
    echo MediaMTX not found. Downloading %VERSION%...
    curl -L -O %URL%
    
    echo Extracting files...
    tar -xf %FILENAME%
    del %FILENAME%
)

:: 2. Create config if it doesn't exist
if not exist "mediamtx.yml" (
    echo Creating default webcam configuration...
    (
    echo paths:
    echo   cam:
    echo     # Replace "Integrated Camera" with your actual device name
    echo     runOnInit: ffmpeg -f dshow -i video="Integrated Camera" -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://localhost:8554/cam
    echo     runOnInitRestart: yes
    ) > mediamtx.yml
)

:: 3. Run the server
echo Starting RTSP Server...
mediamtx.exe
pause