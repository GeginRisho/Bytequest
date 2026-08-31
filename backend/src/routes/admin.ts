import { Router } from 'express';
import bcrypt from 'bcrypt';
import xlsx from 'xlsx';
import { prisma } from '../services/db';
import { Role, Difficulty, QuestionType } from '@prisma/client';

const router = Router();

const broadcastAdminUpdate = (req: any) => {
  const socketService = req.app.get('socketService');
  if (socketService) {
    socketService.broadcastAdminUpdate();
  }
};

// ==========================================
// ADMIN DASHBOARD OVERVIEW STATS
// ==========================================
router.get('/dashboard-stats', async (req, res) => {
  try {
    const teachersCount = await prisma.teacherProfile.count({ where: { deletedAt: null } });
    const studentsCount = await prisma.studentProfile.count({ where: { deletedAt: null } });
    const questionsCount = await prisma.question.count({ where: { deletedAt: null } });
    const classesCount = await prisma.class.count({ where: { isArchived: false } });
    const activeSessionsCount = await prisma.gameSession.count({ where: { status: { in: ['LOBBY', 'PLAYING'] } } });

    // Performance stats
    const totalAttempted = await prisma.questionAttempt.count();
    const totalCorrect = await prisma.questionAttempt.count({ where: { isCorrect: true } });
    const totalWrong = totalAttempted - totalCorrect;
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    const xpAggregate = await prisma.studentProfile.aggregate({
      _sum: { xp: true, coins: true }
    });
    const totalXp = xpAggregate._sum.xp || 0;
    const totalCoins = xpAggregate._sum.coins || 0;

    // Game activity counts
    const onlineGameAttempts = await prisma.questionAttempt.count({ where: { activityType: 'ONLINE_GAME' } });
    const offlineGameAttempts = await prisma.questionAttempt.count({ where: { activityType: 'OFFLINE_GAME' } });
    const dailyChallengeAttempts = await prisma.questionAttempt.count({ where: { activityType: 'DAILY_CHALLENGE' } });
    const practiceQuizAttempts = await prisma.questionAttempt.count({ where: { activityType: 'PRACTICE_QUIZ' } });

    // Latest activity
    const latestAttempt = await prisma.questionAttempt.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { student: { include: { user: true } } }
    });
    const latestActivityDate = latestAttempt ? latestAttempt.createdAt.toISOString() : null;

    // Load students for leaderboard
    const dbStudents = await prisma.studentProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: true,
        class: true,
        questionAttempts: true
      }
    });

    const studentLeaderboardData = dbStudents.map(s => {
      const attempted = s.questionAttempts.length;
      const correct = s.questionAttempts.filter(a => a.isCorrect).length;
      const wrong = attempted - correct;
      const accuracyPercent = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

      return {
        id: s.id,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        grade: s.grade,
        class: s.class ? `${s.class.name} (${s.class.section})` : 'N/A',
        xp: s.xp,
        coins: s.coins,
        attempted,
        correct,
        wrong,
        accuracy: accuracyPercent
      };
    });

    // Helper to rank students
    const rankList = (list: typeof studentLeaderboardData, sortByXpOnly = false) => {
      const sorted = list.slice().sort((a, b) => {
        if (sortByXpOnly) {
          if (b.xp !== a.xp) return b.xp - a.xp;
          if (b.coins !== a.coins) return b.coins - a.coins;
          return b.attempted - a.attempted;
        } else {
          // Overall Ranking Order:
          // 1. Highest XP
          // 2. Highest coins
          // 3. Questions answered
          // 4. Correct answers
          // 5. Accuracy
          if (b.xp !== a.xp) return b.xp - a.xp;
          if (b.coins !== a.coins) return b.coins - a.coins;
          if (b.attempted !== a.attempted) return b.attempted - a.attempted;
          if (b.correct !== a.correct) return b.correct - a.correct;
          return b.accuracy - a.accuracy;
        }
      });

      return sorted.map((s, idx) => {
        let rankStr = `Rank ${idx + 1}`;
        if (idx === 0) rankStr = '🥇 Rank 1';
        else if (idx === 1) rankStr = '🥈 Rank 2';
        else if (idx === 2) rankStr = '🥉 Rank 3';
        return { ...s, rank: rankStr };
      });
    };

    const overallLeaderboard = rankList(studentLeaderboardData);
    const gradeLeaderboards: Record<string, any[]> = {};
    for (let g = 4; g <= 12; g++) {
      gradeLeaderboards[`class${g}`] = rankList(studentLeaderboardData.filter(s => s.grade === g), true);
    }

    return res.json({
      success: true,
      stats: {
        teachersCount,
        studentsCount,
        questionsCount,
        classesCount,
        activeSessionsCount
      },
      performance: {
        totalAttempted,
        totalCorrect,
        totalWrong,
        accuracy,
        totalXp,
        totalCoins,
        latestActivityDate,
        activityDistribution: {
          ONLINE_GAME: onlineGameAttempts,
          OFFLINE_GAME: offlineGameAttempts,
          DAILY_CHALLENGE: dailyChallengeAttempts,
          PRACTICE_QUIZ: practiceQuizAttempts
        }
      },
      leaderboards: {
        overall: overallLeaderboard,
        ...gradeLeaderboards
      }
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TEACHERS MANAGEMENT
// ==========================================
router.get('/management/teachers', async (req, res) => {
  try {
    const allStudents = await prisma.studentProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: true,
        questionAttempts: true
      }
    });

    const sortedStudents = [...allStudents].sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (b.coins !== a.coins) return b.coins - a.coins;
      const aAttempted = a.questionAttempts.length;
      const bAttempted = b.questionAttempts.length;
      if (bAttempted !== aAttempted) return bAttempted - aAttempted;
      const aCorrect = a.questionAttempts.filter(qa => qa.isCorrect).length;
      const bCorrect = b.questionAttempts.filter(qa => qa.isCorrect).length;
      if (bCorrect !== aCorrect) return bCorrect - aCorrect;
      return 0;
    });

    const teachers = await prisma.teacherProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: true,
        school: true,
        classes: {
          where: { isArchived: false },
          include: {
            students: {
              where: { deletedAt: null },
              include: {
                user: true,
                questionAttempts: true
              }
            }
          }
        }
      }
    });

    const mapped = teachers.map(t => {
      const teacherStudents: any[] = [];
      t.classes.forEach(c => {
        c.students.forEach(s => {
          const attempted = s.questionAttempts.length;
          const correct = s.questionAttempts.filter(qa => qa.isCorrect).length;
          const wrong = attempted - correct;
          const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
          const overallRank = sortedStudents.findIndex(x => x.id === s.id) + 1;

          teacherStudents.push({
            id: s.id,
            name: `${s.user.firstName} ${s.user.lastName}`.trim(),
            email: s.user.email,
            grade: s.grade,
            className: `${c.name} (${c.section})`,
            xp: s.xp,
            coins: s.coins,
            attempted,
            correct,
            wrong,
            accuracy,
            overallRank
          });
        });
      });

      teacherStudents.sort((a, b) => b.xp - a.xp);

      const rankedTeacherStudents = teacherStudents.map((s, idx) => ({
        ...s,
        teacherRank: `#${idx + 1}`
      }));

      return {
        id: t.id,
        userId: t.userId,
        firstName: t.user.firstName,
        lastName: t.user.lastName,
        name: `${t.user.firstName} ${t.user.lastName}`.trim(),
        email: t.user.email,
        subject: t.subject || 'N/A',
        mobileNumber: t.mobileNumber || '',
        schoolName: t.school.name,
        schoolId: t.schoolId,
        isActive: t.isActive,
        studentCount: rankedTeacherStudents.length,
        students: rankedTeacherStudents
      };
    });

    return res.json({ success: true, teachers: mapped });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/management/teachers', async (req, res) => {
  const { email, password, firstName, lastName, schoolName, schoolId, subject, mobileNumber } = req.body;
  if (!email || !password || !firstName || !lastName || (!schoolName && !schoolId)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    let targetSchoolId = schoolId;
    if (!targetSchoolId && schoolName) {
      const trimmed = schoolName.trim();
      let school = await prisma.school.findFirst({
        where: { name: { equals: trimmed, mode: 'insensitive' } }
      });
      if (!school) {
        school = await prisma.school.create({
          data: {
            name: trimmed,
            district: 'Local District',
            state: 'State'
          }
        });
      }
      targetSchoolId = school.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.TEACHER,
        firstName,
        lastName,
        isVerified: true
      }
    });

    const teacher = await prisma.teacherProfile.create({
      data: {
        userId: user.id,
        schoolId: targetSchoolId,
        isApproved: true,
        isActive: true,
        subject,
        mobileNumber
      }
    });

    broadcastAdminUpdate(req);
    return res.status(201).json({ success: true, teacher });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/management/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, subject, mobileNumber, schoolName, schoolId } = req.body;

  try {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (email && email.toLowerCase() !== teacher.user.email.toLowerCase()) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    let targetSchoolId = schoolId;
    if (!targetSchoolId && schoolName) {
      const trimmed = schoolName.trim();
      let school = await prisma.school.findFirst({
        where: { name: { equals: trimmed, mode: 'insensitive' } }
      });
      if (!school) {
        school = await prisma.school.create({
          data: {
            name: trimmed,
            district: 'Local District',
            state: 'State'
          }
        });
      }
      targetSchoolId = school.id;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: teacher.userId },
        data: {
          firstName: firstName || teacher.user.firstName,
          lastName: lastName || teacher.user.lastName,
          email: email || teacher.user.email
        }
      }),
      prisma.teacherProfile.update({
        where: { id },
        data: {
          subject: subject !== undefined ? subject : teacher.subject,
          mobileNumber: mobileNumber !== undefined ? mobileNumber : teacher.mobileNumber,
          schoolId: targetSchoolId || teacher.schoolId
        }
      })
    ]);

    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Teacher details updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/management/teachers/:id/toggle-active', async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await prisma.teacherProfile.findUnique({ where: { id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const updated = await prisma.teacherProfile.update({
      where: { id },
      data: { isActive: !teacher.isActive }
    });

    broadcastAdminUpdate(req);
    return res.json({ success: true, isActive: updated.isActive });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/management/teachers/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  try {
    const teacher = await prisma.teacherProfile.findUnique({ where: { id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: teacher.userId },
      data: { passwordHash }
    });

    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Password reset successful' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/management/teachers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.teacherProfile.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// STUDENTS MANAGEMENT
// ==========================================
router.get('/students', async (req, res) => {
  try {
    const list = await prisma.studentProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: true,
        class: true,
        school: true,
        questionAttempts: true,
        sessionResults: true
      }
    });

    const sortedStudents = [...list].sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (b.coins !== a.coins) return b.coins - a.coins;
      const aAttempted = a.questionAttempts.length;
      const bAttempted = b.questionAttempts.length;
      if (bAttempted !== aAttempted) return bAttempted - aAttempted;
      const aCorrect = a.questionAttempts.filter(qa => qa.isCorrect).length;
      const bCorrect = b.questionAttempts.filter(qa => qa.isCorrect).length;
      if (bCorrect !== aCorrect) return bCorrect - aCorrect;
      return 0;
    });

    const mapped = list.map(s => {
      const attempted = s.questionAttempts.length;
      const correct = s.questionAttempts.filter(qa => qa.isCorrect).length;
      const wrong = attempted - correct;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      const rank = sortedStudents.findIndex(x => x.id === s.id) + 1;

      const gamesPlayed = s.matchesPlayed;
      const gamesCompleted = s.sessionResults.length;
      const wins = s.sessionResults.filter(sr => sr.rank === 1).length;
      const losses = gamesCompleted - wins;

      return {
        id: s.id,
        userId: s.userId,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        email: s.user.email,
        grade: s.grade,
        xp: s.xp,
        coins: s.coins,
        level: s.level,
        isSuspended: s.isSuspended,
        classId: s.classId || '',
        className: s.class ? `${s.class.name} (${s.class.section})` : 'Unassigned',
        schoolName: s.school ? s.school.name : 'St. Patrick High School',
        attempted,
        correct,
        wrong,
        accuracy,
        rank,
        gamesPlayed,
        gamesCompleted,
        wins,
        losses
      };
    });

    return res.json({ success: true, students: mapped });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/students', async (req, res) => {
  const { name, email, classId, password } = req.body;
  if (!name || !email || !classId || !password) {
    return res.status(400).json({ error: 'Name, email, classId and password are required' });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { email: email.trim() }
    });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || 'Student';
    const lastName = nameParts.slice(1).join(' ') || '';

    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      include: { teacher: true }
    });
    const schoolId = targetClass?.teacher.schoolId || null;

    const user = await prisma.user.create({
      data: {
        email: email.trim(),
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
        classId,
        schoolId,
        xp: 0,
        coins: 10,
        level: 1
      },
      include: { user: true }
    });

    broadcastAdminUpdate(req);
    return res.status(201).json({
      success: true,
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`.trim(),
        email: student.user.email,
        classId: student.classId
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/students/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, grade, classId } = req.body;

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (email && email.toLowerCase() !== student.user.email.toLowerCase()) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'Email already exists' });
    }

    let targetSchoolId = student.schoolId;
    if (classId && classId !== student.classId) {
      const targetClass = await prisma.class.findUnique({
        where: { id: classId },
        include: { teacher: true }
      });
      if (targetClass) {
        targetSchoolId = targetClass.teacher.schoolId;
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: student.userId },
        data: {
          firstName: firstName || student.user.firstName,
          lastName: lastName || student.user.lastName,
          email: email || student.user.email
        }
      }),
      prisma.studentProfile.update({
        where: { id },
        data: {
          grade: grade ? Number(grade) : student.grade,
          classId: classId || student.classId,
          schoolId: targetSchoolId
        }
      })
    ]);

    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Student updated' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/students/:id/suspend', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.studentProfile.update({
      where: { id },
      data: { isSuspended: true }
    });
    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Student suspended' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/students/:id/unsuspend', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.studentProfile.update({
      where: { id },
      data: { isSuspended: false }
    });
    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Student unsuspended' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/students/:id/reset', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.studentProfile.update({
      where: { id },
      data: { xp: 0, coins: 10, level: 1 }
    });
    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Student progress reset' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.studentProfile.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.$transaction([
      prisma.studentProfile.update({
        where: { id },
        data: { deletedAt: new Date() }
      }),
      prisma.user.update({
        where: { id: student.userId },
        data: { deletedAt: new Date() }
      })
    ]);

    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Student deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// QUESTIONS BANK MANAGEMENT
// ==========================================
router.get('/questions', async (req, res) => {
  try {
    const questions = await prisma.question.findMany({
      where: { deletedAt: null }
    });
    return res.json({ success: true, questions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/questions', async (req, res) => {
  const { grade, topic, difficulty, question, options, correctIndex, explanation, subject } = req.body;
  if (!grade || !topic || !difficulty || !question || !options || correctIndex === undefined) {
    return res.status(400).json({ error: 'Missing required question fields' });
  }

  try {
    const newQ = await prisma.question.create({
      data: {
        classLevel: Number(grade),
        topic,
        subtopic: "General",
        difficulty: difficulty.toUpperCase() as Difficulty,
        type: QuestionType.MCQ,
        title: topic + " MCQ",
        questionText: question,
        options,
        correctAnswer: options[correctIndex] || options[0],
        explanation: explanation || 'No explanation provided.',
        subject: subject || 'Computer Science'
      }
    });

    broadcastAdminUpdate(req);
    return res.status(201).json({ success: true, question: newQ });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/questions/:id', async (req, res) => {
  const { id } = req.params;
  const { grade, topic, difficulty, question, options, correctIndex, explanation, subject } = req.body;

  try {
    const oldQ = await prisma.question.findUnique({ where: { id } });
    if (!oldQ) return res.status(404).json({ error: 'Question not found' });

    const updated = await prisma.question.update({
      where: { id },
      data: {
        classLevel: grade ? Number(grade) : oldQ.classLevel,
        topic: topic || oldQ.topic,
        difficulty: difficulty ? (difficulty.toUpperCase() as Difficulty) : oldQ.difficulty,
        questionText: question || oldQ.questionText,
        options: options || oldQ.options,
        correctAnswer: options && correctIndex !== undefined ? options[correctIndex] : oldQ.correctAnswer,
        explanation: explanation || oldQ.explanation,
        subject: subject || oldQ.subject
      }
    });

    broadcastAdminUpdate(req);
    return res.json({ success: true, question: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/questions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.question.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Question deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/questions/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid question IDs' });
  }
  try {
    await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() }
    });
    broadcastAdminUpdate(req);
    return res.json({ success: true, message: `Successfully deleted ${ids.length} questions` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/questions/bulk-edit', async (req, res) => {
  const { ids, fields } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0 || !fields) {
    return res.status(400).json({ error: 'Missing required bulk-edit fields' });
  }
  try {
    const updateData: any = {};
    if (fields.grade !== undefined && fields.grade !== '') updateData.classLevel = Number(fields.grade);
    if (fields.subject !== undefined && fields.subject !== '') updateData.subject = fields.subject;
    if (fields.difficulty !== undefined && fields.difficulty !== '') updateData.difficulty = fields.difficulty.toUpperCase() as Difficulty;
    if (fields.topic !== undefined && fields.topic !== '') updateData.topic = fields.topic;

    await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: updateData
    });
    broadcastAdminUpdate(req);
    return res.json({ success: true, message: `Successfully updated ${ids.length} questions` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/questions/:id/duplicate', async (req, res) => {
  const { id } = req.params;
  try {
    const original = await prisma.question.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ error: 'Question not found' });

    const duplicated = await prisma.question.create({
      data: {
        classLevel: original.classLevel,
        topic: original.topic,
        subtopic: original.subtopic,
        difficulty: original.difficulty,
        type: original.type,
        title: original.title + " (Copy)",
        questionText: original.questionText + " (Copy)",
        options: original.options,
        correctAnswer: original.correctAnswer,
        explanation: original.explanation
      }
    });

    broadcastAdminUpdate(req);
    return res.json({ success: true, question: duplicated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/questions/import', async (req, res) => {
  const { csvText } = req.body;
  if (!csvText) return res.status(400).json({ error: 'CSV Text is required' });

  try {
    const lines = csvText.split('\n').filter((l: string) => l.trim().length > 0);
    const questionsCreated = [];
    
    // Skip header line if it looks like columns
    const startIdx = lines[0].toLowerCase().includes('question') ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV splitter that handles some commas inside quotes
      const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((s: string) => s.replace(/^"|"$/g, '').trim());

      if (cells.length < 8) continue;

      const grade = Number(cells[0]) || 11;
      const topic = cells[1] || 'General';
      const difficulty = cells[2] as 'easy' | 'medium' | 'hard';
      const questionText = cells[3];
      const optA = cells[4];
      const optB = cells[5];
      const optC = cells[6];
      const optD = cells[7];
      const correctVal = cells[8] || 'A';
      const explanation = cells[9] || 'Imported via CSV';

      const options = [optA, optB, optC, optD].filter(Boolean);
      let correctIndex = 0;
      if (correctVal === 'B') correctIndex = 1;
      else if (correctVal === 'C') correctIndex = 2;
      else if (correctVal === 'D') correctIndex = 3;

      const q = await prisma.question.create({
        data: {
          classLevel: grade,
          topic,
          subtopic: 'General',
          difficulty: difficulty.toUpperCase() as Difficulty,
          type: QuestionType.MCQ,
          title: topic + ' MCQ',
          questionText,
          options,
          correctAnswer: options[correctIndex] || options[0],
          explanation
        }
      });
      questionsCreated.push(q);
    }

    broadcastAdminUpdate(req);
    return res.json({ success: true, count: questionsCreated.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CLASSES MANAGEMENT
// ==========================================
router.get('/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { isArchived: false },
      include: {
        teacher: { include: { user: true } },
        students: { where: { deletedAt: null } }
      }
    });

    const mapped = classes.map(c => ({
      id: c.id,
      name: c.name,
      section: c.section,
      grade: c.grade,
      subject: c.subject,
      teacherId: c.teacherId,
      teacherName: `${c.teacher.user.firstName} ${c.teacher.user.lastName}`.trim(),
      studentCount: c.students.length
    }));

    return res.json({ success: true, classes: mapped });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/classes', async (req, res) => {
  const { teacherId, name, grade, section, subject } = req.body;
  if (!teacherId || !name || !grade || !section || !subject) {
    return res.status(400).json({ error: 'Missing required class fields' });
  }

  try {
    const newCls = await prisma.class.create({
      data: {
        name,
        section,
        grade: Number(grade),
        subject,
        teacherId
      }
    });

    broadcastAdminUpdate(req);
    return res.status(201).json({ success: true, class: newCls });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { name, grade, section, subject, teacherId } = req.body;

  try {
    const updated = await prisma.class.update({
      where: { id },
      data: {
        name,
        grade: grade ? Number(grade) : undefined,
        section,
        subject,
        teacherId
      }
    });
    broadcastAdminUpdate(req);
    return res.json({ success: true, class: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/classes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.class.delete({ where: { id } });
    broadcastAdminUpdate(req);
    return res.json({ success: true, message: 'Class deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/classes/:id/duplicate', async (req, res) => {
  const { id } = req.params;
  try {
    const original = await prisma.class.findUnique({
      where: { id },
      include: { students: true }
    });
    if (!original) return res.status(404).json({ error: 'Class not found' });

    const duplicated = await prisma.class.create({
      data: {
        name: `${original.name} (Copy)`,
        section: original.section,
        teacherId: original.teacherId,
        isArchived: original.isArchived
      }
    });

    for (const originalStudent of original.students) {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: originalStudent.id },
        include: { user: true }
      });
      if (studentProfile) {
        const defaultHash = await bcrypt.hash('student123', 10);
        const email = `${studentProfile.user.firstName.toLowerCase()}.${Math.floor(1000 + Math.random() * 9000)}@bytequest.student.com`;
        
        const newUser = await prisma.user.create({
          data: {
            email,
            passwordHash: defaultHash,
            role: Role.STUDENT,
            firstName: studentProfile.user.firstName,
            lastName: studentProfile.user.lastName,
            isVerified: true
          }
        });

        await prisma.studentProfile.create({
          data: {
            userId: newUser.id,
            classId: duplicated.id,
            schoolId: studentProfile.schoolId,
            xp: studentProfile.xp,
            coins: studentProfile.coins,
            level: studentProfile.level
          }
        });
      }
    }

    broadcastAdminUpdate(req);
    return res.json({ success: true, class: duplicated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REPORTS & GAME SESSIONS
// ==========================================
router.get('/reports', async (req, res) => {
  try {
    const sessions = await prisma.gameSession.findMany({
      where: { status: 'FINISHED' },
      include: {
        class: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const reports = [];
    for (const s of sessions) {
      // Get results for this session
      const rawResults = await prisma.sessionResult.findMany({
        where: { sessionId: s.id },
        include: {
          student: { include: { user: true } }
        }
      });
      const results = rawResults.map(r => ({
        id: r.id,
        sessionId: r.sessionId,
        studentId: r.studentId,
        studentName: r.student ? `${r.student.user.firstName} ${r.student.user.lastName}`.trim() : 'Unknown',
        accuracy: r.accuracy,
        xp: r.xp,
        coins: r.coins,
        rank: r.rank
      }));

      reports.push({
        session: {
          id: s.id,
          classId: s.classId,
          roomCode: s.roomCode,
          status: s.status,
          startedAt: s.createdAt.toISOString(),
          endedAt: s.updatedAt.toISOString()
        },
        className: s.class ? s.class.name : 'Unknown Class',
        results
      });
    }

    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sessions/:id/report', async (req, res) => {
  const { id } = req.params;
  try {
    const session = await prisma.gameSession.findUnique({
      where: { id }
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const cls = await prisma.class.findUnique({
      where: { id: session.classId || '' }
    });

    const rawResults = await prisma.sessionResult.findMany({
      where: { sessionId: id },
      include: {
        student: { include: { user: true } }
      }
    });

    const results = rawResults.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      studentId: r.studentId,
      studentName: r.student ? `${r.student.user.firstName} ${r.student.user.lastName}`.trim() : 'Unknown',
      accuracy: r.accuracy,
      xp: r.xp,
      coins: r.coins,
      rank: r.rank
    }));

    return res.json({
      session,
      className: cls ? cls.name : 'Unknown Class',
      results
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EXPORTS DOWNLOADS (XLSX)
// ==========================================

// 1. Download student marks/results Excel
router.get('/export/marks', async (req, res) => {
  try {
    const students = await prisma.studentProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: true,
        school: true,
        class: {
          include: {
            teacher: { include: { user: true } }
          }
        },
        questionAttempts: true
      }
    });

    const sortedStudents = [...students].sort((a, b) => b.xp - a.xp);

    const studentRows = students.map(s => {
      const attempted = s.questionAttempts.length;
      const correct = s.questionAttempts.filter(a => a.isCorrect).length;
      const wrong = attempted - correct;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      const rank = sortedStudents.findIndex(x => x.id === s.id) + 1;
      const teacherName = s.class?.teacher
        ? `${s.class.teacher.user.firstName} ${s.class.teacher.user.lastName}`.trim()
        : 'N/A';

      return {
        'Rank': `Rank ${rank}`,
        'Student ID': s.id,
        'Student Name': `${s.user.firstName} ${s.user.lastName}`.trim(),
        'Email': s.user.email,
        'School': s.school?.name || 'St. Patrick High School',
        'Class': s.class ? `${s.class.name} (${s.class.section})` : 'N/A',
        'Grade': s.grade,
        'Teacher': teacherName,
        'Current Level': s.level,
        'Total XP': s.xp,
        'Total Coins': s.coins,
        'Questions Attempted': attempted,
        'Correct Answers': correct,
        'Wrong Answers': wrong,
        'Accuracy (%)': accuracy,
        'Status': s.isSuspended ? 'Suspended' : 'Active'
      };
    });

    // B. Classroom Session Results Marks Sheet
    const sessionResults = await prisma.sessionResult.findMany({
      include: {
        student: { include: { user: true } },
        session: { include: { class: true } }
      },
      orderBy: { session: { createdAt: 'desc' } }
    });

    const sessionRows = sessionResults.map(sr => ({
      'Result ID': sr.id,
      'Student Name': sr.student ? `${sr.student.user.firstName} ${sr.student.user.lastName}`.trim() : 'N/A',
      'Student Email': sr.student?.user.email || 'N/A',
      'Class Name': sr.session?.class?.name || 'N/A',
      'Room Code': sr.session?.roomCode || 'N/A',
      'Accuracy (%)': sr.accuracy ? Math.round(sr.accuracy * 100) : 0,
      'XP Earned': sr.xp,
      'Coins Earned': sr.coins,
      'Rank': sr.rank,
      'Session Finished Date': sr.session?.createdAt ? sr.session.createdAt.toLocaleString() : 'N/A'
    }));

    // C. Question Attempts Log
    const attempts = await prisma.questionAttempt.findMany({
      include: {
        student: {
          include: {
            user: true,
            class: {
              include: {
                teacher: { include: { user: true } }
              }
            }
          }
        },
        class: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const attemptRows = attempts.map(a => {
      const teacherName = a.student?.class?.teacher
        ? `${a.student.class.teacher.user.firstName} ${a.student.class.teacher.user.lastName}`.trim()
        : 'N/A';
      return {
        'Attempt ID': a.id,
        'Student Name': a.student ? `${a.student.user.firstName} ${a.student.user.lastName}`.trim() : 'N/A',
        'Student Email': a.student?.user.email || 'N/A',
        'Grade': a.grade,
        'Class': a.class ? `${a.class.name} (${a.class.section})` : 'N/A',
        'Teacher': teacherName,
        'Question ID': a.questionId,
        'Question Text': a.questionText,
        'Selected Answer': a.selectedAnswer,
        'Correct Answer': a.correctAnswer,
        'Is Correct': a.isCorrect ? 'Yes' : 'No',
        'Attempt Status': a.attemptStatus,
        'XP Earned': a.xpEarned,
        'Coins Earned': a.coinsEarned,
        'Activity/Game Type': a.activityType,
        'Date/Time': a.createdAt.toLocaleString()
      };
    });

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(studentRows), 'Student Overview');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(sessionRows), 'Classroom Session Marks');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(attemptRows), 'Question Attempts Log');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ByteQuest_Marks_Report.xlsx');
    return res.send(buf);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Download general system data output
router.get('/export/system', async (req, res) => {
  try {
    // Sheet 1: Teachers & Sheet 2: Teacher Students
    const teachers = await prisma.teacherProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: true,
        school: true,
        classes: {
          where: { isArchived: false },
          include: {
            students: {
              where: { deletedAt: null },
              include: {
                user: true,
                questionAttempts: true,
                sessionResults: true
              }
            }
          }
        }
      }
    });

    const allStudents = await prisma.studentProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: true,
        questionAttempts: true,
        sessionResults: true
      }
    });

    const sortedStudents = [...allStudents].sort((a, b) => b.xp - a.xp);

    const teacherRows: any[] = [];
    const teacherStudentRows: any[] = [];

    teachers.forEach(t => {
      const teacherStudentsList: any[] = [];
      t.classes.forEach(c => {
        c.students.forEach(s => {
          const attempted = s.questionAttempts.length;
          const correct = s.questionAttempts.filter(qa => qa.isCorrect).length;
          const wrong = attempted - correct;
          const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
          const rank = sortedStudents.findIndex(x => x.id === s.id) + 1;

          const gamesPlayed = s.matchesPlayed;
          const gamesCompleted = s.sessionResults.length;
          const wins = s.sessionResults.filter(sr => sr.rank === 1).length;
          const losses = gamesCompleted - wins;

          teacherStudentsList.push({
            'Teacher Name': `${t.user.firstName} ${t.user.lastName}`.trim(),
            'Teacher Email': t.user.email,
            'Student Name': `${s.user.firstName} ${s.user.lastName}`.trim(),
            'Student Email': s.user.email,
            'Grade': s.grade,
            'Class': `${c.name} (${c.section})`,
            'Rank': `Rank ${rank}`,
            'XP': s.xp,
            'Rewards/Coins': s.coins,
            'Games Played': gamesPlayed,
            'Games Completed': gamesCompleted,
            'Wins': wins,
            'Losses': losses,
            'Questions Attempted': attempted,
            'Correct': correct,
            'Wrong': wrong,
            'Accuracy': `${accuracy}%`,
            'Status': s.isSuspended ? 'Suspended' : 'Active'
          });
        });
      });

      teacherStudentRows.push(...teacherStudentsList);

      teacherRows.push({
        'Teacher ID': t.id,
        'Teacher Name': `${t.user.firstName} ${t.user.lastName}`.trim(),
        'Email': t.user.email,
        'Subject': t.subject || 'N/A',
        'School': t.school.name,
        'Mobile': t.mobileNumber || 'N/A',
        'Status': t.isActive ? 'Active' : 'Inactive',
        'Student Count': teacherStudentsList.length
      });
    });

    // Sheet 3: Questions Bank
    const questions = await prisma.question.findMany({
      where: { deletedAt: null }
    });
    const questionRows = questions.map(q => ({
      'Question ID': q.id,
      'Grade': q.classLevel,
      'Subject': q.subject,
      'Topic': q.topic,
      'Difficulty': q.difficulty,
      'Question Text': q.questionText,
      'Option A': q.options[0] || '',
      'Option B': q.options[1] || '',
      'Option C': q.options[2] || '',
      'Option D': q.options[3] || '',
      'Correct Answer': q.correctAnswer,
      'Explanation': q.explanation
    }));

    // Sheet 4: Classes
    const classes = await prisma.class.findMany({
      include: { teacher: { include: { user: true } } }
    });
    const classRows = classes.map(c => ({
      'Class ID': c.id,
      'Class Name': c.name,
      'Section': c.section,
      'Grade': c.grade,
      'Subject': c.subject,
      'Teacher': `${c.teacher.user.firstName} ${c.teacher.user.lastName}`.trim(),
      'Archived': c.isArchived ? 'Yes' : 'No'
    }));

    // Sheet 5: Game Sessions
    const sessions = await prisma.gameSession.findMany({
      include: { class: true }
    });
    const sessionRows = sessions.map(s => ({
      'Session ID': s.id,
      'Room Code': s.roomCode,
      'Class': s.class ? s.class.name : 'N/A',
      'Status': s.status,
      'Date Created': s.createdAt.toLocaleString()
    }));

    // Sheet 6: Question Attempts Log
    const attempts = await prisma.questionAttempt.findMany({
      include: {
        student: {
          include: {
            user: true,
            class: {
              include: {
                teacher: { include: { user: true } }
              }
            }
          }
        },
        class: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const attemptRows = attempts.map(a => {
      const teacherName = a.student?.class?.teacher
        ? `${a.student.class.teacher.user.firstName} ${a.student.class.teacher.user.lastName}`.trim()
        : 'N/A';
      return {
        'Attempt ID': a.id,
        'Student Name': a.student ? `${a.student.user.firstName} ${a.student.user.lastName}`.trim() : 'N/A',
        'Student Email': a.student?.user.email || 'N/A',
        'Grade': a.grade,
        'Class': a.class ? `${a.class.name} (${a.class.section})` : 'N/A',
        'Teacher': teacherName,
        'Question ID': a.questionId,
        'Question Text': a.questionText,
        'Selected Answer': a.selectedAnswer,
        'Correct Answer': a.correctAnswer,
        'Is Correct': a.isCorrect ? 'Yes' : 'No',
        'Attempt Status': a.attemptStatus,
        'XP Earned': a.xpEarned,
        'Coins Earned': a.coinsEarned,
        'Activity Type': a.activityType,
        'Date/Time': a.createdAt.toLocaleString()
      };
    });

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(teacherRows), 'Teachers');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(teacherStudentRows), 'Teacher Students');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(questionRows), 'Questions Bank');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(classRows), 'Classes');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(sessionRows), 'Game Sessions');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(attemptRows), 'Question Attempts Log');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ByteQuest_System_Data.xlsx');
    return res.send(buf);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/export/questions', async (req, res) => {
  const { grade, subject } = req.query;
  try {
    const whereClause: any = { deletedAt: null };
    if (grade && grade !== 'all') whereClause.classLevel = Number(grade);
    if (subject && subject !== 'all') whereClause.subject = { equals: String(subject), mode: 'insensitive' };

    const questions = await prisma.question.findMany({
      where: whereClause
    });

    const questionRows = questions.map(q => ({
      'Question ID': q.id,
      'Grade': q.classLevel,
      'Subject': q.subject,
      'Topic': q.topic,
      'Difficulty': q.difficulty,
      'Question Text': q.questionText,
      'Option A': q.options[0] || '',
      'Option B': q.options[1] || '',
      'Option C': q.options[2] || '',
      'Option D': q.options[3] || '',
      'Correct Answer': q.correctAnswer,
      'Explanation': q.explanation
    }));

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(questionRows), 'Questions Bank');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ByteQuest_Questions_${grade || 'all'}_${subject || 'all'}.xlsx`);
    return res.send(buf);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/run-production-seed', async (req, res) => {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    console.log('🌱 Programmatic database seeding request received via admin route.');
    const { stdout, stderr } = await execAsync('npx ts-node prisma/seed.ts');
    return res.json({ success: true, stdout, stderr });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/run-production-validation', async (req, res) => {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    console.log('📊 Programmatic database validation request received via admin route.');
    const { stdout, stderr } = await execAsync('npx ts-node scripts/validate-question-bank.ts');
    return res.json({ success: true, stdout, stderr });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
