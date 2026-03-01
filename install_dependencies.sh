#!/bin/bash

echo "Starting dependency installation..."

# Navigate to the backend directory
if [ -d "AdminModule/backend" ]; then
    echo "Found backend directory at AdminModule/backend"
    cd AdminModule/backend
    
    if [ -f "package.json" ]; then
        echo "Installing Node.js dependencies..."
        npm install
        echo "Dependencies installed successfully."
    else
        echo "Error: package.json not found in AdminModule/backend"
    fi
else
    echo "Error: AdminModule/backend directory not found"
fi

echo "Installation process completed."
