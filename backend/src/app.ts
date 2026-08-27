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


import { prisma } from './services/db';

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // 1. Check if tables exist in information_schema
    const checkTable = async (tableName: string) => {
      const result: any[] = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}');`
      );
      return result[0]?.exists || false;
    };

    const hasQuestionTable = await checkTable('Question');
    const hasUserTable = await checkTable('User');
    const hasStudentTable = await checkTable('StudentProfile');
    const hasTeacherTable = await checkTable('TeacherProfile');
    const hasClassTable = await checkTable('Class');
    const hasSessionTable = await checkTable('GameSession');
    const hasAttemptTable = await checkTable('QuestionAttempt');

    // 2. Query counts
    const questionsCount = hasQuestionTable ? await prisma.question.count() : 0;
    const usersCount = hasUserTable ? await prisma.user.count() : 0;
    const studentsCount = hasStudentTable ? await prisma.studentProfile.count() : 0;
    const teachersCount = hasTeacherTable ? await prisma.teacherProfile.count() : 0;
    const classesCount = hasClassTable ? await prisma.class.count() : 0;
    const sessionsCount = hasSessionTable ? await prisma.gameSession.count() : 0;

    let attemptsCount = 0;
    let attemptsError = null;
    if (hasAttemptTable) {
      try {
        attemptsCount = await prisma.questionAttempt.count();
      } catch (err: any) {
        attemptsError = err.message;
      }
    }

    // 3. Resolve database server and connection name safely
    let dbName = 'unknown';
    try {
      const dbInfo: any[] = await prisma.$queryRawUnsafe("SELECT current_database();");
      dbName = dbInfo[0]?.current_database || 'unknown';
    } catch (e) {}

    res.json({
      status: 'ok',
      service: 'ByteQuest Backend',
      environment: process.env.NODE_ENV,
      databaseDiagnostics: {
        dbName,
        tablesCheck: {
          Question: hasQuestionTable,
          User: hasUserTable,
          StudentProfile: hasStudentTable,
          TeacherProfile: hasTeacherTable,
          Class: hasClassTable,
          GameSession: hasSessionTable,
          QuestionAttempt: hasAttemptTable
        },
        counts: {
          questions: questionsCount,
          users: usersCount,
          students: studentsCount,
          teachers: teachersCount,
          classes: classesCount,
          sessions: sessionsCount,
          questionAttempts: attemptsCount
        },
        attemptsError
      }
    });
  } catch (err: any) {
    res.json({
      status: 'error',
      message: err.message
    });
  }
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
