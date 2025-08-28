#!/bin/bash

# Production server startup script
# This script starts the server in production mode with proper environment variables

echo "========================================"
echo "Starting Production Server"
echo "========================================"

# Set production environment
export NODE_ENV=production

# Use PORT from environment or default to 5000
PORT=${PORT:-5000}
export PORT=$PORT

echo "Environment: $NODE_ENV"
echo "Port: $PORT"

# Start the server
echo "Starting server..."
node dist/server.js