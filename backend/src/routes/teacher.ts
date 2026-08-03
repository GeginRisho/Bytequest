import express from 'express';
import { db, prisma } from '../services/db';

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
// QUESTIONS CRUD
// ------------------------------------------
router.get('/questions', async (req, res) => {
  const teacherId = req.query.teacherId as string || 'teacher_001';
  try {
    const questions = await db.getQuestionsByTeacher(teacherId);
    return res.json({ questions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/questions', async (req, res) => {
  const { teacherId, grade, topic, difficulty, question, options, correctIndex, explanation } = req.body;
  
  if (!grade || !topic || !difficulty || !question || !options || correctIndex === undefined) {
    return res.status(400).json({ error: 'Missing required question fields' });
  }

  try {
    const newQ = await db.addQuestion({
      teacherId: teacherId || 'teacher_001',
      grade: Number(grade),
      topic,
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
  const { csvText, teacherId } = req.body;
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

        const newQ = await db.addQuestion({
          teacherId: teacherId || 'teacher_001',
          grade,
          topic,
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

      const newQ = await db.addQuestion({
        teacherId: teacherId || 'teacher_001',
        grade,
        topic,
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
    const classes = await db.getClassesByTeacher(teacherId);
    const detailedClasses = await Promise.all(classes.map(async (c) => {
      const students = await db.getClassStudents(c.id);
      const rawTeams = await db.getClassTeams(c.id);
      const teams = await Promise.all(rawTeams.map(async (t) => {
        const members = await db.getTeamMembers(t.id);
        return { ...t, members };
      }));
      return { ...c, students, teams };
    }));

    return res.json({ classes: detailedClasses });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/classes', async (req, res) => {
  const { teacherId, name, grade } = req.body;
  if (!name || !grade) {
    return res.status(400).json({ error: 'Class name and grade are required' });
  }

  try {
    const newCls = await db.addClass(teacherId || 'teacher_001', name, Number(grade));
    return res.status(201).json({ message: 'Class created', class: newCls });
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

export default router;
