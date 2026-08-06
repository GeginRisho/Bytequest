import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import http from 'http';

// Define global mock container to avoid Jest hoist initialization issues
(global as any).mockPrisma = {
  $on: jest.fn(),
  $use: jest.fn(),
  mapWorld: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  gameSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  question: {
    findMany: jest.fn(),
  },
  class: {
    findUnique: jest.fn(),
  }
};

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => (global as any).mockPrisma),
    Role: { STUDENT: 'STUDENT', TEACHER: 'TEACHER' },
    Difficulty: { easy: 'easy', medium: 'medium', hard: 'hard' },
  };
});

jest.mock('../src/config/redis', () => {
  const mockRedis = {
    on: jest.fn(),
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(1),
    psubscribe: jest.fn().mockResolvedValue(1),
    punsubscribe: jest.fn().mockResolvedValue(1),
  };
  return {
    __esModule: true,
    redis: mockRedis,
    redisPub: mockRedis,
    redisSub: mockRedis,
    default: mockRedis,
  };
});

import app from '../src/app';
import { SocketService } from '../src/services/socketService';

describe('ByteQuest Socket.io Tests', () => {
  let server: http.Server;
  let socketService: SocketService;
  let clientSocket1: ClientSocket;

  beforeAll((done) => {
    server = http.createServer(app);
    socketService = new SocketService(server);
    server.listen(5005, () => {
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket1) clientSocket1.close();
    server.close(() => {
      done();
    });
  });

  it('should connect to WebSocket server and create a student practice room', (done) => {
    clientSocket1 = ClientIO('http://localhost:5005', { forceNew: true });

    ((global as any).mockPrisma.mapWorld.findUnique as jest.Mock).mockResolvedValue({ id: 'world-mixed', name: 'Mixed Map' });
    ((global as any).mockPrisma.question.findMany as jest.Mock).mockResolvedValue([]);

    clientSocket1.on('connect', () => {
      clientSocket1.emit('student:create_practice', { studentId: 'student-123', studentName: 'Aarav' });
    });

    clientSocket1.on('room:updated', (payload: any) => {
      expect(payload).toHaveProperty('roomCode');
      expect(payload.status).toBe('LOBBY');
      expect(payload.teams[0].name).toBe('Aarav');
      done();
    });
  });
});
