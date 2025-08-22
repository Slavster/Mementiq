import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const app = express();

// CORS configuration for Frame.io direct uploads
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://app.frame.io', 'https://*.frame.io'] 
    : ['http://localhost:5000', 'https://app.frame.io', 'https://*.frame.io'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

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
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Debug logging for dashboard requests with query parameters
  if (path === '/dashboard' && req.query && Object.keys(req.query).length > 0) {
    console.log(`🔍 Dashboard request with query params: ${req.url}`);
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    
    // Log all dashboard requests
    if (path === '/dashboard') {
      console.log(`🏠 Dashboard ${req.method} ${req.url} ${res.statusCode} in ${duration}ms`);
      if (res.statusCode >= 400) {
        console.log('❌ Dashboard error response:', capturedJsonResponse);
      }
    }
    
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
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
    const server = await registerRoutes(app);

    // Serve Object Storage assets
    app.use('/EditingPortfolioAssets', express.static(path.resolve(process.cwd(), 'EditingPortfolioAssets')));

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

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

      // Test Trello integration on startup
      import('./services/trello.js').then(({ trelloService }) => {
        console.log('🧪 Testing Trello integration on startup...');
        trelloService.getBoards().then((boards) => {
          console.log(`✅ Trello integration working! Found ${boards.length} boards`);
          if (boards.length > 0) {
            console.log('Available boards:', boards.map(b => b.name).join(', '));
          }
        }).catch(error => {
          console.error('❌ Trello integration test failed:', error.message);
        });
      }).catch(error => {
        console.error('❌ Failed to load Trello service:', error);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
