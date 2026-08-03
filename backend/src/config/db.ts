import { PrismaClient } from '@prisma/client';
import logger from './logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

// Log Prisma queries in development
if (process.env.NODE_ENV !== 'production') {
  (prisma as any).$on('query', (e: any) => {
    logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
  });
}

// Global Soft Delete Prisma Middleware
prisma.$use(async (params, next) => {
  const modelsWithSoftDelete = ['User', 'StudentProfile', 'TeacherProfile', 'ParentProfile', 'Question', 'GameSession'];

  if (params.model && modelsWithSoftDelete.includes(params.model)) {
    // 1. Delete / DeleteMany Actions -> Convert to Update / UpdateMany
    if (params.action === 'delete') {
      params.action = 'update';
      params.args['data'] = { deletedAt: new Date() };
    }
    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      if (params.args.data) {
        params.args.data['deletedAt'] = new Date();
      } else {
        params.args['data'] = { deletedAt: new Date() };
      }
    }

    // 2. Read / Count Actions -> Exclude Soft Deleted records by default
    if (['findUnique', 'findFirst', 'findMany', 'count'].includes(params.action)) {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};
      
      // Allow overriding deleted filter if specifically requested
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }
  }

  return next(params);
});

export default prisma;
