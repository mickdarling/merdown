#!/bin/bash

# Markdown + Mermaid Renderer - Quick Start Script (macOS Double-Click)
# This script will build and run the Docker container

# Change to the script's directory
cd "$(dirname "$0")"

set -e

echo "🚀 Starting Markdown + Mermaid Renderer..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please install Docker from https://docker.com"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Error: Docker is not running."
    echo "Please start Docker Desktop and try again."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ Docker is installed and running"
echo ""

# Stop and remove existing container if it exists
if docker ps -a | grep -q markdown-renderer; then
    echo "🛑 Stopping existing container..."
    docker stop markdown-renderer 2>/dev/null || true
    docker rm markdown-renderer 2>/dev/null || true
fi

# Build the image
echo "🔨 Building Docker image..."
docker build -t markdown-mermaid-renderer:latest . --quiet

# Run the container
echo "🏃 Starting container..."
docker run -d \
    -p 8080:80 \
    --name markdown-renderer \
    --restart unless-stopped \
    markdown-mermaid-renderer:latest

echo ""
echo "✅ Container started successfully!"
echo ""
echo "📝 Markdown + Mermaid Renderer is now running at:"
echo "   👉 http://localhost:8080"
echo ""
echo "Commands:"
echo "  Stop:  docker stop markdown-renderer"
echo "  Start: docker start markdown-renderer"
echo "  Logs:  docker logs -f markdown-renderer"
echo ""

# Wait a moment for container to be ready
sleep 2

# Open browser
echo "🌐 Opening in browser..."
open http://localhost:8080

echo ""
echo "✅ Done! You can close this window."
echo ""
read -p "Press Enter to close..."
