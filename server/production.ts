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

// Rate limiting implementation
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // max requests per window

function simpleRateLimit(req: any, res: any, next: any) {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const limit = rateLimitMap.get(ip);
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  limit.count++;
  if (limit.count > RATE_LIMIT_MAX) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }
  
  next();
}

export async function createProductionServer() {
  const app = express();
  const PORT = process.env.PORT || 5000;

  // Trust proxy - required for correct IP addresses and rate limiting
  app.set('trust proxy', 1);

  // Enhanced security headers with CSP
  app.use((req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai",
      "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.supabase.co https://api.frame.io https://*.frame.io wss://*.supabase.co https://api.trello.com https://fonts.googleapis.com https://fonts.gstatic.com",
      "frame-src https://js.stripe.com https://checkout.stripe.com https://*.frame.io",
      "media-src 'self' blob: https://*.frame.io https://*.frameio.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ];
    
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
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

  // Apply rate limiting after trust proxy
  app.use('/api', simpleRateLimit);

  // CORS configuration with strict origins
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        process.env.APP_URL || 'https://mementiq.replit.app',
        'https://next.frame.io',
        'https://api.frame.io'
      ]
    : [
        'http://localhost:5000',
        'http://localhost:3000',
        'https://next.frame.io',
        'https://api.frame.io'
      ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || origin.endsWith('.frame.io')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 hours
  }));

  // Body parsing with reasonable limits
  app.use(express.json({ 
    limit: '10mb', // Reduced from 100mb for security
    verify: (req: any, res, buf) => {
      // Store raw body for webhook signature verification
      req.rawBody = buf.toString('utf8');
    }
  }));
  app.use(express.urlencoded({ 
    extended: false, 
    limit: '10mb',
    parameterLimit: 1000 // Prevent DoS via parameter pollution
  }));

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
  
  // Serve hashed assets with immutable cache (1 year)
  app.use('/assets', express.static(path.join(staticPath, 'assets'), {
    maxAge: '31536000000', // 1 year in milliseconds
    immutable: true,
    etag: false,
    lastModified: false,
    setHeaders: (res: any, filePath: string) => {
      // Ensure proper MIME types
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }))

  // Serve other static files
  app.use(express.static(staticPath, {
    index: false,
    etag: true,
    setHeaders: (res: any, filePath: string) => {
      // No cache for HTML files
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.match(/\.(js|css)$/) && !filePath.includes('/assets/')) {
        // Files with hash in filename get long cache
        if (filePath.match(/\.[a-f0-9]{8,}\./)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // Non-hashed JS/CSS get short cache
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      } else if (filePath.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
        // Images get moderate cache
        res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
      }
    }
  } as any));

  // API route protection - ensure API routes are never served by SPA fallback
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Fallback to index.html for client-side routing (SPA)
  app.get('*', (req, res) => {
    // Never serve index.html for API routes or asset paths
    if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
      return res.status(404).send('Not found');
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  // Error handler - must be last
  app.use((err: any, req: any, res: any, _next: any) => {
    // Don't send JSON for static file errors
    if (req.path.startsWith('/assets') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
      const status = err.status || err.statusCode || 500;
      return res.status(status).send('Error loading resource');
    }
    
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