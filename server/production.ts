// Production server configuration
// This file provides a clean production server without development dependencies

import express from 'express';
import cors from 'cors';
import { registerRoutes } from './routes';
import path from 'path';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { pool } from './db';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createProductionServer() {
  const app = express();
  const PORT = process.env.PORT || 5000;

  // Security headers (helmet-like protection)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Health check endpoint
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production'
    });
  });

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://next.frame.io', 'https://*.frame.io'] 
      : ['http://localhost:5000', 'https://next.frame.io', 'https://*.frame.io'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Body parsing
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: false, limit: '100mb' }));

  // Session configuration
  const PgSession = ConnectPgSimple(session);
  app.use(session({
    store: new PgSession({
      pool: pool,
      tableName: 'user_sessions',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax'
    }
  }));

  // Simple request logging
  app.use((req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end;
    
    res.end = function(...args: any[]) {
      const duration = Date.now() - start;
      
      // Log API requests
      if (req.path.startsWith('/api')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
      }
      
      return originalEnd.apply(res, args);
    } as any;
    
    next();
  });

  // Register application routes
  const server = await registerRoutes(app);
  
  // Serve Object Storage assets
  app.use('/EditingPortfolioAssets', 
    express.static(path.resolve(process.cwd(), 'EditingPortfolioAssets'), {
      maxAge: '7d',
      etag: true
    })
  );

  // Serve static files with proper cache headers
  const staticPath = path.resolve(process.cwd(), 'server/public');
  
  // Serve static assets with long cache
  app.use('/assets', express.static(path.join(staticPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
    etag: false
  }));

  // Serve other static files
  app.use(express.static(staticPath, {
    index: false,
    setHeaders: (res: any, filePath: string) => {
      // No cache for HTML files
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.match(/\.(js|css)$/)) {
        // Moderate cache for JS/CSS without hash
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
  } as any));

  // Fallback to index.html for client-side routing
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  // Error handler
  app.use((err: any, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    console.error(`[ERROR] ${status}: ${message}`);
    console.error(err.stack);
    
    res.status(status).json({ 
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  return { app, server, PORT };
}

// Start the production server
if (import.meta.url === `file://${process.argv[1]}`) {
  createProductionServer().then(({ server, PORT }) => {
    const httpServer = server.listen(PORT, '0.0.0.0', () => {
      console.log('========================================');
      console.log('🚀 Production Server Started');
      console.log('========================================');
      console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`Port: ${PORT}`);
      console.log(`URL: http://0.0.0.0:${PORT}`);
      console.log(`Health Check: http://0.0.0.0:${PORT}/healthz`);
      console.log('========================================');
    });

    // Graceful shutdown handlers
    const gracefulShutdown = (signal: string) => {
      console.log(`\n[${signal}] Starting graceful shutdown...`);
      
      httpServer.close(() => {
        console.log('HTTP server closed');
        
        pool.end().then(() => {
          console.log('Database connections closed');
          process.exit(0);
        }).catch((err) => {
          console.error('Error closing database connections:', err);
          process.exit(1);
        });
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }).catch((error) => {
    console.error('Failed to start production server:', error);
    process.exit(1);
  });
}