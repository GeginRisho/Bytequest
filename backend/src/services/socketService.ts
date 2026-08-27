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
  finished?: boolean;
  finishedRank?: number;
  askedQuestionIds?: string[];
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
  isRollQuestion?: boolean;
  gamePhase?: 'WAITING' | 'TURN_START' | 'ROLLING' | 'MOVING' | 'RESOLVING_TILE' | 'RESOLVING_QUESTION' | 'RESOLVING_REWARD_OR_TRAP' | 'RESOLVING_COLLISION' | 'CHECKING_FINISH' | 'TURN_COMPLETE' | 'GAME_OVER' | 'DICE_REVEAL';
  turnCount?: number;
  turnId?: string;
  turnTransitionLock?: boolean;
  dispatchedRollIds?: string[];
}

const KNOCKBACK_TILES = 2;
const COLLISION_PUSHBACK_TILES = 4;

export class SocketService {
  private io: Server;
  // In-memory active game rooms
  private activeRooms: Map<string, LiveRoom> = new Map(); // roomCode -> LiveRoom

  constructor(server: any) {
    const allowedOrigins = [
      'http://localhost:8081',
      'http://localhost:8082',
      'https://bytequest-livid.vercel.app'
    ];

    this.io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    logger.info('🛰️ Classroom Socket.io engine initialized.');
    this.initSocketEvents();
  }

