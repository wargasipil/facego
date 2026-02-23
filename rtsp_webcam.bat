@REM ffmpeg -f dshow -i video="USB2.0 HD UVC WebCam" ^
@REM   -c:v libx264 -preset ultrafast -tune zerolatency ^
@REM   -f rtsp rtsp://localhost:8554/webcam

ffmpeg -f dshow -i video="USB2.0 HD UVC WebCam" ^
-vf scale=1280:720 ^
-f rawvideo -pix_fmt bgr24 - | ^
python process.py | ^
ffmpeg -f rawvideo -pix_fmt bgr24 -s 1280x720 -r 30 -i - ^
-c:v libx264 -preset ultrafast ^
-tune zerolatency ^
-f rtsp rtsp://localhost:8554/cam