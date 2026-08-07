import request from 'supertest';
import bcrypt from 'bcrypt';

// Define global mock container to avoid Jest hoist initialization issues
(global as any).mockPrisma = {
  $on: jest.fn(),
  $use: jest.fn(),
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  class: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  studentProfile: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  team: {
    findMany: jest.fn(),
  },
  teamMember: {
    findMany: jest.fn(),
  },
  joinRequest: {
    findMany: jest.fn(),
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

describe('ByteQuest Teacher API Tests', () => {
  it('should authenticate a teacher with valid credentials', async () => {
    const passwordHash = bcrypt.hashSync('password123', 10);
    const mockUser = {
      id: 'user-123',
      firstName: 'Dr.',
      lastName: 'Coder',
      email: 'teacher@bytequest.com',
      passwordHash,
      role: 'TEACHER',
      teacherProfile: {
        id: 'teacher-123',
        schoolId: 'school-123',
        isActive: true
      }
    };

    ((global as any).mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/v1/teacher/auth/login')
      .send({
        email: 'teacher@bytequest.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('teacher');
    expect(res.body.teacher.email).toBe('teacher@bytequest.com');
  });

  it('should list classes for a logged-in teacher', async () => {
    const mockClasses = [
      { id: 'class-1', name: 'Grade 10 - CS Basics', grade: 10, isArchived: false, students: [] },
      { id: 'class-2', name: 'Grade 11 - Python', grade: 11, isArchived: false, students: [] }
    ];

    ((global as any).mockPrisma.class.findMany as jest.Mock).mockResolvedValue(mockClasses);
    ((global as any).mockPrisma.studentProfile.findMany as jest.Mock).mockResolvedValue([]);
    ((global as any).mockPrisma.team.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/teacher/classes?teacherId=teacher-123');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('classes');
    expect(res.body.classes.length).toBe(2);
  });
});
