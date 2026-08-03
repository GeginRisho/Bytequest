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
          studentStats: {}
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

    // Roll 1-6
    const roll = Math.floor(Math.random() * 6) + 1;
    room.currentRoll = roll;

    // Broadcast roll event to animate dice on clients
    this.io.to(roomCode).emit('game:dice_rolled', { roll, teamId: activeTeam.id });

    // After 1.2s spin delay, dispatch question to start the turn
    setTimeout(async () => {
      await this.dispatchQuestion(roomCode);
    }, 1200);
  }

  private async dispatchQuestion(roomCode: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room) return;

    try {
      const cls = await prisma.class.findUnique({
        where: { id: room.classId }
      });
      const teacherId = cls ? cls.teacherId : '';
      const teacherQs = await db.getQuestionsByTeacher(teacherId);

      const activeTeam = room.teams[room.activeTeamIdx];
      const isOnBossTile = activeTeam && (activeTeam.position === 8 || activeTeam.position === 16);

      // Filter questions by grade
      let pool = teacherQs;
      if (room.grade !== 'mixed') {
        pool = teacherQs.filter(q => q.grade === room.grade);
      }

      // Filter by difficulty based on Boss tile
      if (isOnBossTile) {
        pool = pool.filter(q => q.difficulty === 'hard');
      } else {
        pool = pool.filter(q => q.difficulty !== 'hard');
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

    // Clear timer
    if (room.questionTimer) {
      clearInterval(room.questionTimer);
      room.questionTimer = null;
    }

    const q = room.activeQuestion;
    room.activeQuestion = null;

    const isCorrect = answerIndex === q.correctIndex;
    const activeTeam = room.teams[room.activeTeamIdx];
    const activeTeammate = activeTeam.members[activeTeam.activeMemberIdx];

    // Log student statistics
    if (studentId) {
      if (!room.studentStats[studentId]) {
        room.studentStats[studentId] = { correct: 0, total: 0, timeSpent: 0 };
      }
      room.studentStats[studentId].total++;
      room.studentStats[studentId].timeSpent += timeSpent;
      if (isCorrect) room.studentStats[studentId].correct++;
    }

    // Determine move steps
    const roll = room.currentRoll || 1;
    let steps = roll;
    
    if (!isCorrect) {
      steps = Math.max(1, Math.floor(roll / 2)); // Halved steps (min 1)
    }

    // Animate moves tile-by-tile
    let finalPos = activeTeam.position;
    for (let i = 0; i < steps; i++) {
      finalPos = Math.min(17, finalPos + 1);
    }

    const prevPos = activeTeam.position;
    activeTeam.position = finalPos;

    // Track minimum team positions to record last place for Comeback Kid
    const minPos = Math.min(...room.teams.map(t => t.position));
    if (prevPos === minPos) {
      room.wasInLastPlace[activeTeam.id] = true;
    }

    // Check Ludo Capture (only on correct answers)
    let captureText = '';
    const safeTiles = [0, 4, 10, 15];
    if (isCorrect && !safeTiles.includes(finalPos)) {
      room.teams.forEach(otherTeam => {
        if (otherTeam.id !== activeTeam.id && otherTeam.position === finalPos) {
          // Sent back 3 slots
          otherTeam.position = Math.max(0, otherTeam.position - 3);
          captureText = `⚔️ ${activeTeam.name} captured ${otherTeam.name}! Sent back 3 spaces.`;
        }
      });
    }

    const isOnBossTile = prevPos === 8 || prevPos === 16;

    // Resolve rewards
    if (isCorrect) {
      activeTeam.streak++;
      if (isOnBossTile) {
        activeTeam.xp += 50;
        activeTeam.coins += 15;
      } else {
        activeTeam.xp += 15;
        activeTeam.coins += 5;
      }
      if (activeTeam.streak === 3) {
        activeTeam.coins += 5; // Streak bonus
      }
    } else {
      activeTeam.streak = 0;
    }

    // Check tile-specific effects at finalPos (Trap / Treasure)
    let tileText = '';
    if ([4, 10, 15].includes(finalPos)) {
      // Treasure Tile
      activeTeam.xp += 10;
      activeTeam.coins += 15;
      tileText = `🎁 Opened a Treasure! (+15 Coins, +10 XP)`;
    } else if ([2, 6, 12].includes(finalPos)) {
      // Trap Tile
      const isMoveBack = Math.random() < 0.5;
      if (isMoveBack) {
        activeTeam.position = Math.max(0, activeTeam.position - 2);
        tileText = `🕸️ Sprung a Trap! Slipped back 2 spaces.`;
      } else {
        activeTeam.skipNextTurn = true;
        tileText = `🚫 Sprung a Trap! Next turn will be skipped.`;
      }
    }

    let combinedLogs = [];
    if (captureText) combinedLogs.push(captureText);
    if (tileText) combinedLogs.push(tileText);
    const resultLog = combinedLogs.join(' | ');

    // Check Win condition
    if (activeTeam.position >= 17) {
      room.status = 'FINISHED';
      await db.updateSessionStatus(room.sessionId, 'FINISHED');
      
      // Save stats to session results in database
      const dbResults = room.teams.map((t, idx) => {
        // Calculate accuracy
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
          rank: idx + 1 // Calculated based on index below
        };
      });

      // Sort by position then xp to get true ranks
      dbResults.sort((a, b) => b.position - a.position || b.xp - a.xp);
      dbResults.forEach((res, rankIdx) => {
        res.rank = rankIdx + 1;
      });

      await db.saveSessionResults(room.sessionId, dbResults);
      this.io.to(roomCode).emit('game:victory', { winner: activeTeam, teams: room.teams });
      this.sendRoomUpdate(roomCode);
      return;
    }

    // Send answer result event containing coordinates and state shifts
    this.io.to(roomCode).emit('game:answer_result', {
      isCorrect,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      steps,
      captureText: resultLog,
      playerName: activeTeammate.name,
      teamName: activeTeam.name
    });

    // Hold screen for 3.5 seconds to read correct/incorrect result details, then pass turn
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

  // ==========================================
  // DISCONNECTS
  // ==========================================

  private handleDisconnect(socket: Socket) {
    logger.info(`🔌 Client disconnected: ${socket.id}`);
    
    // Find room where socket belonged
    this.activeRooms.forEach((room, roomCode) => {
      room.teams.forEach(team => {
        team.members.forEach(member => {
          if (member.socketId === socket.id) {
            member.socketId = null; // Unbind
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
      timerRemaining: room.timerRemaining
    });
  }
}
