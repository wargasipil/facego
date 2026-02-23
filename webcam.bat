@REM ffmpeg -list_devices true -f dshow -i dummy

@REM USB2.0 HD UVC WebCam

@REM ffmpeg -f dshow -i video="USB2.0 HD UVC WebCam" ^
@REM   -vcodec libx264 ^
@REM   -preset veryfast ^
@REM   -tune zerolatency ^
@REM   -f rtsp rtsp://localhost:8554/webcam


ffmpeg -f dshow -i video="USB2.0 HD UVC WebCam" ^
  -c:v libx264 ^
  -preset ultrafast ^
  -tune zerolatency ^
  -f hls ^
  -hls_time 2 ^
  -hls_list_size 5 ^
  -hls_flags delete_segments ^
  ./frontend/public/mock/stream.m3u8

@REM ffmpeg -f dshow ^
@REM   -framerate 30 ^
@REM   -i video="USB2.0 HD UVC WebCam" ^
@REM   -fflags nobuffer ^
@REM   -flags low_delay ^
@REM   -c:v libx264 ^
@REM   -preset ultrafast ^
@REM   -tune zerolatency ^
@REM   -g 15 ^
@REM   -keyint_min 15 ^
@REM   -sc_threshold 0 ^
@REM   -pix_fmt yuv420p ^
@REM   -f hls ^
@REM   -hls_time 1 ^
@REM   -hls_list_size 3 ^
@REM   -hls_flags delete_segments ^
@REM   ./frontend/public/mock/stream.m3u8
