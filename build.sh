#!/bin/bash

# Production build script that uses custom TypeScript configuration

echo "Starting production build with custom TypeScript configuration..."

# Step 1: Type check with production config (excluding vite.ts)
echo "Running TypeScript compilation with production config..."
npx tsc --project tsconfig.production.json --noEmit

# Step 2: Build the application with Vite
echo "Building production assets with Vite..."
npx vite build

echo "Build completed successfully!"