@echo off
setlocal

set BACKEND_IMAGE=kampretcode/attendance_backend_go
set FRONTEND_IMAGE=kampretcode/attendance_frontend
set TAG=%~1
if "%TAG%"=="" set TAG=latest

echo =^> Building backend  (%BACKEND_IMAGE%:%TAG%)
docker build -t %BACKEND_IMAGE%:%TAG% ./backend
if %errorlevel% neq 0 ( echo BUILD FAILED: backend & exit /b 1 )

echo =^> Building frontend (%FRONTEND_IMAGE%:%TAG%)
docker build -t %FRONTEND_IMAGE%:%TAG% ./attendance_frontend
if %errorlevel% neq 0 ( echo BUILD FAILED: frontend & exit /b 1 )

echo =^> Pushing %BACKEND_IMAGE%:%TAG%
docker push %BACKEND_IMAGE%:%TAG%
if %errorlevel% neq 0 ( echo PUSH FAILED: backend & exit /b 1 )

echo =^> Pushing %FRONTEND_IMAGE%:%TAG%
docker push %FRONTEND_IMAGE%:%TAG%
if %errorlevel% neq 0 ( echo PUSH FAILED: frontend & exit /b 1 )

echo =^> Done
echo     %BACKEND_IMAGE%:%TAG%
echo     %FRONTEND_IMAGE%:%TAG%

endlocal
