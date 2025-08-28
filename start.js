#!/usr/bin/env node

/**
 * Production start script
 * This script starts the production server
 */

import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

async function startProductionServer() {
  console.log('Starting production server...');

  // Check if we have a built server entry point
  const distPath = path.join(process.cwd(), 'dist');
  const serverPath = path.join(distPath, 'server.js');

  if (fs.existsSync(serverPath)) {
    console.log('✅ Build artifacts found. Starting server from dist...');
    // Check if server/public exists (required by server/vite.ts)
    const serverPublicPath = path.join(process.cwd(), 'server', 'public');
    if (!fs.existsSync(serverPublicPath)) {
      console.log('⚠️  server/public not found, starting server directly with tsx...');
      // Fall back to running the server directly using tsx
    } else {
      console.log('✅ Static assets found at server/public');
      // Import and run the built server
      await import(serverPath);
      return;
    }
  } else {
    console.log('⚠️  No build artifacts found. Starting server directly...');
  }
  
  // Fall back to running the server directly using tsx
    
    const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    serverProcess.on('error', (err) => {
      console.error('❌ Failed to start production server:', err);
      process.exit(1);
    });

    serverProcess.on('exit', (code) => {
      console.log('Server process exited with code:', code);
      process.exit(code);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully');
      serverProcess.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully');
      serverProcess.kill('SIGINT');
    });
}

// Call the async function
startProductionServer().catch((error) => {
  console.error('❌ Failed to start production server:', error);
  process.exit(1);
});