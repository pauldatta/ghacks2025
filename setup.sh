#!/bin/bash

echo "Starting project setup..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
if command_exists node; then
    echo "Node.js is installed: $(node --version)"
else
    echo "Node.js is not installed. Please install Node.js and npm."
    echo "You can download it from https://nodejs.org/"
    echo "Or, consider using a Node Version Manager (nvm): https://github.com/nvm-sh/nvm"
    exit 1
fi

# Check for npm
if command_exists npm; then
    echo "npm is installed: $(npm --version)"
else
    echo "npm is not installed, but Node.js was found. This is unusual."
    echo "Please ensure npm is correctly installed with Node.js."
    echo "Visit https://nodejs.org/"
    exit 1
fi

# Install project dependencies
echo "Installing project dependencies using npm..."
npm install

if [ $? -eq 0 ]; then
    echo "Dependencies installed successfully."
else
    echo "Error: Failed to install dependencies. Please check npm output."
    exit 1
fi

echo "Project setup completed successfully."
echo "You can now build the project using: node build.js"
echo "And then open dist/gemini_live_app.html in your browser."
