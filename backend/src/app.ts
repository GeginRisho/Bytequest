import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/api';
import errorHandler from './middleware/errorMiddleware';
import logger from './config/logger';

import teacherRouter from './routes/teacher';
import studentRouter from './routes/student';
import adminRouter from './routes/admin';
import { authenticate, requireRole } from './middleware/authMiddleware';

const app = express();

const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:8082',
  'https://bytequest-livid.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Security headers config
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for swagger and local development assets
  })
);

// Body Parser config
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Dynamic request tracing logger via Correlation ID
app.use((req, res, next) => {
  const correlationId = Math.random().toString(36).substring(7);
  req.headers['x-correlation-id'] = correlationId;
  logger.info(`[${req.method}] ${req.url} - Correlation ID: ${correlationId}`);
  next();
});

// Live admin dashboard socket notification middleware for mutations
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const socketService = req.app.get('socketService');
        if (socketService) {
          logger.info(`✨ Mutation request [${req.method}] ${req.originalUrl} completed with status ${res.statusCode}. Broadcasting live admin update.`);
          socketService.broadcastAdminUpdate();
        }
      }
    });
  }
  next();
});

// Throttling: limit requests to API routes (100 per minute)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1', apiLimiter, apiRouter);
app.use('/api/v1/admin', apiLimiter, authenticate, requireRole(['ADMIN']), adminRouter);
app.use('/api/v1/teacher', teacherRouter);
app.use('/api/v1/student', studentRouter);


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ByteQuest Backend',
    environment: process.env.NODE_ENV
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ByteQuest Backend Running',
    version: '1.0',
    environment: process.env.NODE_ENV
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  const client = require('prom-client');
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Centralized error handler
app.use(errorHandler);

export default app;