  private initSocketEvents() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`🔌 Connection established: ${socket.id}`);

      // Teacher room registration
      socket.on('teacher:join', async (payload: { roomCode: string }) => {
        const { roomCode } = payload;
        await socket.join(roomCode);
        logger.info(`🏫 Teacher joined room: ${roomCode}`);
        this.sendRoomUpdate(roomCode);
      });

      // Student join lobby
      socket.on('student:join', async (payload: { roomCode: string; studentId: string }) => {
        await this.handleStudentJoin(socket, payload);
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
      socket.on('student:reconnect', async (payload: { roomCode: string; studentId: string }) => {
        await this.handleStudentReconnect(socket, payload);
      });

      // Student creates practice room
      socket.on('student:create_practice', async (payload: { studentId: string; studentName: string }) => {
        await this.handleCreatePracticeRoom(socket, payload);
      });

      // Student joins practice room
      socket.on('student:join_practice', async (payload: { roomCode: string; studentId: string; studentName: string }) => {
        await this.handleJoinPracticeRoom(socket, payload);
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
          timerRemaining: 15,
          askedQuestionIds: [],
          wasInLastPlace: {},
          studentStats: {},
          isFirstQuestion: true,
          pendingRetryQuestion: null,
          isRollQuestion: false,
          gamePhase: 'TURN_START',
          turnCount: 1,
          turnId: 'TURN_1',
          turnTransitionLock: false,
          dispatchedRollIds: []
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

      await socket.join(roomCode);
      (socket as any).roomCode = roomCode;
      (socket as any).studentId = studentId;

      logger.info(`👨‍🎓 Student joined: ${studentId} in Room: ${roomCode}`);
      this.sendRoomUpdate(roomCode);
    } catch (err: any) {
      socket.emit('error', { message: 'Server connection error during login' });
    }
  }

  private async handleStudentReconnect(socket: Socket, payload: { roomCode: string; studentId: string }) {
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

    await socket.join(roomCode);
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
    if (!room || room.status !== 'PLAYING') return;

    // Phase check
    if (room.gamePhase !== 'TURN_START') {
      logger.warn(`[ROLL REJECTED] Room ${roomCode} phase is ${room.gamePhase}, expected TURN_START`);
      return;
    }

    const activeTeam = room.teams[room.activeTeamIdx];
    if (activeTeam.finished) {
      logger.warn(`[ROLL REJECTED] Active team ${activeTeam.name} is already finished`);
      return;
    }

    const activeTeammate = activeTeam.members[activeTeam.activeMemberIdx];
    if (activeTeammate.id !== studentId) {
      logger.warn(`[ROLL REJECTED] Current turn belongs to teammate ${activeTeammate.name}, not ${studentId}`);
      return;
    }

    // Lock phase
    room.gamePhase = 'ROLLING';
    room.isRollQuestion = true;
    room.turnId = `TURN_${room.turnCount}`;
    const currentTurnId = room.turnId;

    const roll = Math.floor(Math.random() * 6) + 1;
    room.currentRoll = roll;

    logger.info(`[ROLL] ${currentTurnId} | ${activeTeam.name} rolled ${roll} (hidden)`);

    // Emit rolling event without roll value!
    this.io.to(roomCode).emit('game:dice_rolled', { 
      teamId: activeTeam.id
    });
    this.sendRoomUpdate(roomCode);

    setTimeout(async () => {
      const currentRoom = this.activeRooms.get(roomCode);
      if (!currentRoom || currentRoom.turnId !== currentTurnId || currentRoom.gamePhase !== 'ROLLING') return;
      await this.dispatchQuestion(roomCode, currentTurnId);
    }, 800);
  }

  private async dispatchQuestion(roomCode: string, expectedTurnId: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room || room.turnId !== expectedTurnId || room.gamePhase !== 'ROLLING') return;

    // Idempotency: Protect dispatch per turn/rollId
    const rollId = `${roomCode}_${expectedTurnId}_ROLL`;
    if (!room.dispatchedRollIds) room.dispatchedRollIds = [];
    if (room.dispatchedRollIds.includes(rollId)) {
      logger.warn(`[DUPLICATE PREVENTED] Server already dispatched question for ${rollId}`);
      return;
    }
    room.dispatchedRollIds.push(rollId);

    room.gamePhase = 'RESOLVING_QUESTION';

    try {
      if (room.pendingRetryQuestion) {
        const q = room.pendingRetryQuestion;
        room.pendingRetryQuestion = null; // Clear it immediately
        room.activeQuestion = q;
        room.timerRemaining = 15;

        // Add to match-level asked list immediately BEFORE pushing
        if (!room.askedQuestionIds.includes(q.id)) {
          room.askedQuestionIds.push(q.id);
        }

        // Emit question to the room
        this.io.to(roomCode).emit('game:question_pushed', {
          question: q,
          timerRemaining: 15
        });
        this.sendRoomUpdate(roomCode);

        // Start countdown
        if (room.questionTimer) clearInterval(room.questionTimer);
        room.questionTimer = setInterval(() => {
          const currentRoom = this.activeRooms.get(roomCode);
          if (!currentRoom || currentRoom.turnId !== expectedTurnId || currentRoom.gamePhase !== 'RESOLVING_QUESTION') {
            if (room.questionTimer) {
              clearInterval(room.questionTimer);
              room.questionTimer = null;
            }
            return;
          }
          currentRoom.timerRemaining--;
          if (currentRoom.timerRemaining <= 0) {
            clearInterval(room.questionTimer);
            currentRoom.questionTimer = null;
            this.handleAnswerSubmitForTurn(roomCode, '', -1, 15, expectedTurnId);
          }
        }, 1000);
        return;
      }

      let teacherQs: any[] = [];
      if (room.classId) {
        const cls = await prisma.class.findUnique({
          where: { id: room.classId }
        });
        const teacherId = cls ? cls.teacherId : '';
        teacherQs = await db.getQuestionsByTeacher(teacherId);
      }

      // Filter available teacher questions against match-wide room.askedQuestionIds
      const unusedTeacherQs = teacherQs.filter(q => !room.askedQuestionIds.includes(q.id));

      let pool: any[] = [];
      if (room.classId && unusedTeacherQs.length > 0) {
        pool = unusedTeacherQs;
      } else {
        if (room.classId && teacherQs.length > 0) {
          logger.info(`Teacher questions exhausted for room ${roomCode}. Falling back to general database questions.`);
        }
        const list = await prisma.question.findMany({
          where: { deletedAt: null }
        });
        const generalQs = list.map(q => ({
          id: q.id,
          teacherId: q.creatorId || 'admin',
          grade: q.classLevel,
          topic: q.topic,
          difficulty: q.difficulty.toLowerCase() as any,
          question: room.classId ? `[General] ${q.questionText}` : q.questionText,
          options: q.options,
          correctIndex: q.options.indexOf(q.correctAnswer) !== -1 ? q.options.indexOf(q.correctAnswer) : 0,
          explanation: q.explanation
        }));
        pool = generalQs.filter(q => !room.askedQuestionIds.includes(q.id));
      }

      const activeTeam = room.teams[room.activeTeamIdx];
      // Boss tile: positions 8 and 16
      const targetPosition = Math.min(17, activeTeam.position + (room.currentRoll || 1));
      const isOnBossTile = targetPosition === 8 || targetPosition === 16;

      let filteredPool = pool;
      if (room.grade !== 'mixed') {
        filteredPool = pool.filter(q => q.grade === room.grade);
        if (filteredPool.length === 0) filteredPool = pool; // fallback
      }

      let diffPool = filteredPool;
      if (room.isFirstQuestion) {
        room.isFirstQuestion = false;
        const easyPool = filteredPool.filter(q => q.difficulty === 'easy');
        if (easyPool.length > 0) diffPool = easyPool;
      } else if (isOnBossTile) {
        const hardPool = filteredPool.filter(q => q.difficulty === 'hard');
        if (hardPool.length > 0) diffPool = hardPool;
      } else {
        const streak = activeTeam.streak;
        let targetDiff: string;
        if (streak >= 6) {
          targetDiff = 'hard';
        } else if (streak >= 3) {
          targetDiff = 'medium';
        } else {
          targetDiff = 'easy';
        }
        const matchedDiffPool = filteredPool.filter(q => q.difficulty === targetDiff);
        if (matchedDiffPool.length > 0) diffPool = matchedDiffPool;
      }

      let q: any;
      if (diffPool.length === 0 && filteredPool.length > 0) {
        diffPool = filteredPool;
      }

      if (diffPool.length === 0) {
        q = {
          id: 'no_more_questions',
          teacherId: 'system',
          grade: 'mixed',
          topic: 'Mastery',
          difficulty: 'easy',
          question: 'Mastery Achieved! All questions in this game pool have been resolved. Press submit to continue!',
          options: ['Continue', 'Continue', 'Continue', 'Continue'],
          correctIndex: 0,
          explanation: 'New questions coming soon!'
        };
      } else {
        q = diffPool[Math.floor(Math.random() * diffPool.length)];
      }

      // Add to match asked list immediately BEFORE pushing
      room.askedQuestionIds.push(q.id);
      if (!activeTeam.askedQuestionIds) activeTeam.askedQuestionIds = [];
      activeTeam.askedQuestionIds.push(q.id);

      room.activeQuestion = q;
      room.timerRemaining = 15;

      // Emit question to the room
      this.io.to(roomCode).emit('game:question_pushed', {
        question: q,
        timerRemaining: 15
      });
      this.sendRoomUpdate(roomCode);

      // Start countdown
      if (room.questionTimer) clearInterval(room.questionTimer);
      room.questionTimer = setInterval(() => {
        const currentRoom = this.activeRooms.get(roomCode);
        if (!currentRoom || currentRoom.turnId !== expectedTurnId || currentRoom.gamePhase !== 'RESOLVING_QUESTION') {
          if (room.questionTimer) {
            clearInterval(room.questionTimer);
            room.questionTimer = null;
          }
          return;
        }
        currentRoom.timerRemaining--;
        if (currentRoom.timerRemaining <= 0) {
          clearInterval(room.questionTimer);
          room.questionTimer = null;
          this.handleAnswerSubmitForTurn(roomCode, '', -1, 15, expectedTurnId); // Time out
        }
      }, 1000);
    } catch (err: any) {
      logger.error('Error dispatching question in room: ' + roomCode, err);
      room.gamePhase = 'TURN_COMPLETE';
      this.rotateTurn(roomCode, expectedTurnId);
    }
  }

  private async handleAnswerSubmit(roomCode: string, studentId: string, answerIndex: number, timeSpent: number) {
    const room = this.activeRooms.get(roomCode);
    if (!room) return;
    await this.handleAnswerSubmitForTurn(roomCode, studentId, answerIndex, timeSpent, room.turnId || '');
  }

  private async handleAnswerSubmitForTurn(roomCode: string, studentId: string, answerIndex: number, timeSpent: number, expectedTurnId: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room || room.turnId !== expectedTurnId || room.gamePhase !== 'RESOLVING_QUESTION' || !room.activeQuestion) return;

    if (room.questionTimer) {
      clearInterval(room.questionTimer);
      room.questionTimer = null;
    }

    const q = room.activeQuestion;
    room.activeQuestion = null;

    const isCorrect = answerIndex === q.correctIndex;
    const activeTeam = room.teams[room.activeTeamIdx];
    const activeTeammate = activeTeam.members[activeTeam.activeMemberIdx];
    const isRollQ = room.isRollQuestion;

    if (isRollQ) {
      room.isRollQuestion = false;
      room.gamePhase = 'DICE_REVEAL';
    } else {
      room.gamePhase = 'RESOLVING_REWARD_OR_TRAP';
    }

    if (studentId) {
      if (!room.studentStats[studentId]) {
        room.studentStats[studentId] = { correct: 0, total: 0, timeSpent: 0 };
      }
      room.studentStats[studentId].total++;
      room.studentStats[studentId].timeSpent += timeSpent;
      if (isCorrect) room.studentStats[studentId].correct++;

      // Immediately save attempt and update student rewards in database (Requirement 3 & 4)
      (async () => {
        try {
          const student = await prisma.studentProfile.findUnique({
            where: { id: studentId }
          });
          if (student) {
            // Deduplicate
            const duplicate = await prisma.questionAttempt.findFirst({
              where: {
                studentId,
                questionId: q.id,
                activityType: 'ONLINE_GAME',
                createdAt: {
                  gte: new Date(Date.now() - 30 * 1000) // last 30 seconds
                }
              }
            });

            if (!duplicate) {
              const isOnBossTile = activeTeam.position === 8 || activeTeam.position === 16;
              const xpEarned = isCorrect ? (isOnBossTile ? 50 : 15) : 0;
              const coinsEarned = isCorrect ? (isOnBossTile ? 15 : 5) : 0;

              await prisma.questionAttempt.create({
                data: {
                  studentId,
                  classId: student.classId,
                  grade: student.grade,
                  questionId: q.id,
                  questionText: q.questionText,
                  selectedAnswer: q.options[answerIndex] || '',
                  correctAnswer: q.correctAnswer,
                  isCorrect,
                  xpEarned,
                  coinsEarned,
                  activityType: 'ONLINE_GAME'
                }
              });

              // Increment totals
              const newXp = student.xp + xpEarned;
              const newCoins = student.coins + coinsEarned;
              const newLevel = Math.floor(newXp / 500) + 1;

              await prisma.studentProfile.update({
                where: { id: studentId },
                data: {
                  xp: newXp,
                  coins: newCoins,
                  level: newLevel
                }
              });
            }
          }
        } catch (err: any) {
          logger.error(`[ONLINE ATTEMPT ERROR] Failed to save attempt for student ${studentId}: ${err.message}`);
        }
      })();
    }

    const roll = room.currentRoll || 1;
    let tileText = '';
    let newPosition = activeTeam.position; // default: no movement
    let asksSecondQuestion = false;

    if (isCorrect) {
      room.pendingRetryQuestion = null; // Clear retry question
      activeTeam.streak++;

      let xp = 15;
      let coins = 5;
      const isOnBossTile = activeTeam.position === 8 || activeTeam.position === 16;
      if (isOnBossTile) {
        xp = 50;
        coins = 15;
      }
      
      activeTeam.xp += xp;
      activeTeam.coins += coins;

      if (activeTeam.streak === 3) {
        activeTeam.coins += 5;
      }
      if (activeTeam.streak % 3 === 0 && activeTeam.streak > 0) {
        activeTeam.coins += 3; // bonus every 3-streak
      }

      if (isRollQ) {
        // Move forward since it's the roll question
        newPosition = Math.min(17, activeTeam.position + roll);
        activeTeam.position = newPosition;

        const destTileType = [4, 10, 15].includes(activeTeam.position) ? 'treasure' :
                             [2, 6, 11, 12].includes(activeTeam.position) ? 'trap' :
                             [8, 16].includes(activeTeam.position) ? 'boss' : 'other';

        if (destTileType === 'treasure') {
          activeTeam.xp += 10;
          activeTeam.coins += 15;
          tileText = `🎁 Opened a Treasure! (+15 Coins, +10 XP)`;
        } else if (destTileType === 'trap') {
          const isSkipTurnTrap = [11, 12].includes(activeTeam.position);
          if (isSkipTurnTrap) {
            activeTeam.skipNextTurn = true;
            tileText = `🚫 Sprung a Trap! Bug caught you! Skip next turn.`;
          } else {
            activeTeam.position = Math.max(0, activeTeam.position - KNOCKBACK_TILES);
            newPosition = activeTeam.position;
            tileText = `⏮️ Sprung a Trap! Bug knocked you back ${KNOCKBACK_TILES} tiles!`;
          }
        } else if (destTileType === 'boss') {
          activeTeam.xp += 30;
          activeTeam.coins += 10;
          tileText = `👾 Reached a Boss Gate! (+10 Coins, +30 XP)`;
        }

        // Apply Tile Collision Rule (Arriving player B stays, existing player A is pushed back 4 tiles)
        const clashedTeam = room.teams.find(t => 
          t.id !== activeTeam.id && t.position === activeTeam.position && !t.finished && activeTeam.position !== 0
        );
        if (clashedTeam) {
          const finalPos = Math.max(0, clashedTeam.position - COLLISION_PUSHBACK_TILES);
          clashedTeam.position = finalPos;
          tileText += ` | ⚔️ Collision! ${clashedTeam.name} was moved back ${COLLISION_PUSHBACK_TILES} tiles.`;
        }
      } else {
        tileText = `✅ Correctly resolved tile question!`;
      }
    } else {
      activeTeam.streak = 0;
      newPosition = activeTeam.position; // stays
      room.pendingRetryQuestion = q; // Save retry question
    }

    if (activeTeam.position >= 17 && !activeTeam.finished) {
      activeTeam.finished = true;
      const finishedCount = room.teams.filter(t => t.finished).length;
      activeTeam.finishedRank = finishedCount;
      this.io.to(roomCode).emit('game:log', { 
        message: `🏁 ${activeTeam.name} has reached the Final Treasure! Finished in Rank ${activeTeam.finishedRank}!` 
      });
    }

    const currentFinishedCount = room.teams.filter(t => t.finished).length;
    const isFinishedCondition = room.teams.length <= 1 
      ? (currentFinishedCount === 1) 
      : (currentFinishedCount === room.teams.length - 1);

    if (isFinishedCondition) {
      const remainingTeam = room.teams.find(t => !t.finished);
      if (remainingTeam) {
        remainingTeam.finished = true;
        remainingTeam.finishedRank = room.teams.length;
        this.io.to(roomCode).emit('game:log', { 
          message: `🏁 ${remainingTeam.name} automatically finished in Rank ${remainingTeam.finishedRank}!` 
        });
      }
      room.status = 'FINISHED';
      room.gamePhase = 'GAME_OVER';

      // Increment matchesPlayed and update level for all players in room
      const leveledUpMembers: string[] = [];
      const allMembers = room.teams.flatMap(t => t.members);
      for (const member of allMembers) {
        try {
          const profile = await prisma.studentProfile.findUnique({
            where: { id: member.id }
          });
          if (profile) {
            const nextMatches = (profile.matchesPlayed || 0) + 1;
            let nextLevel = 1;
            if (nextMatches <= 5) nextLevel = 1;
            else if (nextMatches <= 12) nextLevel = 2;
            else if (nextMatches <= 21) nextLevel = 3;
            else if (nextMatches <= 31) nextLevel = 4;
            else nextLevel = 5;

            const isLevelUp = nextLevel > profile.level;
            if (isLevelUp) {
              leveledUpMembers.push(profile.id);
            }

            await prisma.studentProfile.update({
              where: { id: member.id },
              data: {
                matchesPlayed: nextMatches,
                level: nextLevel
              }
            });
          }
        } catch (err: any) {
          logger.error(`[LEVELING ERROR] Failed to update stats for student ${member.id}: ${err.message}`);
        }
      }

      // Sort teams by finish rank before saving/returning
      room.teams.sort((a, b) => {
        const rA = a.finishedRank || 999;
        const rB = b.finishedRank || 999;
        if (rA !== rB) return rA - rB;
        if (a.position !== b.position) return b.position - a.position;
        return b.xp - a.xp;
      });

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
            rank: t.finishedRank || (idx + 1)
          };
        });
        dbResults.sort((a, b) => a.rank - b.rank);
        await db.saveSessionResults(room.sessionId, dbResults);
      }
      this.io.to(roomCode).emit('game:victory', { winner: room.teams[0], teams: room.teams, leveledUpMembers });
      this.sendRoomUpdate(roomCode);
      return;
    }

    this.io.to(roomCode).emit('game:answer_result', {
      isCorrect,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      newPosition,
      captureText: tileText,
      playerName: activeTeammate.name,
      teamName: activeTeam.name,
      hasRetryQuestion: !isCorrect,
      roll // Send the roll value to reveal it!
    });

    room.gamePhase = 'TURN_COMPLETE';
    this.sendRoomUpdate(roomCode);

    setTimeout(() => {
      const currentRoom = this.activeRooms.get(roomCode);
      if (!currentRoom || currentRoom.turnId !== expectedTurnId || currentRoom.gamePhase !== 'TURN_COMPLETE') return;
      this.rotateTurn(roomCode, expectedTurnId);
    }, 3800);
  }

  private rotateTurn(roomCode: string, expectedTurnId: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room || room.turnId !== expectedTurnId || room.gamePhase !== 'TURN_COMPLETE' || room.status !== 'PLAYING') return;

    if (room.turnTransitionLock) return;
    room.turnTransitionLock = true;

    // Rotate within active team members
    const activeTeam = room.teams[room.activeTeamIdx];
    activeTeam.activeMemberIdx = (activeTeam.activeMemberIdx + 1) % activeTeam.members.length;

    // Pass turn to next unfinished team
    let nextTeamIdx = room.activeTeamIdx;
    let found = false;
    for (let i = 1; i <= room.teams.length; i++) {
      const idx = (room.activeTeamIdx + i) % room.teams.length;
      if (!room.teams[idx].finished) {
        nextTeamIdx = idx;
        found = true;
        break;
      }
    }

    if (!found) {
      logger.info(`All teams finished in room ${roomCode}. Turn rotation skipped.`);
      room.turnTransitionLock = false;
      return;
    }

    this.advanceTurnFrom(roomCode, nextTeamIdx, expectedTurnId);
  }

  private advanceTurnFrom(roomCode: string, targetTeamIdx: number, previousTurnId: string) {
    const room = this.activeRooms.get(roomCode);
    if (!room || room.status !== 'PLAYING') return;

    room.turnCount = (room.turnCount || 1) + 1;
    room.turnId = `TURN_${room.turnCount}`;
    const nextTurnId = room.turnId;

    const targetTeam = room.teams[targetTeamIdx];
    if (targetTeam.skipNextTurn) {
      room.activeTeamIdx = targetTeamIdx;
      room.currentRoll = null;
      targetTeam.skipNextTurn = false;

      const skipMessage = `⏳ ${targetTeam.name} skipped this turn! 🚫`;
      this.io.to(roomCode).emit('game:log', { message: skipMessage });
      this.io.to(roomCode).emit('game:skip_turn', { teamName: targetTeam.name, message: skipMessage });
      
      room.gamePhase = 'TURN_COMPLETE';
      room.turnTransitionLock = false;
      this.sendRoomUpdate(roomCode);

      setTimeout(() => {
        const currentRoom = this.activeRooms.get(roomCode);
        if (!currentRoom || currentRoom.turnId !== nextTurnId || currentRoom.gamePhase !== 'TURN_COMPLETE') return;
        this.rotateTurn(roomCode, nextTurnId);
      }, 2200);

      return;
    }

    room.activeTeamIdx = targetTeamIdx;
    room.currentRoll = null;
    room.gamePhase = 'TURN_START';
    room.turnTransitionLock = false;

    logger.info(`🔄 Turn rotated to team: ${room.teams[targetTeamIdx].name} | ${room.turnId}`);
    this.sendRoomUpdate(roomCode);
  }

  private async handleCreatePracticeRoom(socket: Socket, payload: { studentId: string; studentName: string }) {
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
      pendingRetryQuestion: null,
      isRollQuestion: false,
      gamePhase: 'TURN_START',
      turnCount: 1,
      turnId: 'TURN_1',
      turnTransitionLock: false,
      dispatchedRollIds: []
    };

    this.activeRooms.set(roomCode, room);
    await socket.join(roomCode);
    logger.info(`🎮 Student Practice Room created: ${roomCode}`);
    this.sendRoomUpdate(roomCode);
  }

  private async handleJoinPracticeRoom(socket: Socket, payload: { roomCode: string; studentId: string; studentName: string }) {
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

    await socket.join(roomCode);
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
