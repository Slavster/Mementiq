#!/bin/bash

# Custom build script for deployment
echo "Starting custom build process..."

# Ensure we're using the deployment build script
node deployment-build.mjs

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "Build artifacts ready for deployment:"
    echo "- Client assets: dist/public/"
    echo "- Server entry: dist/server.js"
else
    echo "❌ Build failed"
    exit 1
fi

echo "Ready for deployment!"