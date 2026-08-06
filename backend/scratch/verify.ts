import axios from 'axios';
import { io as ClientIO } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api/v1/teacher';
const SOCKET_URL = 'http://localhost:5000';

async function runVerification() {
  console.log('🧪 Starting ByteQuest Integration Verification...');

  // ========================================================
  // 1. TEACHER AUTHENTICATION & LOGIN
  // ========================================================
  console.log('\n🔐 Testing Teacher Login...');
  let teacherId = '';
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'teacher@bytequest.com',
      password: 'password123'
    });
    teacherId = loginRes.data.teacher.id;
    console.log(`✅ Teacher logged in successfully! ID: ${teacherId}`);
  } catch (err: any) {
    console.error('❌ Teacher login failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // ========================================================
  // 2. CSV QUESTION BANK IMPORT
  // ========================================================
  console.log('\n📝 Testing CSV Question Bank Importer...');
  const testCsv = '11;Python Programming;medium;What is the output of print(type([]))?;List;Tuple;Dict;Set;0;type of [] is list';
  try {
    const importRes = await axios.post(`${API_BASE}/questions/import`, {
      csvText: testCsv,
      teacherId
    });
    console.log(`✅ CSV Question Import successful: ${importRes.data.message}`);
  } catch (err: any) {
    console.error('❌ CSV Question Import failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // ========================================================
  // 3. MULTIPLAYER PRACTICE SOCKET TURN SEQUENCE (10 TURNS)
  // ========================================================
  console.log('\n🎮 Connecting Student Socket & Launching Game...');
  const clientSocket = ClientIO(SOCKET_URL, { forceNew: true });
  
  let roomCode = '';
  let activeQuestion: any = null;
  let turnCounter = 1;
  const targetTurns = 10;

  clientSocket.on('connect', () => {
    console.log('🔌 Socket client connected successfully.');
    clientSocket.emit('student:create_practice', {
      studentId: 'student_001',
      studentName: 'Aarav Sharma'
    });
  });

  clientSocket.on('room:updated', (room: any) => {
    if (!roomCode) {
      roomCode = room.roomCode;
      console.log(`✅ Practice room created! Code: ${roomCode}`);
      console.log('🚀 Starting practice match...');
      clientSocket.emit('student:start_practice', { roomCode });
    }

    if (room.status === 'PLAYING') {
      const activePlayer = room.teams[room.activeTeamIdx];
      console.log(`\n--- TURN ${turnCounter} START ---`);
      console.log(`Player: ${activePlayer.name} | Position: ${activePlayer.position} | XP: ${activePlayer.xp} | Coins: ${activePlayer.coins}`);
      
      setTimeout(() => {
        console.log(`🎲 Rolling dice for ${activePlayer.name}...`);
        clientSocket.emit('student:roll', { roomCode, studentId: 'student_001' });
      }, 100);
    }
  });

  clientSocket.on('game:dice_rolled', (data: any) => {
    console.log(`🎲 Dice landed: Rolled ${data.roll}`);
  });

  clientSocket.on('game:question_pushed', (data: any) => {
    activeQuestion = data.question;
    console.log(`❓ Question dispatched: "${activeQuestion.question}"`);
    
    const beCorrect = Math.random() < 0.7;
    const answerIdx = beCorrect ? activeQuestion.correctIndex : (activeQuestion.correctIndex + 1) % 4;

    setTimeout(() => {
      console.log(`✍️ Answering option index ${answerIdx} (Expected Correct: ${beCorrect})`);
      clientSocket.emit('student:answer', {
        roomCode,
        studentId: 'student_001',
        answerIndex: answerIdx,
        timeSpent: 1
      });
    }, 200);
  });

  clientSocket.on('game:answer_result', (data: any) => {
    console.log(`📢 Answer Result: ${data.isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    if (!data.isCorrect) {
      console.log(`🕸️ Backtrack penalty applied: Retreating ${data.backtrack} spaces.`);
    }

    if (data.captureText) {
      console.log(`⚔️ Capture log: ${data.captureText}`);
    }

    console.log(`--- TURN ${turnCounter} END ---`);
    turnCounter++;

    if (turnCounter > targetTurns) {
      console.log(`\n⭐ Completed ${targetTurns} verification turns successfully!`);
      clientSocket.disconnect();
      console.log('🏁 Verification validation completed with all checks passing.');
      process.exit(0);
    }
  });

  clientSocket.on('room:error', (err: any) => {
    console.error('❌ Socket Room Error:', err);
    process.exit(1);
  });

  setTimeout(() => {
    console.error('❌ Verification timed out after 90 seconds.');
    process.exit(1);
  }, 90000);
}

runVerification();
