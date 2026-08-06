import { Server, Socket } from 'socket.io';
import logger from '../config/logger';
import { db } from './db';
import { prisma } from '../config/db';

interface StudentPlayer {
  id: string;
  name: string;
  socketId: string | null;
}

interface TeamState {
  id: string;
  name: string;
  color: string;
  position: number; // 0 to 17
  coins: number;
  xp: number;
  streak: number;
  members: StudentPlayer[];
  activeMemberIdx: number;
  skipNextTurn: boolean;
}

interface LiveRoom {
  sessionId: string;
  roomCode: string;
  classId: string;
  grade: number | 'mixed';
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  teams: TeamState[];
  activeTeamIdx: number;
  currentRoll: number | null;
  activeQuestion: any | null;
  questionTimer: any | null;
  timerRemaining: number;
  askedQuestionIds: string[];
  wasInLastPlace: Record<string, boolean>; // teamId -> wasInLast
  // Per student analytics for reports
  studentStats: Record<string, {
    correct: number;
    total: number;
    timeSpent: number;
  }>;
  isFirstQuestion?: boolean;
  pendingRetryQuestion?: any | null;
}

export class SocketService {
  private io: Server;
  // In-memory active game rooms
  private activeRooms: Map<string, LiveRoom> = new Map(); // roomCode -> LiveRoom

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      }
    });

    logger.info('🛰️ Classroom Socket.io engine initialized.');
    this.initSocketEvents();
  }

  private initSocketEvents() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`🔌 Connection established: ${socket.id}`);

      // Teacher room registration
      socket.on('teacher:join', (payload: { roomCode: string }) => {
        const { roomCode } = payload;
        socket.join(roomCode);
        logger.info(`🏫 Teacher joined room: ${roomCode}`);
        this.sendRoomUpdate(roomCode);
      });

      // Student join lobby
      socket.on('student:join', (payload: { roomCode: string; studentId: string }) => {
        this.handleStudentJoin(socket, payload);
      });

      // Teacher triggers game start
      socket.on('teacher:start_game', (payload: { roomCode: string }) => {
        this.handleStartGame(payload.roomCode);
      });

      // Active player rolls dice
      socket.on('student:roll', (payload: { roomCode: string; studentId: string }) => {
        this.handleDiceRoll(payload.roomCode, payload.studentId);
      });

      // Active player submits answer
      socket.on('student:answer', (payload: { roomCode: string; studentId: string; answerIndex: number; timeSpent: number }) => {
        this.handleAnswerSubmit(payload.roomCode, payload.studentId, payload.answerIndex, payload.timeSpent);
      });

      // Student re-connection hook
      socket.on('student:reconnect', (payload: { roomCode: string; studentId: string }) => {
        this.handleStudentReconnect(socket, payload);
      });

      // Student creates practice room
      socket.on('student:create_practice', (payload: { studentId: string; studentName: string }) => {
        this.handleCreatePracticeRoom(socket, payload);
      });

      // Student joins practice room
      socket.on('student:join_practice', (payload: { roomCode: string; studentId: string; studentName: string }) => {
        this.handleJoinPracticeRoom(socket, payload);
      });

      // Student starts practice game
      socket.on('student:start_practice', (payload: { roomCode: string }) => {
        this.handleStartGame(payload.roomCode);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // ==========================================
  // LOBBY & JOIN HANDLERS
  // ==========================================

  private async handleStudentJoin(socket: Socket, payload: { roomCode: string; studentId: string }) {
    const { roomCode, studentId } = payload;
    
    try {
      const session = await db.getSessionByCode(roomCode);
      
      if (!session || session.status === 'FINISHED') {
        socket.emit('error', { message: 'Active game room not found' });
        return;
      }

      // Initialize live room if not present in memory
      if (!this.activeRooms.has(roomCode)) {
        const cls = await prisma.class.findUnique({
          where: { id: session.classId }
        });
        const dbSession = await prisma.gameSession.findUnique({
          where: { id: session.id }
        });
        const world = dbSession ? await prisma.mapWorld.findUnique({
          where: { id: dbSession.worldId }
        }) : null;
        const isMixed = world?.name === 'Mixed Map';
        const grade = isMixed ? 'mixed' : (cls ? (cls.name.includes('10') ? 10 : cls.name.includes('12') ? 12 : 11) : 11);
        
        const dbTeams = await db.getClassTeams(session.classId);
        const roomTeams: TeamState[] = await Promise.all(dbTeams.map(async (t) => {
          const rawMembers = await db.getTeamMembers(t.id);
          const members = rawMembers.map(m => ({
            id: m.id,
            name: m.name,
            socketId: null
          }));
          return {
            id: t.id,
            name: t.name,
            color: t.color,
            position: 0,
            coins: 10,
            xp: 0,
            streak: 0,
            members,
            activeMemberIdx: 0,
            skipNextTurn: false
          };
        }));

        this.activeRooms.set(roomCode, {
          sessionId: session.id,
          roomCode,
          classId: session.classId,
          grade,
          status: session.status,
          teams: roomTeams,
          activeTeamIdx: 0,
          currentRoll: null,
          activeQuestion: null,
          questionTimer: null,
          timerRemaining: 20,
          askedQuestionIds: [],
          wasInLastPlace: {},
          studentStats: {},
          isFirstQuestion: true,
          pendingRetryQuestion: null
        });
      }

      const room = this.activeRooms.get(roomCode)!;
      
      // Bind socket to student and join room channel
      let studentFound = false;
      room.teams.forEach(team => {
        team.members.forEach(member => {
          if (member.id === studentId) {
            member.socketId = socket.id;
            studentFound = true;
          }
        });
      });

      if (!studentFound) {
        socket.emit('error', { message: 'Student name is not registered in this class roster' });
        return;
      }

      socket.join(roomCode);
      (socket as any).roomCode = roomCode;
      (socket as any).studentId = studentId;

      logger.info(`👨‍🎓 Student joined: ${studentId} in Room: ${roomCode}`);
      this.sendRoomUpdate(roomCode);
    } catch (err: any) {
      socket.emit('error', { message: 'Server connection error during login' });
    }
  }

  private handleStudentReconnect(socket: Socket, payload: { roomCode: string; studentId: string }) {
    const { roomCode, studentId } = payload;
    const room = this.activeRooms.get(roomCode);
    if (!room) return;

    room.teams.forEach(team => {
      team.members.forEach(member => {
        if (member.id === studentId) {
          member.socketId = socket.id;
        }
      });
    });

    socket.join(roomCode);
    (socket as any).roomCode = roomCode;
    (socket as any).studentId = studentId;

    logger.info(`🔄 Student reconnected: ${studentId} in Room: ${roomCode}`);
    this.sendRoomUpdate(roomCode);
  }

  // ==========================================
  // PLAYPLAY ROUTINES
  // ==========================================

  private async handleStartGame(roomCode: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room || room.status !== 'LOBBY') return;

    room.status = 'PLAYING';
    await db.updateSessionStatus(room.sessionId, 'PLAYING');

    logger.info(`🚀 Starting Classroom Match for Room Code: ${roomCode}`);
    this.sendRoomUpdate(roomCode);
  }

  private async handleDiceRoll(roomCode: string, studentId: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room || room.status !== 'PLAYING' || room.activeQuestion) return;

    const activeTeam = room.teams[room.activeTeamIdx];
    const activeTeammate = activeTeam.members[activeTeam.activeMemberIdx];

    if (activeTeammate.id !== studentId) {
      logger.warn(`Rejected roll request. Current turn belongs to ${activeTeammate.name}`);
      return;
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    room.currentRoll = roll;

    if (activeTeam.position + roll > 17) {
      this.io.to(roomCode).emit('game:dice_rolled', { 
        roll, 
        teamId: activeTeam.id
      });
      this.io.to(roomCode).emit('game:log', { message: `🎲 ${activeTeam.name} rolled ${roll}! Too high to finish (Stay on tile ${activeTeam.position}).` });
      setTimeout(() => {
        this.rotateTurn(roomCode);
      }, 2200);
      return;
    }

    // FIXED: Do NOT move the team yet — position only updates after correct answer
    // Broadcast roll event WITHOUT position change
    this.io.to(roomCode).emit('game:dice_rolled', { 
      roll, 
      teamId: activeTeam.id
    });

    // Dispatch question immediately (no movement animation needed before question)
    setTimeout(async () => {
      await this.dispatchQuestion(roomCode);
    }, 800);
  }

  private async dispatchQuestion(roomCode: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room) return;

    try {
      // Retrying logic first!
      if (room.pendingRetryQuestion) {
        const q = room.pendingRetryQuestion;
        room.pendingRetryQuestion = null; // Clear it immediately
        room.activeQuestion = q;
        room.timerRemaining = 20;

        // Emit question to the room
        this.io.to(roomCode).emit('game:question_pushed', {
          question: q,
          timerRemaining: 20
        });

        // Start countdown
        if (room.questionTimer) clearInterval(room.questionTimer);
        room.questionTimer = setInterval(() => {
          room.timerRemaining--;
          if (room.timerRemaining <= 0) {
            clearInterval(room.questionTimer);
            room.questionTimer = null;
            this.handleAnswerSubmit(roomCode, '', -1, 20); // Time out
          }
        }, 1000);
        return;
      }

      let teacherQs;
      if (room.classId) {
        const cls = await prisma.class.findUnique({
          where: { id: room.classId }
        });
        const teacherId = cls ? cls.teacherId : '';
        teacherQs = await db.getQuestionsByTeacher(teacherId);
      } else {
        const list = await prisma.question.findMany({
          where: { deletedAt: null }
        });
        teacherQs = list.map(q => ({
          id: q.id,
          teacherId: q.creatorId || 'admin',
          grade: q.classLevel,
          topic: q.topic,
          difficulty: q.difficulty.toLowerCase() as any,
          question: q.questionText,
          options: q.options,
          correctIndex: q.options.indexOf(q.correctAnswer) !== -1 ? q.options.indexOf(q.correctAnswer) : 0,
          explanation: q.explanation
        }));
      }

      const activeTeam = room.teams[room.activeTeamIdx];
      // Boss tile: positions 8 and 16 (after roll will land near those)
      const targetPosition = Math.min(17, activeTeam.position + (room.currentRoll || 1));
      const isOnBossTile = targetPosition === 8 || targetPosition === 16;

      let pool = teacherQs;
      if (room.grade !== 'mixed') {
        pool = teacherQs.filter(q => q.grade === room.grade);
        if (pool.length === 0) pool = teacherQs; // fallback if no grade match
      }

      // Streak-based difficulty progression
      if (room.isFirstQuestion) {
        room.isFirstQuestion = false;
        const easyPool = pool.filter(q => q.difficulty === 'easy');
        if (easyPool.length > 0) pool = easyPool;
      } else if (isOnBossTile) {
        // Boss tile always forces hard
        const hardPool = pool.filter(q => q.difficulty === 'hard');
        if (hardPool.length > 0) pool = hardPool;
      } else {
        // Scale difficulty based on current team's answer streak
        const streak = activeTeam.streak;
        let targetDiff: string;
        if (streak >= 6) {
          targetDiff = 'hard';
        } else if (streak >= 3) {
          targetDiff = 'medium';
        } else {
          targetDiff = 'easy';
        }
        const diffPool = pool.filter(q => q.difficulty === targetDiff);
        if (diffPool.length > 0) pool = diffPool;
        // else fall through to full pool
      }

      if (pool.length === 0) pool = teacherQs;

      // Avoid repeats
      let unasked = pool.filter(q => !room.askedQuestionIds.includes(q.id));
      if (unasked.length === 0) {
        unasked = pool;
        room.askedQuestionIds = [];
      }

      const q = unasked[Math.floor(Math.random() * unasked.length)] || pool[0];
      room.askedQuestionIds.push(q.id);
      room.activeQuestion = q;
      room.timerRemaining = 20;

      // Emit question to the room
      this.io.to(roomCode).emit('game:question_pushed', {
        question: q,
        timerRemaining: 20
      });

      // Start countdown
      if (room.questionTimer) clearInterval(room.questionTimer);
      room.questionTimer = setInterval(() => {
        room.timerRemaining--;
        if (room.timerRemaining <= 0) {
          clearInterval(room.questionTimer);
          room.questionTimer = null;
          this.handleAnswerSubmit(roomCode, '', -1, 20); // Time out
        }
      }, 1000);
    } catch (err: any) {
      logger.error('Error dispatching question in room: ' + roomCode, err);
    }
  }

  private async handleAnswerSubmit(roomCode: string, studentId: string, answerIndex: number, timeSpent: number) {
    const room = this.activeRooms.get(roomCode);
    if (!room || !room.activeQuestion) return;

    if (room.questionTimer) {
      clearInterval(room.questionTimer);
      room.questionTimer = null;
    }

    const q = room.activeQuestion;
    room.activeQuestion = null;

    const isCorrect = answerIndex === q.correctIndex;
    const activeTeam = room.teams[room.activeTeamIdx];
    const activeTeammate = activeTeam.members[activeTeam.activeMemberIdx];

    if (studentId) {
      if (!room.studentStats[studentId]) {
        room.studentStats[studentId] = { correct: 0, total: 0, timeSpent: 0 };
      }
      room.studentStats[studentId].total++;
      room.studentStats[studentId].timeSpent += timeSpent;
      if (isCorrect) room.studentStats[studentId].correct++;
    }

    const roll = room.currentRoll || 1;
    let tileText = '';
    let captureText = '';
    let newPosition = activeTeam.position; // default: no movement

    if (isCorrect) {
      room.pendingRetryQuestion = null; // Clear on correct answer!
      activeTeam.streak++;

      // FIXED: Only move forward on correct answer
      newPosition = Math.min(17, activeTeam.position + roll);
      activeTeam.position = newPosition;

      const isOnBossTile = activeTeam.position === 8 || activeTeam.position === 16;
      if (isOnBossTile) {
        activeTeam.xp += 50;
        activeTeam.coins += 15;
      } else {
        activeTeam.xp += 15;
        activeTeam.coins += 5;
      }

      if (activeTeam.streak === 3) {
        activeTeam.coins += 5;
      }
      if (activeTeam.streak % 3 === 0 && activeTeam.streak > 0) {
        activeTeam.coins += 3; // bonus every 3-streak
      }



      if ([4, 10, 15].includes(activeTeam.position)) {
        activeTeam.xp += 10;
        activeTeam.coins += 15;
        tileText = `🎁 Opened a Treasure! (+15 Coins, +10 XP)`;
      } else if ([2, 6, 12].includes(activeTeam.position)) {
        const isMoveBack = Math.random() < 0.5;
        if (isMoveBack) {
          activeTeam.position = Math.max(0, activeTeam.position - 2);
          newPosition = activeTeam.position;
          tileText = `🕸️ Sprung a Trap! Slipped back 2 spaces.`;
        } else {
          activeTeam.skipNextTurn = true;
          tileText = `🚫 Sprung a Trap! Next turn will be skipped.`;
        }
      }
    } else {
      // FIXED: Wrong answer = NO movement at all. Player stays in place.
      activeTeam.streak = 0;
      newPosition = activeTeam.position; // stays
      room.pendingRetryQuestion = q; // Save for spaced repetition retry!
    }

    let combinedLogs = [];
    if (captureText) combinedLogs.push(captureText);
    if (tileText) combinedLogs.push(tileText);
    const resultLog = combinedLogs.join(' | ');

    if (activeTeam.position >= 17) {
      room.status = 'FINISHED';
      if (room.classId) {
        await db.updateSessionStatus(room.sessionId, 'FINISHED');
        const dbResults = room.teams.map((t, idx) => {
          let teamCorrect = 0;
          let teamTotal = 0;
          t.members.forEach(m => {
            const stats = room.studentStats[m.id];
            if (stats) {
              teamCorrect += stats.correct;
              teamTotal += stats.total;
            }
          });
          const teamAccuracy = teamTotal > 0 ? (teamCorrect / teamTotal) * 100 : 0;
          return {
            teamId: t.id,
            position: t.position,
            accuracy: teamAccuracy,
            xp: t.xp,
            coins: t.coins,
            rank: idx + 1
          };
        });
        dbResults.sort((a, b) => b.position - a.position || b.xp - a.xp);
        dbResults.forEach((res, rankIdx) => {
          res.rank = rankIdx + 1;
        });
        await db.saveSessionResults(room.sessionId, dbResults);
      }
      this.io.to(roomCode).emit('game:victory', { winner: activeTeam, teams: room.teams });
      this.sendRoomUpdate(roomCode);
      return;
    }

    this.io.to(roomCode).emit('game:answer_result', {
      isCorrect,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      newPosition,           // new position after correct move (or same position if wrong)
      captureText: resultLog,
      playerName: activeTeammate.name,
      teamName: activeTeam.name,
      hasRetryQuestion: !isCorrect // tell client to show retry toast
    });

    setTimeout(() => {
      this.rotateTurn(roomCode);
    }, 3800);
  }

  private rotateTurn(roomCode: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room || room.status !== 'PLAYING') return;

    // Rotate within team members
    const activeTeam = room.teams[room.activeTeamIdx];
    activeTeam.activeMemberIdx = (activeTeam.activeMemberIdx + 1) % activeTeam.members.length;

    // Pass turn to next team
    let nextTeamIdx = (room.activeTeamIdx + 1) % room.teams.length;
    let nextTeam = room.teams[nextTeamIdx];

    if (nextTeam.skipNextTurn) {
      nextTeam.skipNextTurn = false;
      this.io.to(roomCode).emit('game:log', { message: `🚫 ${nextTeam.name}'s turn is skipped!` });
      nextTeamIdx = (nextTeamIdx + 1) % room.teams.length;
    }

    room.activeTeamIdx = nextTeamIdx;
    room.currentRoll = null;

    logger.info(`🔄 Turn rotated to team: ${room.teams[nextTeamIdx].name}`);
    this.sendRoomUpdate(roomCode);
  }

  private handleCreatePracticeRoom(socket: Socket, payload: { studentId: string; studentName: string }) {
    const { studentId, studentName } = payload;
    const roomCode = 'BQ' + Math.floor(1000 + Math.random() * 9000);

    const room: LiveRoom = {
      sessionId: `practice_${roomCode}`,
      roomCode,
      classId: '',
      grade: 'mixed',
      status: 'LOBBY',
      teams: [{
        id: studentId,
        name: studentName,
        color: 'bg-rose-500 text-white border-rose-300',
        position: 0,
        coins: 10,
        xp: 0,
        streak: 0,
        members: [{ id: studentId, name: studentName, socketId: socket.id }],
        activeMemberIdx: 0,
        skipNextTurn: false
      }],
      activeTeamIdx: 0,
      currentRoll: null,
      activeQuestion: null,
      questionTimer: null,
      timerRemaining: 0,
      askedQuestionIds: [],
      wasInLastPlace: {},
      studentStats: {},
      isFirstQuestion: true,
      pendingRetryQuestion: null
    };

    this.activeRooms.set(roomCode, room);
    socket.join(roomCode);
    logger.info(`🎮 Student Practice Room created: ${roomCode}`);
    this.sendRoomUpdate(roomCode);
  }

  private handleJoinPracticeRoom(socket: Socket, payload: { roomCode: string; studentId: string; studentName: string }) {
    const { roomCode, studentId, studentName } = payload;
    const room = this.activeRooms.get(roomCode);
    if (!room) {
      socket.emit('room:error', { message: 'Practice room not found' });
      return;
    }

    if (room.status !== 'LOBBY') {
      socket.emit('room:error', { message: 'Game has already started in this room' });
      return;
    }

    const exists = room.teams.some(t => t.id === studentId);
    if (!exists) {
      const colors = [
        'bg-blue-600 text-white border-blue-300',
        'bg-emerald-600 text-white border-emerald-300',
        'bg-amber-600 text-white border-amber-300',
        'bg-purple-600 text-white border-purple-300'
      ];
      const color = colors[room.teams.length % colors.length];

      room.teams.push({
        id: studentId,
        name: studentName,
        color,
        position: 0,
        coins: 10,
        xp: 0,
        streak: 0,
        members: [{ id: studentId, name: studentName, socketId: socket.id }],
        activeMemberIdx: 0,
        skipNextTurn: false
      });
    } else {
      const team = room.teams.find(t => t.id === studentId);
      if (team) {
        team.members[0].socketId = socket.id;
      }
    }

    socket.join(roomCode);
    logger.info(`🎮 Student ${studentName} joined Practice Room: ${roomCode}`);
    this.sendRoomUpdate(roomCode);
  }

  // ==========================================
  // DISCONNECTS
  // ==========================================

  private handleDisconnect(socket: Socket) {
    logger.info(`🔌 Client disconnected: ${socket.id}`);
    
    this.activeRooms.forEach((room, roomCode) => {
      room.teams.forEach(team => {
        team.members.forEach(member => {
          if (member.socketId === socket.id) {
            member.socketId = null;
            logger.info(`💔 Offline mapping: Student ${member.name} in Room ${roomCode}`);
            this.sendRoomUpdate(roomCode);
          }
        });
      });
    });
  }

  private sendRoomUpdate(roomCode: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room) return;

    this.io.to(roomCode).emit('room:updated', {
      sessionId: room.sessionId,
      roomCode: room.roomCode,
      status: room.status,
      teams: room.teams,
      activeTeamIdx: room.activeTeamIdx,
      activeQuestion: room.activeQuestion,
      currentRoll: room.currentRoll,
      timerRemaining: room.timerRemaining,
      hasPendingRetry: room.pendingRetryQuestion !== null
    });
  }
}
