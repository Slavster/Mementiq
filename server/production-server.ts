// Production server entry point with proper static file handling
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { registerRoutes } from './routes.js';
import path from 'path';
import { pool } from './db.js';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limiting implementation
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // max requests per window

function simpleRateLimit(req: any, res: any, next: any) {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const limit = rateLimitMap.get(ip)!;
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

async function startProductionServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '5000', 10);

  // Trust proxy - essential for custom domain behind reverse proxy
  app.set('trust proxy', 1);

  // CRITICAL: Serve static assets FIRST before any other middleware
  // This ensures static files aren't caught by error handlers
  const staticPath = path.resolve(process.cwd(), 'server/public');
  
  if (fs.existsSync(staticPath)) {
    console.log(`📁 Serving static files from: ${staticPath}`);
    
    // Serve /assets with proper MIME types and long cache
    const assetsPath = path.join(staticPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      app.use('/assets', express.static(assetsPath, {
        maxAge: '31536000000', // 1 year
        immutable: true,
        etag: false,
        lastModified: false,
        setHeaders: (res: any, filePath: string) => {
          // Explicitly set MIME types to prevent application/json response
          if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
          } else if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
          } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=UTF-8');
          } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
          } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          } else if (filePath.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2');
          } else if (filePath.endsWith('.woff')) {
            res.setHeader('Content-Type', 'font/woff');
          }
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      } as any));
      console.log('✅ Asset serving configured at /assets');
    }

    // Serve portfolio videos with proper streaming support
    const videosPath = path.join(staticPath, 'videos');
    if (fs.existsSync(videosPath)) {
      app.use('/videos', express.static(videosPath, {
        maxAge: '31536000000', // 1 year cache for videos
        setHeaders: (res: any, filePath: string) => {
          if (filePath.endsWith('.mp4')) {
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Accept-Ranges', 'bytes'); // Enable byte-range requests for video streaming
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        }
      } as any));
      console.log('✅ Portfolio videos configured at /videos');
    } else {
      console.warn('⚠️ Portfolio videos directory not found:', videosPath);
    }

    // Serve other static files (favicon, etc.)
    app.use(express.static(staticPath, {
      index: false,
      setHeaders: (res: any, filePath: string) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    } as any));
    console.log('✅ Static file serving configured');
  } else {
    console.error(`❌ Static files directory not found: ${staticPath}`);
    console.error('   Run the build script first: ./custom-build.sh');
  }

  // Security headers with proper CSP
  app.use((req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy with Google Fonts and external resources
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://tally.so https://*.tally.so https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https://fonts.gstatic.com https://r2cdn.perplexity.ai",
      "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.supabase.co https://api.frame.io https://*.frame.io wss://*.supabase.co https://api.trello.com https://fonts.googleapis.com https://fonts.gstatic.com https://tally.so https://*.tally.so",
      "frame-src https://js.stripe.com https://checkout.stripe.com https://*.frame.io https://tally.so https://*.tally.so",
      "media-src 'self' blob: https://*.frame.io https://*.frameio.com https://media.mementiq.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ];
    
    // Only add upgrade-insecure-requests on HTTPS
    const proto = req.header('x-forwarded-proto');
    if (req.secure || proto === 'https') {
      cspDirectives.push('upgrade-insecure-requests');
    }
    
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    
    // HSTS for production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    next();
  });

  // Health check endpoint (before rate limiting)
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      staticPath: fs.existsSync(staticPath) ? 'configured' : 'missing'
    });
  });

  // Apply rate limiting to API routes
  app.use('/api', simpleRateLimit);

  // CORS configuration
  const allowedOrigins = [
    'https://mementiq.co',
    'https://www.mementiq.co',
    'https://mementiq.replit.app',
    'https://next.frame.io',
    'https://api.frame.io'
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or server-to-server)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || 
          origin.endsWith('.frame.io') || 
          origin.endsWith('.frameio.com')) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400
  }));

  // Body parsing - exclude webhook endpoints that need raw bodies
  app.use((req, res, next) => {
    // Skip JSON parsing for webhook endpoints that need raw body for signature verification
    if (req.path === '/api/webhooks/stripe' || 
        req.path === '/api/webhooks/frameio' || 
        req.path === '/api/trello/webhook') {
      return next();
    }
    express.json({ limit: '10mb' })(req, res, next);
  });
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Session configuration removed - using JWT authentication via Supabase

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end;
    
    res.end = function(...args: any[]) {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
      return originalEnd.apply(res, args);
    } as any;
    
    next();
  });

  // Register API routes
  const server = await registerRoutes(app);
  
  // Serve Object Storage assets
  app.use('/EditingPortfolioAssets', 
    express.static(path.resolve(process.cwd(), 'EditingPortfolioAssets'), {
      maxAge: '7d',
      etag: true
    })
  );

  // Fallback to index.html for client-side routing (SPA)
  // This MUST come after all static file serving
  app.get('*', (req, res, next) => {
    // Never serve index.html for API routes or asset paths
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/assets') || 
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm|mov|avi)$/)) {
      return next();
    }
    
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(indexPath);
    } else {
      next();
    }
  });

  // 404 handler for API routes
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Error handler - MUST be last
  app.use((err: any, req: any, res: any, _next: any) => {
    // For static files, don't send JSON errors
    if (req.path.startsWith('/assets') || 
        req.path.startsWith('/videos') ||
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm|mov|avi)$/)) {
      const status = err.status || err.statusCode || 500;
      console.error(`Static file error: ${req.path} - ${err.message}`);
      return res.status(status).send('Error loading resource');
    }
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    console.error(`[ERROR] ${req.method} ${req.path} - ${status}: ${message}`);
    if (err.stack) {
      console.error(err.stack);
    }
    
    res.status(status).json({ 
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  // Start server
  const httpServer = server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('🚀 Production Server Started');
    console.log('========================================');
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`Port: ${PORT}`);
    console.log(`Static files: ${fs.existsSync(staticPath) ? '✅ Ready' : '❌ Missing'}`);
    console.log(`Health check: http://0.0.0.0:${PORT}/healthz`);
    console.log('========================================');
    
    // Initialize services after server starts
    import('./assetDetectionService.js').then(({ assetDetectionService }) => {
      assetDetectionService.start();
      console.log('✅ Asset detection service started');
    }).catch(error => {
      console.error('❌ Failed to start asset detection service:', error);
    });

    import('./services/trello-automation.js').then(({ trelloAutomation }) => {
      const BOARD_ID = 'kg3EFU40';
      const TODO_LIST_ID = '684bff2e9e09bcad40e947dc';
      const DONE_LIST_ID = '684bff459668ae4a9c3eb454';
      const REVISION_LIST_ID = '6853c0882efa9520206f6538';
      
      trelloAutomation.setupTrelloConfig(BOARD_ID, TODO_LIST_ID, DONE_LIST_ID, REVISION_LIST_ID)
        .then(() => {
          console.log('✅ Trello automation configured');
        })
        .catch(error => {
          console.error('❌ Failed to initialize Trello:', error.message);
        });
    }).catch(error => {
      console.error('❌ Failed to load Trello automation:', error);
    });
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
}

// Start the server
startProductionServer().catch((error) => {
  console.error('Failed to start production server:', error);
  process.exit(1);
});