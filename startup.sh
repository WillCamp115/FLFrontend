#!/bin/sh
# Azure App Service startup script for Next.js

echo "Starting Next.js application..."
echo "Current directory: $(pwd)"
echo "Contents of current directory:"
ls -la

# Set PORT if not already set
if [ -z "$PORT" ]; then
  export PORT=8080
fi

echo "PORT is set to: $PORT"

# Check if node_modules exists
if [ -d "node_modules" ]; then
  echo "node_modules found in $(pwd)/node_modules"
else
  echo "WARNING: node_modules not found!"
fi

# Check if .next exists
if [ -d ".next" ]; then
  echo ".next build folder found"
else
  echo "WARNING: .next folder not found!"
fi

# Start the Next.js application using the local node_modules
echo "Starting Next.js with: node_modules/.bin/next start -p $PORT"
node node_modules/.bin/next start -p $PORT
