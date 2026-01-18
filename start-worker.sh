#!/bin/bash

# ========================================
#   FounderMatch Background Worker
# ========================================

echo ""
echo "========================================"
echo "  FounderMatch Background Worker"
echo "========================================"
echo ""
echo "Starting automated data update system..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
fi

echo ""
echo "Starting worker in background..."
echo "Press Ctrl+C to stop the worker"
echo ""

# Start the worker
node worker.js
