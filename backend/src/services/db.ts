import { PrismaClient, Role, Difficulty, QuestionType } from '@prisma/client';
import bcrypt from 'bcrypt';

export const prisma = new PrismaClient();

// ==========================================
// DB MODEL INTERFACES
// ==========================================

export interface Teacher {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export interface DbQuestion {
  id: string;
  teacherId: string;
  grade: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DbClass {
  id: string;
  teacherId: string;
  name: string;
  grade: number;
  section?: string;
  subject?: string;
  isArchived?: boolean;
}

export interface DbStudent {
  id: string;
  classId: string;
  name: string;
}

export interface DbTeam {
  id: string;
  classId: string;
  name: string;
  color: string; // Tailwind color, e.g. bg-red-500
}

export interface DbTeamMember {
  teamId: string;
  studentId: string;
}

export interface DbSession {
  id: string;
  classId: string;
  roomCode: string;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  startedAt: string | null;
  endedAt: string | null;
}

export interface DbSessionResult {
  id: string;
  sessionId: string;
  teamId?: string;
  studentId?: string;
  position: number;
  accuracy: number;
  xp: number;
  coins: number;
  rank: number;
}

// ==========================================
// PRISMA INTEGRATED DATABASE SERVICE
// ==========================================

export class PostgresDatabase {

  // Hash helper
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ==========================================
  // GETTERS & READ QUERIES
  // ==========================================

  async getTeacherByEmail(email: string): Promise<Teacher | undefined> {
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        role: Role.TEACHER,
        deletedAt: null
      },
      include: {
        teacherProfile: true
      }
    });

    if (!user || !user.teacherProfile) return undefined;
    if (!user.teacherProfile.isActive) return undefined;

