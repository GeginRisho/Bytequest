import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import http from 'http';
import app from '../src/app';
import { SocketService } from '../src/services/socketService';
import prisma from '../src/config/db';

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

jest.mock('../src/config/db', () => {
  const m = {
    mapWorld: {
      findFirst: jest.fn(),
    },
    gameSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    roomPlayer: {
      create: jest.fn(),
    },
  };
  return {
    __esModule: true,
    prisma: m,
    default: m,
  };
});

describe('ByteQuest Socket.io Tests', () => {
  let server: http.Server;
  let socketService: SocketService;
  let clientSocket1: ClientSocket;
  let roomCode: string;

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

  it('should connect to WebSocket server and create a game room', (done) => {
    clientSocket1 = ClientIO('http://localhost:5005', { forceNew: true });

    (prisma.mapWorld.findFirst as jest.Mock).mockResolvedValue({ id: 'world-1' });
    (prisma.gameSession.create as jest.Mock).mockResolvedValue({ id: 'session-1', roomCode: 'ABCD' });
    (prisma.roomPlayer.create as jest.Mock).mockResolvedValue({});

    clientSocket1.on('connect', () => {
      clientSocket1.emit('room:create', { worldName: 'Forest', studentId: 'student-id-123' });
    });

    clientSocket1.on('room:created', (payload: any) => {
      expect(payload).toHaveProperty('roomCode');
      expect(payload).toHaveProperty('sessionId');
      done();
    });
  });
});
