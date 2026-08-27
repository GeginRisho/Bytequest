import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../services/db';

import AuthService from '../services/authService';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

// student signup
router.post('/auth/signup', async (req: Request, res: Response) => {
  const { email, password, grade, firstName, lastName } = req.body;

  if (!email || !password || !grade || !firstName || !lastName) {
    return res.status(400).json({ error: 'All fields (email, password, grade, firstName, lastName) are required' });
  }

  try {
    // Check if email already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user & profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.STUDENT,
        firstName,
        lastName,
        isVerified: true
      }
    });

    const student = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        grade: Number(grade),
        xp: 0,
        coins: 10,
        level: 1
      }
    });

    const token = AuthService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return res.status(201).json({
      success: true,
      token,
      student: {
        id: student.id,
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        grade: student.grade,
        xp: student.xp,
        coins: student.coins,
        level: student.level,
        schoolId: student.schoolId,
        classId: student.classId
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// student login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null }
    });

    if (!user || user.role !== Role.STUDENT) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
      student: {
        id: student.id,
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        grade: student.grade,
        xp: student.xp,
        coins: student.coins,
        level: student.level,
        schoolId: student.schoolId,
        classId: student.classId
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Protect all endpoints below this line
router.use(authenticate as any);
router.use(requireRole(['STUDENT', 'TEACHER', 'ADMIN']) as any);

// GET all schools
router.get('/schools', async (req: Request, res: Response) => {
  try {
    const schools = await prisma.school.findMany();
    return res.json({ success: true, schools });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET teachers by schoolId
router.get('/teachers', async (req: Request, res: Response) => {
  const { schoolId } = req.query;
  if (!schoolId) {
    return res.status(400).json({ error: 'schoolId is required' });
  }

  try {
    const profiles = await prisma.teacherProfile.findMany({
      where: { schoolId: String(schoolId), deletedAt: null },
      include: { user: true }
    });

    const teachers = profiles.map(p => ({
      id: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      email: p.user.email
    }));

    return res.json({ success: true, teachers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET active classes by teacherId
router.get('/classes', async (req: Request, res: Response) => {
  const { teacherId } = req.query;
  if (!teacherId) {
    return res.status(400).json({ error: 'teacherId is required' });
  }

  try {
    const classes = await prisma.class.findMany({
      where: { teacherId: String(teacherId), isArchived: false }
    });
    return res.json({ success: true, classes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST submit join request
router.post('/join-request', async (req: Request, res: Response) => {
  const { studentId, classId, studentName } = req.body;
  if (!studentId || !classId || !studentName) {
    return res.status(400).json({ error: 'studentId, classId and studentName are required' });
  }

  try {
    // Check if duplicate pending request
    const existing = await prisma.joinRequest.findFirst({
      where: { studentId, classId, status: 'PENDING' }
    });

    if (existing) {
      return res.json({ success: true, request: existing });
    }

    const request = await prisma.joinRequest.create({
      data: {
        studentId,
        classId,
        studentName,
        status: 'PENDING'
      }
    });

    return res.status(201).json({ success: true, request });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
// POST submit class change join request
router.post('/join-request/class-change', async (req: Request, res: Response) => {
  const { studentId, className, section } = req.body;
  if (!studentId || !className || !section) {
    return res.status(400).json({ error: 'studentId, className and section are required' });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true, class: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Determine teacherId
    let teacherId = student.class?.teacherId;
    if (!teacherId) {
      const firstTeacher = await prisma.teacherProfile.findFirst();
      if (!firstTeacher) {
        return res.status(400).json({ error: 'No teacher found to handle requests' });
      }
      teacherId = firstTeacher.id;
    }

    // Look for class, create if not exists
    let targetClass = await prisma.class.findFirst({
      where: {
        name: className,
        section,
        teacherId,
        isArchived: false
      }
    });

    if (!targetClass) {
      targetClass = await prisma.class.create({
        data: {
          name: className,
          section,
          teacherId
        }
      });
    }

    // Check if duplicate pending request
    const existing = await prisma.joinRequest.findFirst({
      where: {
        studentId,
        classId: targetClass.id,
        status: 'PENDING'
      }
    });

    if (existing) {
      return res.json({ success: true, request: existing });
    }

    const studentName = `${student.user.firstName} ${student.user.lastName}`;
    const request = await prisma.joinRequest.create({
      data: {
        studentId,
        classId: targetClass.id,
        studentName,
        status: 'PENDING'
      }
    });

    return res.status(201).json({ success: true, request });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET student profile details
router.get('/profile/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        class: {
          include: {
            teacher: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Fetch real player statistics
    const gamesWon = await prisma.sessionResult.count({
      where: { studentId: student.id, rank: 1 }
    });
    const questionsAnswered = await prisma.playerMove.count({
      where: { studentId: student.id, isAnswerCorrect: { not: null } }
    });
    const correctAnswers = await prisma.playerMove.count({
      where: { studentId: student.id, isAnswerCorrect: true }
    });

    // Check if there is a pending join request
    const pendingRequest = await prisma.joinRequest.findFirst({
      where: { studentId: student.id, status: 'PENDING' },
      include: { class: { include: { teacher: { include: { user: true } } } } }
    });

    return res.json({
      success: true,
      student: {
        id: student.id,
        email: student.user.email,
        name: `${student.user.firstName} ${student.user.lastName}`,
        grade: student.grade,
        xp: student.xp,
        coins: student.coins,
        level: student.level,
        minutesPlayed: student.minutesPlayed,
        isSuspended: student.isSuspended,
        schoolId: student.schoolId,
        classId: student.classId,
        className: student.class?.name || null,
        classSection: student.class?.section || null,
        classGrade: student.class?.grade || null,
        classSubject: student.class?.subject || null,
        teacherName: student.class?.teacher ? `${student.class.teacher.user.firstName} ${student.class.teacher.user.lastName}` : null,
        gamesPlayed: student.matchesPlayed,
        gamesWon,
        questionsAnswered,
        correctAnswers,
        pendingClass: pendingRequest ? {
          className: pendingRequest.class.name,
          classSection: pendingRequest.class.section,
          classGrade: pendingRequest.class.grade,
          classSubject: pendingRequest.class.subject,
          teacherName: `${pendingRequest.class.teacher.user.firstName} ${pendingRequest.class.teacher.user.lastName}`
        } : null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST update student rewards (XP, coins, minutesPlayed)
router.post('/profile/:id/rewards', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { xpEarned, coinsEarned, minutesEarned } = req.body;

  try {
    const student = await prisma.studentProfile.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const newXp = student.xp + (Number(xpEarned) || 0);
    const newCoins = student.coins + (Number(coinsEarned) || 0);
    const newLevel = Math.floor(newXp / 500) + 1;
    const newMinutes = student.minutesPlayed + (Number(minutesEarned) || 0);

    const updated = await prisma.studentProfile.update({
      where: { id },
      data: {
        xp: newXp,
        coins: newCoins,
        level: newLevel,
        minutesPlayed: newMinutes
      }
    });

    return res.json({ success: true, student: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST save a single question answer attempt (Requirements 3 & 4)
router.post('/question-attempt', async (req: Request, res: Response) => {
  const { studentId, questionId, selectedAnswer, isCorrect, activityType, xpEarned, coinsEarned, sessionId } = req.body;

  if (!studentId || !questionId || selectedAnswer === undefined || isCorrect === undefined || !activityType) {
    return res.status(400).json({ error: 'Missing required attempt fields' });
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Deduplication check
    let duplicate = null;

    if (activityType === 'ONLINE_GAME' && sessionId) {
      duplicate = await prisma.questionAttempt.findFirst({
        where: {
          studentId,
          questionId,
          activityType,
          createdAt: {
            gte: new Date(Date.now() - 4 * 60 * 60 * 1000) // last 4 hours
          }
        }
      });
    } else if (activityType === 'DAILY_CHALLENGE') {
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      duplicate = await prisma.questionAttempt.findFirst({
        where: {
          studentId,
          questionId,
          activityType,
          createdAt: {
            gte: startOfDay
          }
        }
      });
    } else if (activityType === 'PRACTICE_QUIZ' || activityType === 'OFFLINE_GAME') {
      duplicate = await prisma.questionAttempt.findFirst({
        where: {
          studentId,
          questionId,
          activityType,
          selectedAnswer,
          createdAt: {
            gte: new Date(Date.now() - 5000) // last 5 seconds
          }
        }
      });
    }

    if (duplicate) {
      return res.json({ success: true, duplicated: true, student });
    }

    // Save attempt
    const attempt = await prisma.questionAttempt.create({
      data: {
        studentId,
        classId: student.classId,
        grade: student.grade,
        questionId,
        questionText: question.questionText,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        xpEarned: isCorrect ? Number(xpEarned || 0) : 0,
        coinsEarned: isCorrect ? Number(coinsEarned || 0) : 0,
        activityType
      }
    });

    // Update student profile totals
    const finalXp = student.xp + attempt.xpEarned;
    const finalCoins = student.coins + attempt.coinsEarned;
    const finalLevel = Math.floor(finalXp / 500) + 1;

    const updatedStudent = await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        xp: finalXp,
        coins: finalCoins,
        level: finalLevel
      }
    });

    return res.json({
      success: true,
      attempt,
      student: updatedStudent
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST match completed (increments matchesPlayed, recalculates level)
router.post('/profile/:id/match-completed', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const student = await prisma.studentProfile.findUnique({ where: { id } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const nextMatchesPlayed = student.matchesPlayed + 1;
    let nextLevel = 1;
    if (nextMatchesPlayed <= 5) nextLevel = 1;
    else if (nextMatchesPlayed <= 12) nextLevel = 2;
    else if (nextMatchesPlayed <= 21) nextLevel = 3;
    else if (nextMatchesPlayed <= 31) nextLevel = 4;
    else nextLevel = 5;

    const updated = await prisma.studentProfile.update({
      where: { id },
      data: {
        matchesPlayed: nextMatchesPlayed,
        level: nextLevel
      }
    });

    return res.json({
      success: true,
      matchesPlayed: updated.matchesPlayed,
      level: updated.level,
      leveledUp: updated.level > student.level
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update student profile (name, password)
router.put('/profile/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, currentPassword, newPassword } = req.body;

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const userUpdates: any = {};

    if (firstName) userUpdates.firstName = firstName.trim();
    if (lastName) userUpdates.lastName = lastName.trim();

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required to change password' });
      }
      const match = await bcrypt.compare(currentPassword, student.user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      userUpdates.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: student.userId },
        data: userUpdates
      });
    }

    // Re-fetch updated student
    const updated = await prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true, class: true }
    });

    return res.json({
      success: true,
      student: {
        id: updated!.id,
        name: `${updated!.user.firstName} ${updated!.user.lastName}`,
        email: updated!.user.email,
        grade: updated!.grade,
        xp: updated!.xp,
        coins: updated!.coins,
        level: updated!.level,
        classId: updated!.classId,
        className: updated!.class?.name || null
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST submit join request by class join code
router.post('/join-by-code', async (req: Request, res: Response) => {
  const { studentId, joinCode } = req.body;
  if (!studentId || !joinCode) {
    return res.status(400).json({ error: 'studentId and joinCode are required' });
  }

  try {
    const classes = await prisma.class.findMany({
      where: { isArchived: false }
    });

    const targetClass = classes.find(c => {
      const clean = c.id.replace(/-/g, '').substring(0, 4).toUpperCase();
      return `BQ${clean}` === joinCode.trim().toUpperCase();
    });

    if (!targetClass) {
      return res.status(404).json({ error: 'No saved classroom found with this Join Code.' });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    // Check if student is already in this class
    if (student.classId === targetClass.id) {
      return res.status(400).json({ error: 'You are already a member of this classroom.' });
    }

    // Check if duplicate pending request
    const existing = await prisma.joinRequest.findFirst({
      where: {
        studentId,
        classId: targetClass.id,
        status: 'PENDING'
      }
    });

    if (existing) {
      return res.json({ success: true, message: 'Your join request is already pending teacher approval.', request: existing });
    }

    const studentName = `${student.user.firstName} ${student.user.lastName}`.trim();
    const request = await prisma.joinRequest.create({
      data: {
        studentId,
        classId: targetClass.id,
        studentName,
        status: 'PENDING'
      }
    });

    return res.status(201).json({ success: true, message: 'Request submitted successfully. Pending teacher approval.', request });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

