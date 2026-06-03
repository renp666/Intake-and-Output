import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { error } from './lib/response';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import bedRoutes from './routes/beds';
import recordRoutes from './routes/records';
import statisticRoutes from './routes/statistics';
import alertRoutes from './routes/alerts';
import configRoutes from './routes/config';
import departmentRoutes from './routes/departments';
import userRoutes from './routes/users';
import presetItemRoutes from './routes/preset-items';
import exportRoutes from './routes/export';
import logRoutes from './routes/logs';
import voiceRoutes from './routes/voice';

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Mount routes under /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/beds', bedRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/statistics', statisticRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/config', configRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/preset-items', presetItemRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/voice', voiceRoutes);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json(error('Route not found', 404));
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json(error('Database error occurred', 400));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json(error('Authentication error', 401));
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return res.status(statusCode).json(error(message, statusCode));
});

// Export asyncHandler utility for route handlers
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Start server
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
