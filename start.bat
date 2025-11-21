@echo off
REM Markdown + Mermaid Renderer - Quick Start Script (Windows)

echo.
echo Starting Markdown + Mermaid Renderer...
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed.
    echo Please install Docker Desktop from https://docker.com
    pause
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not running.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Docker is installed and running
echo.

REM Stop and remove existing container if it exists
docker stop markdown-renderer >nul 2>&1
docker rm markdown-renderer >nul 2>&1

REM Build the image
echo Building Docker image...
docker build -t markdown-mermaid-renderer:latest . --quiet

REM Run the container
echo Starting container...
docker run -d -p 8080:80 --name markdown-renderer --restart unless-stopped markdown-mermaid-renderer:latest

echo.
echo Container started successfully!
echo.
echo Markdown + Mermaid Renderer is now running at:
echo    http://localhost:8080
echo.
echo Commands:
echo   Stop:  docker stop markdown-renderer
echo   Start: docker start markdown-renderer
echo   Logs:  docker logs -f markdown-renderer
echo.

REM Wait a moment for container to be ready
timeout /t 2 /nobreak >nul

REM Open browser
echo Opening in browser...
start http://localhost:8080

pause
