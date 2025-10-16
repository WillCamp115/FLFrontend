#!/bin/sh
# Azure App Service startup script for Next.js

echo "Starting Next.js application..."

# Set PORT if not already set
if [ -z "$PORT" ]; then
  export PORT=8080
fi

echo "PORT is set to: $PORT"

# Start the Next.js application
npm run start
