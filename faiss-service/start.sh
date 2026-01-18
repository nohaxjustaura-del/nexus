#!/bin/bash
echo "Starting FAISS VC Ranking Service..."
cd "$(dirname "$0")"
python faiss_api.py
