import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import routes from './routes/index.js';
import { labsRouter } from './labs.js';
import { commandsRouter } from './commands.js';
import { policiesRouter } from './policies.js';
import { schedulesRouter } from './schedules.js';
import { reportsRouter } from './reports/routes.js';
import { optionalAdminAuth } from './middleware/auth.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false // Allows inline scripts for dashboard & icons
}));

// CORS Configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-ProcessShield-Key', 'X-Agent-Token']
}));

// Rate Limiting (Relaxed for multi-tab agent and dashboard polling)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('10.30.151');
  }
});
app.use(limiter);

// Body Parsers & Cookie Parser
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Logging middleware
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/report') && !req.path.startsWith('/api/nodes')) {
    logger.debug(`${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api', routes);
app.use('/api', labsRouter);
app.use('/api', commandsRouter);
app.use('/api', policiesRouter);
app.use('/api', schedulesRouter);
app.use('/api/reports', optionalAdminAuth, reportsRouter);

// Serve Static Frontend if built in production
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist, { index: false }));

// Root route: Redirect to /login if unauthenticated
app.get('/', (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.redirect('/login');
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.redirect('/login');
    }
  });
});

// Fallback for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('ProcessShield API is running. Start the Vite frontend with "npm run dev" inside /frontend.');
    }
  });
});

// Central Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Server Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

export default app;
