#!/bin/bash

# Custom build script for deployment
echo "Starting custom build process..."

# Clean any previous builds
rm -rf dist server/public

# Ensure we're using the deployment build script
node deployment-build.mjs

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "Build artifacts ready for deployment:"
    echo "- Client assets: dist/public/ (copied to server/public/)"
    echo "- Server entry: dist/server.js"
    echo "- Static assets location: server/public/"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Ready for deployment!"