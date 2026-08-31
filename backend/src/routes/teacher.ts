import express from 'express';
import bcrypt from 'bcrypt';
import { db, prisma } from '../services/db';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// ------------------------------------------
// TEACHER AUTHENTICATION
// ------------------------------------------
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const teacher = await db.getTeacherByEmail(email);
    if (!teacher) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await db.verifyPassword(password, teacher.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return success payload
    return res.json({
      message: 'Login successful',
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      },
      token: `token_${teacher.id}_${Date.now()}`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// TEACHER SELF SIGNUP & MANAGEMENT
// ------------------------------------------
router.post('/auth/signup', async (req, res) => {
  const { email, password, firstName, lastName, schoolName } = req.body;
  if (!email || !password || !firstName || !lastName || !schoolName) {
    return res.status(400).json({ error: 'All fields (email, password, firstName, lastName, schoolName) are required' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Resolve or create school
    const trimmedSchool = schoolName.trim();
    let school = await prisma.school.findFirst({
      where: { name: { equals: trimmedSchool, mode: 'insensitive' } }
    });
    if (!school) {
      school = await prisma.school.create({
        data: {
          name: trimmedSchool,
          district: 'Local District',
          state: 'State'
        }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'TEACHER',
        firstName,
        lastName,
        isVerified: true
      }
    });

    const teacher = await prisma.teacherProfile.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        isApproved: true,
        isActive: true
      }
    });

    return res.status(201).json({
      success: true,
      teacher: {
        id: teacher.id,
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Protect all endpoints below this line
router.use(authenticate as any);
router.use(requireRole(['TEACHER', 'ADMIN']) as any);

// GET all teachers
router.get('/management/teachers', async (req, res) => {
  try {
    const teachers = await prisma.teacherProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: true,
        school: true
      }
    });

    const mapped = teachers.map(t => ({
      id: t.id,
      userId: t.userId,
      firstName: t.user.firstName,
      lastName: t.user.lastName,
      email: t.user.email,
      subject: t.subject || '',
      mobileNumber: t.mobileNumber || '',
      schoolName: t.school.name,
      schoolId: t.schoolId,
      isActive: t.isActive
    }));

    return res.json({ success: true, teachers: mapped });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST Create Teacher by another teacher
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
        role: 'TEACHER',
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

    return res.status(201).json({ success: true, teacher });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT Edit Teacher Details
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
    if (schoolName) {
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

    await prisma.user.update({
      where: { id: teacher.userId },
      data: {
        firstName,
        lastName,
        email
      }
    });

    const updatedProfile = await prisma.teacherProfile.update({
      where: { id },
      data: {
        schoolId: targetSchoolId || undefined,
        subject,
        mobileNumber
      }
    });

    return res.json({ success: true, teacher: updatedProfile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST Enable/Disable Teacher
router.post('/management/teachers/:id/toggle-active', async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  try {
    const updated = await prisma.teacherProfile.update({
      where: { id },
      data: { isActive: Boolean(isActive) }
    });
    return res.json({ success: true, isActive: updated.isActive });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST Reset Teacher Password
router.post('/management/teachers/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  try {
    const teacher = await prisma.teacherProfile.findUnique({ where: { id } });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: teacher.userId },
      data: { passwordHash }
    });

    return res.json({ success: true, message: 'Password reset successful' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE Soft Delete Teacher
router.delete('/management/teachers/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.teacherProfile.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    return res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// QUESTIONS CRUD
// ------------------------------------------
router.get('/questions', async (req, res) => {
  const teacherId = req.query.teacherId as string || 'teacher_001';
  try {
    const questions = await db.getQuestionsByTeacher(teacherId);
    const totalCount = await prisma.question.count({
      where: { deletedAt: null }
    });
    return res.json({ questions, totalCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/questions', async (req, res) => {
  const { teacherId, grade, topic, subject, difficulty, question, options, correctIndex, explanation } = req.body;
  
  if (!grade || !topic || !difficulty || !question || !options || correctIndex === undefined) {
    return res.status(400).json({ error: 'Missing required question fields' });
  }

  try {
    const newQ = await db.addQuestion({
      teacherId: teacherId || 'teacher_001',
      grade: Number(grade),
      topic,
      subject: subject || 'Computer Science',
      difficulty,
      question,
      options,
      correctIndex: Number(correctIndex),
      explanation: explanation || ''
    });
    return res.status(201).json({ message: 'Question created', question: newQ });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/questions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await db.updateQuestion(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json({ message: 'Question updated' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/questions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await db.deleteQuestion(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json({ message: 'Question deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// CSV Bulk Import
router.post('/questions/import', async (req, res) => {
  const { csvText, teacherId, subject } = req.body;
  if (!csvText) {
    return res.status(400).json({ error: 'Missing CSV text data' });
  }

  try {
    const lines = csvText.split('\n');
    const importedQs = [];
    let lineIdx = 0;

    for (let line of lines) {
      lineIdx++;
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const parts = trimmed.split(';'); // Using semicolon separator for robust parsing of text containing commas
      if (parts.length < 9) {
        // Fallback to comma
        const commaParts = trimmed.split(',');
        if (commaParts.length < 9) {
          console.warn(`Line ${lineIdx} skipped: insufficient columns`);
          continue;
        }
        // Map comma parts
        const grade = Number(commaParts[0]);
        const topic = commaParts[1];
        const difficulty = commaParts[2] as any;
        const questionText = commaParts[3];
        const options = [commaParts[4], commaParts[5], commaParts[6], commaParts[7]];
        const correctIndex = Number(commaParts[8]);
        const explanation = commaParts[9] || '';

        const resolvedSubject = subject || (grade <= 10 ? 'Mathematics' : 'Computer Science');
        const finalSub = (grade <= 10 && resolvedSubject === 'Computer Science') ? 'Mathematics' : resolvedSubject;

        const newQ = await db.addQuestion({
          teacherId: teacherId || 'teacher_001',
          grade,
          topic,
          subject: finalSub,
          difficulty,
          question: questionText,
          options,
          correctIndex,
          explanation
        });
        importedQs.push(newQ);
        continue;
      }

      const grade = Number(parts[0]);
      const topic = parts[1];
      const difficulty = parts[2] as any;
      const questionText = parts[3];
      const options = [parts[4], parts[5], parts[6], parts[7]];
      const correctIndex = Number(parts[8]);
      const explanation = parts[9] || '';

      const resolvedSubject = subject || (grade <= 10 ? 'Mathematics' : 'Computer Science');
      const finalSub = (grade <= 10 && resolvedSubject === 'Computer Science') ? 'Mathematics' : resolvedSubject;

      const newQ = await db.addQuestion({
        teacherId: teacherId || 'teacher_001',
        grade,
        topic,
        subject: finalSub,
        difficulty,
        question: questionText,
        options,
        correctIndex,
        explanation
      });
      importedQs.push(newQ);
    }

    return res.json({ message: `Successfully imported ${importedQs.length} questions.`, questions: importedQs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// CLASSES & ROSTER CRUD
// ------------------------------------------
router.get('/classes', async (req, res) => {
  const teacherId = req.query.teacherId as string || 'teacher_001';
  
  try {
    const classes = await db.getClassesByTeacher(teacherId, true); // Get all (active + archived)
    const detailedClasses = await Promise.all(classes.map(async (c) => {
      const students = await db.getClassStudents(c.id);
      const rawTeams = await db.getClassTeams(c.id);
      const teams = await Promise.all(rawTeams.map(async (t) => {
        const members = await db.getTeamMembers(t.id);
        return { ...t, members };
      }));
      const joinCode = `BQ${c.id.replace(/-/g, '').substring(0, 4).toUpperCase()}`;
      return { ...c, students, teams, joinCode };
    }));

    return res.json({ classes: detailedClasses });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/classes', async (req, res) => {
  const { teacherId, name, grade, section, subject } = req.body;
  if (!name || !grade) {
    return res.status(400).json({ error: 'Class name and grade are required' });
  }

  try {
    const newCls = await db.addClass(teacherId || 'teacher_001', name, Number(grade), section, subject);
    const joinCode = `BQ${newCls.id.replace(/-/g, '').substring(0, 4).toUpperCase()}`;
    return res.status(201).json({ message: 'Class created', class: { ...newCls, joinCode } });
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
        const bcrypt = require('bcrypt');
        const defaultHash = await bcrypt.hash('student123', 10);
        const email = `${studentProfile.user.firstName.toLowerCase()}.${Math.floor(1000 + Math.random() * 9000)}@bytequest.student.com`;
        
        const newUser = await prisma.user.create({
          data: {
            email,
            passwordHash: defaultHash,
            role: 'STUDENT',
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

    return res.json({ success: true, class: duplicated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/classes/:id/students', async (req, res) => {
  const { id } = req.params;
  const { names } = req.body; // Array of names
  if (!names || !Array.isArray(names)) {
    return res.status(400).json({ error: 'Names must be an array of student names' });
  }

  try {
    const added = [];
    for (let name of names) {
      if (name.trim()) {
        const student = await db.addStudent(id, name.trim());
        added.push(student);
      }
    }
    return res.status(201).json({ message: `Added ${added.length} students`, students: added });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/classes/:id/teams', async (req, res) => {
  const { id } = req.params; // Class ID
  const { teams } = req.body; // Array of { name, color, studentIds[] }
  
  if (!teams || !Array.isArray(teams)) {
    return res.status(400).json({ error: 'Teams configuration payload is required' });
  }

  try {
    // Delete existing teams for this class
    await prisma.team.deleteMany({
      where: { classId: id }
    });
    
    // Create new teams
    const createdTeams = [];
    for (let tData of teams) {
      const team = await db.createTeam(id, tData.name, tData.color);
      await db.setTeamMembers(team.id, tData.studentIds || []);
      const members = await db.getTeamMembers(team.id);
      createdTeams.push({
        ...team,
        members
      });
    }

    return res.status(201).json({ message: 'Teams configured successfully', teams: createdTeams });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// SESSION SENSORS & REPORTS
// ------------------------------------------
router.post('/sessions', async (req, res) => {
  const { classId } = req.body;
  if (!classId) {
    return res.status(400).json({ error: 'Class ID is required to start a session' });
  }

  try {
    const session = await db.createSession(classId);
    return res.json({ session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/reports', async (req, res) => {
  const teacherId = req.query.teacherId as string || 'teacher_001';
  try {
    const reports = await db.getPastReportsByTeacher(teacherId);
    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sessions/:id/report', async (req, res) => {
  const { id } = req.params;
  try {
    const session = await db.getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const cls = await prisma.class.findUnique({
      where: { id: session.classId }
    });
    const results = await db.getSessionResults(id);
    
    return res.json({
      session,
      className: cls ? cls.name : 'Unknown Class',
      results
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sessions/code/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const session = await db.getSessionByCode(code);
    if (!session) {
      return res.status(404).json({ error: 'Session room not found' });
    }

    const cls = await prisma.class.findUnique({
      where: { id: session.classId }
    });
    const students = await db.getClassStudents(session.classId);
    const rawTeams = await db.getClassTeams(session.classId);
    const teams = await Promise.all(rawTeams.map(async (t) => {
      const members = await db.getTeamMembers(t.id);
      return { ...t, members };
    }));

    return res.json({
      session,
      className: cls ? cls.name : 'Unknown Class',
      grade: cls ? (cls.name.includes('10') ? 10 : cls.name.includes('12') ? 12 : 11) : 11,
      students,
      teams
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// STUDENT COMPLEMENTARY PORTAL ENDPOINTS
// ------------------------------------------

// Public list of active classes for students to pick and join
router.get('/classes/list', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { isArchived: false },
      select: { id: true, name: true }
    });
    return res.json({ classes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Student submits a request to join a class
router.post('/requests/join', async (req, res) => {
  const { classId, studentName } = req.body;
  if (!classId || !studentName) {
    return res.status(400).json({ error: 'Class ID and student name are required' });
  }
  try {
    const reqObj = await db.createJoinRequest(classId, studentName);
    return res.status(201).json({ message: 'Join request submitted', request: reqObj });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Student stats and details loader
router.get('/students/profile/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        class: true,
        sessionResults: true
      }
    });
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const level = Math.floor(student.xp / 500) + 1;
    const totalAns = student.sessionResults.reduce((acc, r) => acc + 10, 0);
    const correctAns = student.sessionResults.reduce((acc, r) => acc + Math.round(r.accuracy * 10), 0);
    const accuracy = totalAns > 0 ? (correctAns / totalAns) : 0.8;

    return res.json({
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`.trim(),
        email: student.user.email,
        classId: student.classId,
        className: student.class ? student.class.name : 'Unassigned',
        xp: student.xp,
        coins: student.coins,
        level,
        isSuspended: student.isSuspended,
        accuracy
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// CLASS MANAGEMENT (CRUD)
// ------------------------------------------

router.put('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Class name is required' });
  }
  try {
    await db.updateClass(id, name);
    return res.json({ message: 'Class name updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/classes/:id/archive', async (req, res) => {
  const { id } = req.params;
  const { isArchived } = req.body;
  try {
    await db.archiveClass(id, isArchived === true);
    return res.json({ message: isArchived ? 'Class archived successfully' : 'Class unarchived successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/classes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.deleteClass(id);
    return res.json({ message: 'Class deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// JOIN REQUESTS APPROVALS
// ------------------------------------------

router.get('/requests', async (req, res) => {
  const teacherId = req.query.teacherId as string || 'teacher_001';
  try {
    const classes = await db.getClassesByTeacher(teacherId, true);
    const requestsList = [];
    for (let c of classes) {
      const reqs = await db.getJoinRequests(c.id);
      for (let r of reqs) {
        requestsList.push({
          id: r.id,
          classId: r.classId,
          className: c.name,
          studentName: r.studentName,
          studentGrade: r.student?.grade || 11,
          createdAt: r.createdAt
        });
      }
    }
    return res.json({ requests: requestsList });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/requests/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  if (!action || (action !== 'ACCEPT' && action !== 'REJECT')) {
    return res.status(400).json({ error: 'Action must be ACCEPT or REJECT' });
  }
  try {
    const success = await db.resolveJoinRequest(id, action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED');
    if (!success) {
      return res.status(404).json({ error: 'Request not found' });
    }
    return res.json({ message: `Request successfully ${action.toLowerCase()}ed` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------
// STUDENT PROFILE CRUD
// ------------------------------------------

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

    const bcrypt = require('bcrypt');
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
        role: 'STUDENT',
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
        coins: 0,
        level: 1
      },
      include: { user: true }
    });

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
  const { name, email, classId, password } = req.body;

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const userUpdates: any = {};
    if (name) {
      const nameParts = name.trim().split(' ');
      userUpdates.firstName = nameParts[0] || 'Student';
      userUpdates.lastName = nameParts.slice(1).join(' ') || '';
    }
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email: email.trim(), id: { not: student.userId } }
      });
      if (existing) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      userUpdates.email = email.trim();
    }
    if (password) {
      const bcrypt = require('bcrypt');
      userUpdates.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: student.userId },
        data: userUpdates
      });
    }

    if (classId) {
      await prisma.studentProfile.update({
        where: { id },
        data: { classId }
      });
    }

    const updated = await prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true }
    });

    return res.json({
      success: true,
      student: {
        id: updated!.id,
        name: `${updated!.user.firstName} ${updated!.user.lastName}`.trim(),
        email: updated!.user.email,
        classId: updated!.classId
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/students/:id/suspend', async (req, res) => {
  const { id } = req.params;
  try {
    await db.suspendStudent(id, true);
    return res.json({ message: 'Student profile suspended successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/students/:id/unsuspend', async (req, res) => {
  const { id } = req.params;
  try {
    await db.suspendStudent(id, false);
    return res.json({ message: 'Student profile unsuspended successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/students/:id/reset', async (req, res) => {
  const { id } = req.params;
  try {
    await db.resetStudentProgress(id);
    return res.json({ message: 'Student progress reset successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.removeStudentFromClass(id);
    return res.json({ message: 'Student removed from roster successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});




// GET teacher profile
router.get('/profile', async (req, res) => {
  const { teacherId } = req.query;
  if (!teacherId) return res.status(400).json({ error: 'teacherId required' });
  try {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: String(teacherId) },
      include: { user: true, school: true }
    });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    return res.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: `${teacher.user.firstName} ${teacher.user.lastName}`,
        firstName: teacher.user.firstName,
        lastName: teacher.user.lastName,
        email: teacher.user.email,
        subject: (teacher as any).subject || '',
        schoolName: teacher.school?.name || '',
        schoolId: teacher.schoolId
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update teacher profile
router.put('/profile/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, schoolName, currentPassword, newPassword } = req.body;
  try {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const userUpdates: any = {};
    if (firstName) userUpdates.firstName = firstName.trim();
    if (lastName) userUpdates.lastName = lastName.trim();
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: { email: email.trim(), id: { not: teacher.userId } }
      });
      if (existingUser) return res.status(400).json({ error: 'Email is already in use' });
      userUpdates.email = email.trim();
    }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const bcrypt = require('bcrypt');
      const match = await bcrypt.compare(currentPassword, teacher.user.passwordHash);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      userUpdates.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({ where: { id: teacher.userId }, data: userUpdates });
    }

    if (schoolName) {
      let school = await prisma.school.findFirst({
        where: { name: schoolName.trim() }
      });
      if (!school) {
        school = await prisma.school.create({
          data: {
            name: schoolName.trim(),
            district: 'Local District',
            state: 'State'
          }
        });
      }
      await prisma.teacherProfile.update({
        where: { id },
        data: { schoolId: school.id }
      });
    }

    const updated = await prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: true, school: true }
    });
    return res.json({
      success: true,
      teacher: {
        id: updated!.id,
        name: `${updated!.user.firstName} ${updated!.user.lastName}`,
        firstName: updated!.user.firstName,
        lastName: updated!.user.lastName,
        email: updated!.user.email,
        schoolName: updated!.school?.name || ''
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST duplicate a question
router.post('/questions/:id/duplicate', async (req, res) => {
  const { id } = req.params;
  const { teacherId } = req.body;
  try {
    const original = await prisma.question.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ error: 'Question not found' });
    const dup = await prisma.question.create({
      data: {
        creatorId: teacherId || original.creatorId,
        classLevel: original.classLevel,
        topic: original.topic + ' (Copy)',
        subtopic: original.subtopic,
        title: original.title ? original.title + ' (Copy)' : '',
        difficulty: original.difficulty,
        questionText: original.questionText,
        options: original.options,
        correctAnswer: original.correctAnswer,
        explanation: original.explanation,
        type: original.type
      }
    });
    return res.status(201).json({ success: true, question: dup });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

