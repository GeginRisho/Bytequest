import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../services/db';
import AuthService from '../services/authService';
import { Role } from '@prisma/client';

const router = Router();

// Unified sign-in endpoint for all roles
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT access token
    const token = AuthService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    if (user.role === Role.STUDENT) {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: user.id, deletedAt: null }
      });

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      if (student.isSuspended) {
        return res.status(403).json({ error: 'This student account is suspended.' });
      }

      return res.json({
        success: true,
        token,
        role: 'student',
        student: {
          id: student.id,
          userId: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          grade: student.grade,
          xp: student.xp,
          coins: student.coins,
          level: student.level,
          schoolId: student.schoolId,
          classId: student.classId
        }
      });
    }

    if (user.role === Role.TEACHER) {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { userId: user.id, deletedAt: null }
      });

      if (!teacher) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      if (!teacher.isActive) {
        return res.status(403).json({ error: 'This teacher account is inactive.' });
      }

      return res.json({
        success: true,
        token,
        role: 'teacher',
        teacher: {
          id: teacher.id,
          userId: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          schoolId: teacher.schoolId
        }
      });
    }

    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      return res.json({
        success: true,
        token,
        role: 'admin',
        admin: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim()
        }
      });
    }

    return res.status(403).json({ error: 'Access denied: Unknown role' });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Temporary endpoint for seeding the production admin account safely
router.post('/diagnose/seed-admin', async (req, res) => {
  try {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: 'admin@bytequest.com', mode: 'insensitive' } }
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Admin account already exists',
        role: existing.role
      });
    }

    const passwordHash = await bcrypt.hash('password123', 10);
    const newAdmin = await prisma.user.create({
      data: {
        email: 'admin@bytequest.com',
        passwordHash,
        role: Role.ADMIN,
        firstName: 'Admin',
        lastName: 'System',
        isVerified: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      role: newAdmin.role
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
