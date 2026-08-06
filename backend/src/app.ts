import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/api';
import errorHandler from './middleware/errorMiddleware';
import logger from './config/logger';

import teacherRouter from './routes/teacher';
import studentRouter from './routes/student';

const app = express();

// Enable CORS with wildcard for development ease
app.use(cors({ origin: '*' }));

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

// Throttling: limit requests to API routes (100 per minute)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1', apiLimiter, apiRouter);
app.use('/api/v1/teacher', teacherRouter);
app.use('/api/v1/student', studentRouter);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  const client = require('prom-client');
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Centralized error handler
app.use(errorHandler);

export default app;
