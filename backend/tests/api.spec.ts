import request from 'supertest';
import app from '../src/app';
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
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    studentProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    school: {
      findFirst: jest.fn(),
    },
    eventLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    refreshToken: {
      create: jest.fn(),
    },
  };
  return {
    __esModule: true,
    prisma: m,
    default: m,
  };
});

describe('ByteQuest API Tests', () => {
  it('should register a new student user and return OTP message', async () => {
    const mockUser = {
      id: 'mock-id-123',
      email: 'test_student@bytequest.edu',
      role: 'STUDENT',
      firstName: 'Alex',
      lastName: 'Coder',
      otpCode: '123456',
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
    (prisma.studentProfile.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test_student@bytequest.edu',
        password: 'password123',
        role: 'STUDENT',
        firstName: 'Alex',
        lastName: 'Coder',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body.email).toBe('test_student@bytequest.edu');
  });

  it('should verify OTP and activate user account', async () => {
    const mockUser = {
      id: 'mock-id-123',
      email: 'test_student@bytequest.edu',
      isVerified: false,
      otpCode: '123456',
      otpExpiresAt: new Date(Date.now() + 100000),
    };

    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, isVerified: true });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        email: 'test_student@bytequest.edu',
        otp: '123456',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('verified successfully');
  });
});
