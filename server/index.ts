import express from "express";
import type { Request, Response, NextFunction, Express } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { pool } from "./db";
import fs from "fs";

const app = express();

// Trust proxy for correct IP addresses behind reverse proxies
app.set('trust proxy', 1);

// Enhanced security headers with proper CSP for production
if (process.env.NODE_ENV === 'production' || app.get('env') === 'production') {
  app.use((req, res, next) => {
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy with Google Fonts support
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
      "frame-ancestors 'none'"
    ];
    
    // Only add upgrade-insecure-requests on HTTPS
    if (req.secure || req.header('x-forwarded-proto') === 'https') {
      cspDirectives.push('upgrade-insecure-requests');
    }
    
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    next();
  });
}

// CORS configuration for Frame.io V4 direct uploads
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://next.frame.io', 'https://*.frame.io'] 
    : ['http://localhost:5000', 'https://next.frame.io', 'https://*.frame.io'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// Session configuration removed - using JWT authentication via Supabase

app.use((req: Request, res: Response, next: any) => {
  const start = Date.now();
  const path = (req as any).path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Debug logging for dashboard requests with query parameters
  if (path === '/dashboard' && (req as any).query && Object.keys((req as any).query).length > 0) {
    console.log(`🔍 Dashboard request with query params: ${(req as any).url}`);
    console.log('Query params:', (req as any).query);
    console.log('Headers:', (req as any).headers);
  }

  const originalResJson = (res as any).json;
  (res as any).json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  (res as any).on("finish", () => {
    const duration = Date.now() - start;
    
    // Log all dashboard requests
    if (path === '/dashboard') {
      console.log(`🏠 Dashboard ${(req as any).method} ${(req as any).url} ${(res as any).statusCode} in ${duration}ms`);
      if ((res as any).statusCode >= 400) {
        console.log('❌ Dashboard error response:', capturedJsonResponse);
      }
    }
    
    if (path.startsWith("/api")) {
      let logLine = `${(req as any).method} ${path} ${(res as any).statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await (registerRoutes as any)(app);

    // Serve Object Storage assets
    app.use('/EditingPortfolioAssets', express.static(path.resolve(process.cwd(), 'EditingPortfolioAssets')));

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      // Production static file serving with proper MIME types
      const distPath = path.resolve(process.cwd(), 'server/public');
      
      // Check if production build exists
      if (fs.existsSync(distPath)) {
        // Serve /assets with proper MIME types and long cache
        app.use('/assets', express.static(path.join(distPath, 'assets'), {
          maxAge: '31536000000', // 1 year
          immutable: true,
          setHeaders: (res: any, filePath: string) => {
            // Set proper MIME types
            if (filePath.endsWith('.css')) {
              res.setHeader('Content-Type', 'text/css; charset=UTF-8');
            } else if (filePath.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
            } else if (filePath.endsWith('.mjs')) {
              res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
            }
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        } as any));
      }
      
      // Use the standard serveStatic function for other files
      serveStatic(app);
    }

    // Error handler should be AFTER static file serving
    app.use((err: Error, req: Request, res: Response, _next: any) => {
      // Don't send JSON for static file errors
      if ((req as any).path && ((req as any).path.startsWith('/assets') || (req as any).path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/))) {
        const status = (err as any).status || (err as any).statusCode || 500;
        return (res as any).status(status).send('Error loading resource');
      }
      
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = err.message || "Internal Server Error";

      (res as any).status(status).json({ message });
      throw err;
    });

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      
      // Initialize asset detection service after server starts
      import('./assetDetectionService.js').then(({ assetDetectionService }) => {
        assetDetectionService.start();
      }).catch(error => {
        console.error('❌ Failed to start asset detection service:', error);
      });

      // Initialize Trello integration on startup
      import('./services/trello-automation.js').then(({ trelloAutomation }) => {
        console.log('🔧 Initializing Trello board configuration...');
        
        // Set up board configuration with your specific IDs
        const BOARD_ID = 'kg3EFU40';
        const TODO_LIST_ID = '684bff2e9e09bcad40e947dc'; // "New"
        const DONE_LIST_ID = '684bff459668ae4a9c3eb454'; // "Done"
        const REVISION_LIST_ID = '6853c0882efa9520206f6538'; // "Revision Requested"
        
        trelloAutomation.setupTrelloConfig(BOARD_ID, TODO_LIST_ID, DONE_LIST_ID, REVISION_LIST_ID)
          .then(() => {
            console.log('✅ Trello board configuration initialized successfully');
            console.log(`   Board: kg3EFU40`);
            console.log(`   Todo List: "New" (${TODO_LIST_ID})`);
            console.log(`   Done List: "Done" (${DONE_LIST_ID})`);
            console.log(`   Revision List: "Revision Requested" (${REVISION_LIST_ID})`);
          })
          .catch(error => {
            console.error('❌ Failed to initialize Trello configuration:', error.message);
          });
      }).catch(error => {
        console.error('❌ Failed to load Trello automation service:', error);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
