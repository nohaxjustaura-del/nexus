#!/bin/bash

echo "========================================"
echo "  FAISS VC Ranking Service"
echo "========================================"
echo ""
echo "Starting FAISS service on port 8001..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python from https://python.org"
    exit 1
fi

# Check if in correct directory
if [ ! -f "faiss-service/faiss_api.py" ]; then
    echo "ERROR: Run this script from the project root directory"
    exit 1
fi

# Navigate to faiss-service
cd faiss-service

# Check if requirements are installed
python3 -c "import faiss" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing Python dependencies..."
    pip3 install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
fi

echo ""
echo "Starting FAISS API server..."
echo "Visit: http://localhost:8001/health"
echo "Press Ctrl+C to stop"
echo ""

python3 faiss_api.py