    return {
      id: user.teacherProfile.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      passwordHash: user.passwordHash
    };
  }

  async getQuestionsByTeacher(teacherId: string): Promise<DbQuestion[]> {
    const list = await prisma.question.findMany({
      where: {
        creatorId: teacherId,
        deletedAt: null
      }
    });

    return list.map(q => ({
      id: q.id,
      teacherId: q.creatorId || '',
      grade: q.classLevel,
      topic: q.topic,
      difficulty: q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
      question: q.questionText,
      options: q.options,
      correctIndex: q.options.indexOf(q.correctAnswer) !== -1 ? q.options.indexOf(q.correctAnswer) : 0,
      explanation: q.explanation
    }));
  }

  async getClassesByTeacher(teacherId: string, includeArchived = false): Promise<DbClass[]> {
    const list = await prisma.class.findMany({
      where: {
        teacherId,
        ...(includeArchived ? {} : { isArchived: false })
      }
    });

    return list.map(c => ({
      id: c.id,
      teacherId: c.teacherId,
      name: c.name,
      isArchived: c.isArchived,
      grade: c.name.includes('10') ? 10 : c.name.includes('12') ? 12 : 11
    }));
  }

  async getClassStudents(classId: string): Promise<any[]> {
    const list = await prisma.studentProfile.findMany({
      where: {
        classId,
        deletedAt: null
      },
      include: {
        user: true
      }
    });

    return list.map(s => ({
      id: s.id,
      classId: s.classId || '',
      name: `${s.user.firstName} ${s.user.lastName}`.trim(),
      email: s.user.email,
      xp: s.xp,
      coins: s.coins,
      level: s.level,
      grade: s.grade,
      minutesPlayed: s.minutesPlayed,
      isSuspended: s.isSuspended
    }));
  }

  async getClassTeams(classId: string): Promise<DbTeam[]> {
    const list = await prisma.team.findMany({
      where: {
        classId
      }
    });

    return list.map(t => ({
      id: t.id,
      classId: t.classId,
      name: t.name,
      color: t.color
    }));
  }

  async getTeamMembers(teamId: string): Promise<DbStudent[]> {
    const list = await prisma.teamMember.findMany({
      where: {
        teamId
      },
      include: {
        student: {
          include: {
            user: true
          }
        }
      }
    });

    return list.map(tm => ({
      id: tm.student.id,
      classId: tm.student.classId || '',
      name: `${tm.student.user.firstName} ${tm.student.user.lastName}`.trim()
    }));
  }

  async getSession(sessionId: string): Promise<DbSession | undefined> {
    const s = await prisma.gameSession.findUnique({
      where: {
        id: sessionId
      }
    });

    if (!s) return undefined;

    return {
      id: s.id,
      classId: s.classId || '',
      roomCode: s.roomCode,
      status: s.status as 'LOBBY' | 'PLAYING' | 'FINISHED',
      startedAt: s.createdAt ? s.createdAt.toISOString() : null,
      endedAt: s.updatedAt ? s.updatedAt.toISOString() : null
    };
  }

  async getSessionByCode(roomCode: string): Promise<DbSession | undefined> {
    const s = await prisma.gameSession.findUnique({
      where: {
        roomCode: roomCode.toUpperCase()
      }
    });

    if (!s) return undefined;

    return {
      id: s.id,
      classId: s.classId || '',
      roomCode: s.roomCode,
      status: s.status as 'LOBBY' | 'PLAYING' | 'FINISHED',
      startedAt: s.createdAt ? s.createdAt.toISOString() : null,
      endedAt: s.updatedAt ? s.updatedAt.toISOString() : null
    };
  }

  async getSessionResults(sessionId: string): Promise<DbSessionResult[]> {
    const list = await prisma.sessionResult.findMany({
      where: {
        sessionId
      }
    });

    return list.map(sr => ({
      id: sr.id,
      sessionId: sr.sessionId,
      teamId: sr.teamId || undefined,
      studentId: sr.studentId || undefined,
      position: sr.position,
      accuracy: sr.accuracy,
      xp: sr.xp,
      coins: sr.coins,
      rank: sr.rank
    }));
  }

  async getPastReportsByTeacher(teacherId: string): Promise<any[]> {
    const classes = await this.getClassesByTeacher(teacherId);
    const classIds = classes.map(c => c.id);

    // Fetch finished sessions
    const sessions = await prisma.gameSession.findMany({
      where: {
        classId: { in: classIds },
        status: 'FINISHED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const reports = [];
    for (const s of sessions) {
      const clsObj = classes.find(c => c.id === s.classId);
      const results = await this.getSessionResults(s.id);
      reports.push({
        session: {
          id: s.id,
          classId: s.classId,
          roomCode: s.roomCode,
          status: s.status,
          startedAt: s.createdAt.toISOString(),
          endedAt: s.updatedAt.toISOString()
        },
        className: clsObj ? clsObj.name : 'Unknown Class',
        results
      });
    }

    return reports;
  }

  // ==========================================
  // MUTATION WRITES
  // ==========================================

  async addQuestion(q: Omit<DbQuestion, 'id'>): Promise<DbQuestion> {
    const res = await prisma.question.create({
      data: {
        classLevel: q.grade,
        topic: q.topic,
        subtopic: "General",
        difficulty: q.difficulty.toUpperCase() as Difficulty,
        type: QuestionType.MCQ,
        title: q.topic + " MCQ",
        questionText: q.question,
        options: q.options,
        correctAnswer: q.options[q.correctIndex] || q.options[0],
        explanation: q.explanation,
        creatorId: q.teacherId,
        isApproved: true
      }
    });

    return {
      id: res.id,
      teacherId: res.creatorId || '',
      grade: res.classLevel,
      topic: res.topic,
      difficulty: res.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
      question: res.questionText,
      options: res.options,
      correctIndex: res.options.indexOf(res.correctAnswer),
      explanation: res.explanation
    };
  }

  async updateQuestion(id: string, q: Partial<DbQuestion>): Promise<boolean> {
    const updateData: any = {};
    if (q.grade !== undefined) updateData.classLevel = q.grade;
    if (q.topic !== undefined) updateData.topic = q.topic;
    if (q.difficulty !== undefined) updateData.difficulty = q.difficulty.toUpperCase();
    if (q.question !== undefined) updateData.questionText = q.question;
    if (q.options !== undefined) updateData.options = q.options;
    if (q.correctIndex !== undefined && q.options) {
      updateData.correctAnswer = q.options[q.correctIndex];
    }
    if (q.explanation !== undefined) updateData.explanation = q.explanation;

    await prisma.question.update({
      where: { id },
      data: updateData
    });

    return true;
  }

  async deleteQuestion(id: string): Promise<boolean> {
    await prisma.question.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    return true;
  }

  async addClass(teacherId: string, name: string, grade: number, section?: string, subject?: string): Promise<DbClass> {
    const res = await prisma.class.create({
      data: {
        name,
        teacherId,
        grade,
        section: section || 'A',
        subject: subject || 'Computer Science'
      }
    });

    return {
      id: res.id,
      teacherId: res.teacherId,
      name: res.name,
      grade: res.grade,
      section: res.section,
      subject: res.subject,
      isArchived: res.isArchived
    };
  }

  async addStudent(classId: string, name: string): Promise<DbStudent> {
    const email = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 6)}@student.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash('password123', 10),
        role: Role.STUDENT,
        firstName: name.split(' ')[0],
        lastName: name.split(' ')[1] || '',
        isVerified: true
      }
    });

    const res = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        classId
      }
    });

    return {
      id: res.id,
      classId: res.classId || '',
      name
    };
  }

  async createTeam(classId: string, name: string, color: string): Promise<DbTeam> {
    const res = await prisma.team.create({
      data: {
        classId,
        name,
        color
      }
    });

    return {
      id: res.id,
      classId: res.classId,
      name: res.name,
      color: res.color
    };
  }

  async setTeamMembers(teamId: string, studentIds: string[]): Promise<void> {
    // Remove existing members for this team
    await prisma.teamMember.deleteMany({
      where: { teamId }
    });

    // Create new ones
    const data = studentIds.map(studentId => ({
      teamId,
      studentId
    }));

    await prisma.teamMember.createMany({ data });
  }

  async createSession(classId: string): Promise<DbSession> {
    // Look up class to identify the grade level
    const clsObj = await prisma.class.findUnique({
      where: { id: classId }
    });
    const grade = clsObj?.name.includes('10') ? 10 : clsObj?.name.includes('12') ? 12 : 11;
    
    // Resolve pedagogical world
    const worldName = grade === 10 ? 'Isle of Basics' : grade === 11 ? 'Function Jungle' : grade === 12 ? 'Data Fortress' : 'Mixed Map';
    const world = await prisma.mapWorld.findUnique({
      where: { name: worldName }
    });

    if (!world) {
      throw new Error(`Pedagogical world map '${worldName}' not found. Verify seed script initialized.`);
    }

    // Generate unique 5-digit room code
    let roomCode = "";
    let isUnique = false;
    while (!isUnique) {
      roomCode = Math.floor(10000 + Math.random() * 90000).toString();
      const existing = await prisma.gameSession.findUnique({
        where: { roomCode }
      });
      if (!existing) isUnique = true;
    }

    const res = await prisma.gameSession.create({
      data: {
        roomCode,
        worldId: world.id, // World represents map configuration
        classId,
        status: 'LOBBY'
      }
    });

    // We store classId inside the return schema so frontend/teachers map classes to sessions
    return {
      id: res.id,
      classId, // Retain original classId for routing
      roomCode: res.roomCode,
      status: res.status as 'LOBBY' | 'PLAYING' | 'FINISHED',
      startedAt: null,
      endedAt: null
    };
  }

  async updateSessionStatus(sessionId: string, status: 'LOBBY' | 'PLAYING' | 'FINISHED'): Promise<boolean> {
    const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session) return false;

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    return true;
  }

  async saveSessionResults(sessionId: string, results: Omit<DbSessionResult, 'id' | 'sessionId'>[]): Promise<void> {
    // Delete existing
    await prisma.sessionResult.deleteMany({
      where: { sessionId }
    });

    // Save new ones
    const data = results.map(r => ({
      sessionId,
      teamId: r.teamId || null,
      studentId: r.studentId || null,
      position: r.position,
      accuracy: r.accuracy,
      xp: r.xp,
      coins: r.coins,
      rank: r.rank
    }));

    await prisma.sessionResult.createMany({ data });
  }

  async updateClass(classId: string, name: string): Promise<boolean> {
    await prisma.class.update({
      where: { id: classId },
      data: { name }
    });
    return true;
  }

  async archiveClass(classId: string, isArchived: boolean): Promise<boolean> {
    await prisma.class.update({
      where: { id: classId },
      data: { isArchived }
    });
    return true;
  }

  async deleteClass(classId: string): Promise<boolean> {
    const students = await prisma.studentProfile.findMany({
      where: { classId }
    });
    const userIds = students.map(s => s.userId);

    await prisma.class.delete({
      where: { id: classId }
    });

    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      });
    }

    return true;
  }

  async suspendStudent(studentId: string, isSuspended: boolean): Promise<boolean> {
    await prisma.studentProfile.update({
      where: { id: studentId },
      data: { isSuspended }
    });
    return true;
  }

  async removeStudentFromClass(studentId: string): Promise<boolean> {
    await prisma.studentProfile.update({
      where: { id: studentId },
      data: { classId: null }
    });
    return true;
  }

  async resetStudentProgress(studentId: string): Promise<boolean> {
    await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        xp: 0,
        coins: 0,
        level: 1
      }
    });
    return true;
  }

  async createJoinRequest(classId: string, studentName: string): Promise<any> {
    return prisma.joinRequest.create({
      data: {
        classId,
        studentName
      }
    });
  }

  async getJoinRequests(classId: string): Promise<any[]> {
    return prisma.joinRequest.findMany({
      where: {
        classId,
        status: 'PENDING'
      },
      include: {
        student: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async resolveJoinRequest(requestId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<boolean> {
    const req = await prisma.joinRequest.findUnique({
      where: { id: requestId }
    });
    if (!req) return false;

    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status }
    });

    if (status === 'ACCEPTED') {
      if (req.studentId) {
        // Class change request for an existing student
        await prisma.studentProfile.update({
          where: { id: req.studentId },
          data: { classId: req.classId }
        });
      } else {
        // Standard code join request (creates new student account)
        const nameParts = req.studentName.trim().split(' ');
        const firstName = nameParts[0] || 'Student';
        const lastName = nameParts.slice(1).join(' ') || '';
        const email = `${firstName.toLowerCase()}.${Math.floor(1000 + Math.random() * 9000)}@bytequest.student.com`;
        const passwordHash = await bcrypt.hash('student123', 10);

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

        const school = await prisma.school.findFirst();

        await prisma.studentProfile.create({
          data: {
            userId: user.id,
            schoolId: school ? school.id : null,
            classId: req.classId,
            xp: 100,
            coins: 50,
            level: 1
          }
        });
      }
    }

    return true;
  }
}

// Export single shared instance
export const db = new PostgresDatabase();
