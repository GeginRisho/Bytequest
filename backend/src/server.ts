import http from 'http';
import app from './app';
import { SocketService } from './services/socketService';
import prisma from './config/db';
import redis from './config/redis';
import env from './config/env';
import logger from './config/logger';
import client from 'prom-client';

const server = http.createServer(app);

// Gracefully handle server startup errors (e.g. port already in use)
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${env.PORT} is already in use. Please stop the existing process or modify the PORT variable in backend/.env`);
    process.exit(1);
  } else {
    logger.error(`❌ Server socket error: ${err.message}`);
  }
});

// Initialize Socket.io service pool
const socketService = new SocketService(server);

// Enable Prometheus default system metric scrapers
client.collectDefaultMetrics({ register: client.register });

const startServer = async () => {
  try {
    // 1. Verify DB connections
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected successfully.');
    logger.info('✅ Prisma initialized successfully.');
  } catch (err: any) {
    logger.warn(`⚠️ PostgreSQL connection failed on startup: ${err.message}. The server will start, but database operations may fail until database is running.`);
  }

  // 2. Start server listing
  server.listen(env.PORT, () => {
    logger.info(`✨ ByteQuest server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
};

startServer();
