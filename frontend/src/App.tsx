import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Dices, 
  User as UserIcon, 
  ArrowRight, 
  Compass, 
  Flame, 
  HelpCircle, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Play, 
  RotateCcw, 
  Shield,
  Award,
  Clock,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';

// Imports from split files
import { questionBank, Question } from './questions';
import { Tile, BOARD_TILES, TILE_COORDS, PRESET_COLORS, PRESET_AVATARS } from './config';
import TeacherDashboard from './components/TeacherDashboard';
import StudentGame from './components/StudentGame';

// Connect Socket.io client to backend server
const socket = io(`${window.location.protocol}//${window.location.hostname}:5000`, {
  transports: ['websocket'],
  autoConnect: true
});

// ==========================================
// SOUND EFFECT PLAYERS
// ==========================================
class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playBeep(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio blocked by browser policy");
    }
  }

  playRoll() {
    let count = 0;
    const interval = setInterval(() => {
      this.playBeep(120 + Math.random() * 300, 'triangle', 0.08, 0.08);
      count++;
      if (count > 8) clearInterval(interval);
    }, 70);
  }

  playStep() {
    this.playBeep(150, 'sine', 0.1, 0.15);
  }

  playCorrect() {
    this.playBeep(523.25, 'sine', 0.15, 0.1); // C5
    setTimeout(() => this.playBeep(659.25, 'sine', 0.2, 0.1), 100); // E5
    setTimeout(() => this.playBeep(783.99, 'sine', 0.35, 0.12), 200); // G5
  }

  playWrong() {
    this.playBeep(220, 'sawtooth', 0.25, 0.1); // A3
    setTimeout(() => this.playBeep(180, 'sawtooth', 0.4, 0.12), 150);
  }

  playChest() {
    this.playBeep(440, 'triangle', 0.15, 0.1);
    setTimeout(() => this.playBeep(554.37, 'triangle', 0.15, 0.1), 100);
    setTimeout(() => this.playBeep(659.25, 'triangle', 0.15, 0.1), 200);
    setTimeout(() => this.playBeep(880, 'sine', 0.4, 0.12), 300);
  }

  playTrap() {
    this.playBeep(130, 'sawtooth', 0.5, 0.15);
  }
}

const sounds = new SoundEffects();

export default function App() {
  // Navigation Router: selection, local, student, teacher
  const [viewMode, setViewMode] = useState<'selection' | 'local' | 'student' | 'teacher'>('selection');

  // Audio globally
  const [audioOn, setAudioOn] = useState<boolean>(true);

  // Sync audio state
  useEffect(() => {
    sounds.enabled = audioOn;
  }, [audioOn]);

  // ==========================================
  // LOCAL GAME MODE STATE MACHINE (PHASE 1)
  // ==========================================
  const [localScreen, setLocalScreen] = useState<'setup' | 'board' | 'handoff' | 'victory'>('setup');
  
  // Local Player Setup
  const [localPlayerCount, setLocalPlayerCount] = useState<1 | 2 | 3 | 4>(1);
  const [localSetupPlayers, setLocalSetupPlayers] = useState<Array<{ name: string; grade: 10 | 11 | 12; color: number; avatar: number }>>([
    { name: 'Player 1', grade: 11, color: 0, avatar: 0 },
    { name: 'Player 2', grade: 10, color: 1, avatar: 1 },
    { name: 'Player 3', grade: 12, color: 2, avatar: 2 },
    { name: 'Player 4', grade: 11, color: 3, avatar: 3 }
  ]);
  
  // Active Local Players
  interface LocalPlayer {
    id: string;
    name: string;
    grade: 10 | 11 | 12 | 'mixed';
    isBot: boolean;
    color: string;
    avatar: string;
    position: number;
    xp: number;
    coins: number;
    streak: number;
    streakRecord: number;
    answersCorrect: number;
    answersTotal: number;
    totalTimeSpent: number;
    skipNextTurn: boolean;
    wasInLastPlace: boolean;
  }
  
  const [localPlayers, setLocalPlayers] = useState<LocalPlayer[]>([]);
  const [localTurnIdx, setLocalTurnIdx] = useState<number>(0);
  const [localMapName, setLocalMapName] = useState<string>('Mixed Map');
  const [localAskedQs, setLocalAskedQs] = useState<Record<string, string[]>>({});
  
  // Rolling & Move anim
  const [localIsRolling, setLocalIsRolling] = useState<boolean>(false);
  const [localCurrentRoll, setLocalCurrentRoll] = useState<number | null>(null);
  const [localIsMoving, setLocalIsMoving] = useState<boolean>(false);
  const [localLandingTile, setLocalLandingTile] = useState<Tile | null>(null);
  
  const [localTrapEffect, setLocalTrapEffect] = useState<'moveBack' | 'skipTurn' | null>(null);
  const [localTreasureChoice, setLocalTreasureChoice] = useState<'decision' | 'safe' | 'challenge'>('decision');
  
  // Quiz
  const [localActiveQuestion, setLocalActiveQuestion] = useState<Question | null>(null);
  const [localSelectedOptIdx, setLocalSelectedOptIdx] = useState<number | null>(null);
  const [localTimerRemaining, setLocalTimerRemaining] = useState<number>(20);
  const [localQuizPhase, setLocalQuizPhase] = useState<'answering' | 'result'>('answering');
  const [localQuestionStartTime, setLocalQuestionStartTime] = useState<number>(0);
  
  // Float score popup
  const [localScorePopup, setLocalScorePopup] = useState<{ text: string; success: boolean } | null>(null);
  const [localShowTutorial, setLocalShowTutorial] = useState<boolean>(false);

  const localBotTimeoutRef = useRef<any>(null);
  const localTimerIntervalRef = useRef<any>(null);

  // local quiz timer hook
  useEffect(() => {
    if (localActiveQuestion && localQuizPhase === 'answering' && viewMode === 'local' && localScreen === 'board') {
      if (localTimerIntervalRef.current) clearInterval(localTimerIntervalRef.current);
      localTimerIntervalRef.current = setInterval(() => {
        setLocalTimerRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(localTimerIntervalRef.current);
            localHandleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (localTimerIntervalRef.current) clearInterval(localTimerIntervalRef.current);
    }
    return () => {
      if (localTimerIntervalRef.current) clearInterval(localTimerIntervalRef.current);
    };
  }, [localActiveQuestion, localQuizPhase, viewMode, localScreen]);

  // Automated bot rolls
  useEffect(() => {
    if (viewMode === 'local' && localScreen === 'board') {
      const activeP = localPlayers[localTurnIdx];
      if (activeP && activeP.isBot && !localIsRolling && !localIsMoving && !localLandingTile && !localActiveQuestion) {
        localBotTimeoutRef.current = setTimeout(() => {
          localTriggerDiceRoll();
        }, 1800);
      }
    }
    return () => {
      if (localBotTimeoutRef.current) clearTimeout(localBotTimeoutRef.current);
    };
  }, [localTurnIdx, localPlayers, localScreen, viewMode, localIsRolling, localIsMoving, localLandingTile, localActiveQuestion]);

  // ==========================================
  // LOCAL GAME FLOW RESOLUTION HANDLERS
  // ==========================================

  const localInitializeGame = () => {
    sounds.playBeep(523, 'sine', 0.15);
    const humans = localPlayerCount;
    const activeList: LocalPlayer[] = [];
    const grades: Array<10 | 11 | 12> = [];

    for (let i = 0; i < humans; i++) {
      const sp = localSetupPlayers[i];
      activeList.push({
        id: `human_${i}`,
        name: sp.name.trim() || `Player ${i + 1}`,
        grade: sp.grade,
        isBot: false,
        color: PRESET_COLORS[sp.color].value,
        avatar: PRESET_AVATARS[sp.avatar].icon,
        position: 0,
        xp: 0,
        coins: 10,
        streak: 0,
        streakRecord: 0,
        answersCorrect: 0,
        answersTotal: 0,
        totalTimeSpent: 0,
        skipNextTurn: false,
        wasInLastPlace: false
      });
      grades.push(sp.grade);
    }

    if (humans === 1) {
      activeList.push({
        id: 'bot_1',
        name: 'Compiler-Bot',
        grade: 'mixed',
        isBot: true,
        color: 'bg-purple-600 text-white border-purple-300',
        avatar: '🤖',
        position: 0,
        xp: 0,
        coins: 10,
        streak: 0,
        streakRecord: 0,
        answersCorrect: 0,
        answersTotal: 0,
        totalTimeSpent: 0,
        skipNextTurn: false,
        wasInLastPlace: false
      });
      activeList.push({
        id: 'bot_2',
        name: 'Binary-Beast',
        grade: 'mixed',
        isBot: true,
        color: 'bg-slate-600 text-white border-slate-300',
        avatar: '👾',
        position: 0,
        xp: 0,
        coins: 10,
        streak: 0,
        streakRecord: 0,
        answersCorrect: 0,
        answersTotal: 0,
        totalTimeSpent: 0,
        skipNextTurn: false,
        wasInLastPlace: false
      });
    }

    let mapName = 'Mixed Map';
    const allSame = grades.every(g => g === grades[0]);
    if (allSame) {
      if (grades[0] === 10) mapName = 'The Isle of Basics (Class 10)';
      else if (grades[0] === 11) mapName = 'The Function Jungle (Class 11)';
      else if (grades[0] === 12) mapName = 'The Data Fortress (Class 12)';
    }

    setLocalPlayers(activeList);
    setLocalMapName(mapName);
    setLocalTurnIdx(0);
    setLocalAskedQs({});
    setLocalScreen('board');
  };

  const localTriggerDiceRoll = () => {
    if (localIsRolling || localIsMoving || localActiveQuestion || localLandingTile) return;
    
    setLocalIsRolling(true);
    setLocalCurrentRoll(null);
    sounds.playRoll();

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setLocalCurrentRoll(roll);
      setLocalIsRolling(false);
      localAnimateMovement(roll);
    }, 1200);
  };

  const localAnimateMovement = (roll: number) => {
    setLocalIsMoving(true);
    let steps = 0;
    const interval = setInterval(() => {
      if (steps < roll) {
        setLocalPlayers(prev => prev.map((p, idx) => {
          if (idx === localTurnIdx) {
            return { ...p, position: Math.min(BOARD_TILES.length - 1, p.position + 1) };
          }
          return p;
        }));
        sounds.playStep();
        steps++;
      } else {
        clearInterval(interval);
        setLocalIsMoving(false);
        setTimeout(() => {
          localResolveLandedTile();
        }, 300);
      }
    }, 350);
  };

  const localResolveLandedTile = () => {
    const activeP = localPlayers[localTurnIdx];
    const tile = BOARD_TILES[activeP.position];
    setLocalLandingTile(tile);

    // Track if ever in last place
    const minPos = Math.min(...localPlayers.map(p => p.position));
    if (activeP.position === minPos) {
      setLocalPlayers(prev => prev.map((p, idx) => idx === localTurnIdx ? { ...p, wasInLastPlace: true } : p));
    }

    if (tile.type === 'start') {
      setTimeout(() => localPassTurn(), 1000);
    } else if (tile.type === 'finish') {
      localTriggerVictory();
    } else if (tile.type === 'question') {
      localPullQuestion('medium');
    } else if (tile.type === 'boss') {
      sounds.playBeep(330, 'square', 0.3, 0.15);
      localPullQuestion('hard');
    } else if (tile.type === 'trap') {
      sounds.playTrap();
      const randTrap = Math.random() < 0.5 ? 'moveBack' : 'skipTurn';
      setLocalTrapEffect(randTrap);
      if (activeP.isBot) {
        setTimeout(() => localResolveTrap(randTrap), 2000);
      }
    } else if (tile.type === 'treasure') {
      sounds.playChest();
      setLocalTreasureChoice('decision');
      if (activeP.isBot) {
        setTimeout(() => localSelectTreasure('challenge'), 1800);
      }
    }
  };

  const localPullQuestion = (difficulty: 'easy' | 'medium' | 'hard') => {
    const activeP = localPlayers[localTurnIdx];
    const grade = activeP.isBot ? 'mixed' : activeP.grade;
    const askedList = localAskedQs[activeP.id] || [];

    let pool = questionBank.filter(q => {
      if (q.difficulty !== difficulty) return false;
      if (grade !== 'mixed' && q.grade !== grade) return false;
      return true;
    });

    if (pool.length === 0) pool = questionBank.filter(q => q.difficulty === difficulty);
    
    let unasked = pool.filter(q => !askedList.includes(q.id));
    if (unasked.length === 0) {
      unasked = pool;
      setLocalAskedQs(prev => ({ ...prev, [activeP.id]: [] }));
    }

    const q = unasked[Math.floor(Math.random() * unasked.length)] || pool[0];
    
    setLocalAskedQs(prev => ({
      ...prev,
      [activeP.id]: [...(prev[activeP.id] || []), q.id]
    }));

    setLocalActiveQuestion(q);
    setLocalSelectedOptIdx(null);
    setLocalTimerRemaining(20);
    setLocalQuizPhase('answering');
    setLocalQuestionStartTime(Date.now());

    if (activeP.isBot) {
      localBotTimeoutRef.current = setTimeout(() => {
        const correct = Math.random() < 0.70;
        let selection = q.correctIndex;
        if (!correct) {
          const incorrects = q.options.map((_, i) => i).filter(i => i !== q.correctIndex);
          selection = incorrects[Math.floor(Math.random() * incorrects.length)];
        }
        localSubmitAnswer(selection);
      }, 1800);
    }
  };

  const localSubmitAnswer = (oIdx: number) => {
    if (localQuizPhase !== 'answering' || !localActiveQuestion) return;
    
    setLocalSelectedOptIdx(oIdx);
    setLocalQuizPhase('result');
    const isCorrect = oIdx === localActiveQuestion.correctIndex;
    const timeSpent = (Date.now() - localQuestionStartTime) / 1000;

    if (isCorrect) {
      sounds.playCorrect();
      
      let xp = 15;
      let coins = 5;
      if (localLandingTile?.type === 'boss') {
        xp = 50;
        coins = 15;
      } else if (localActiveQuestion.difficulty === 'easy') {
        xp = 10;
      } else if (localActiveQuestion.difficulty === 'hard') {
        xp = 25;
      }

      const activeP = localPlayers[localTurnIdx];
      const nextStreak = activeP.streak + 1;
      let streakBonus = 0;
      let text = `+${xp} XP · +${coins} Coins`;

      if (nextStreak === 3) {
        streakBonus = 5;
        text += ` · +5 Streak Bonus! 🔥`;
      }

      setLocalScorePopup({ text, success: true });

      setLocalPlayers(prev => prev.map((p, idx) => {
        if (idx === localTurnIdx) {
          return {
            ...p,
            xp: p.xp + xp,
            coins: p.coins + coins + streakBonus,
            streak: nextStreak,
            streakRecord: Math.max(p.streakRecord, nextStreak),
            answersCorrect: p.answersCorrect + 1,
            answersTotal: p.answersTotal + 1,
            totalTimeSpent: p.totalTimeSpent + timeSpent
          };
        }
        return p;
      }));

      if (localTreasureChoice === 'challenge') setLocalTreasureChoice('safe');
    } else {
      sounds.playWrong();
      setLocalScorePopup({ text: 'Wrong Answer!', success: false });

      setLocalPlayers(prev => prev.map((p, idx) => {
        if (idx === localTurnIdx) {
          return {
            ...p,
            streak: 0,
            answersTotal: p.answersTotal + 1,
            totalTimeSpent: p.totalTimeSpent + timeSpent
          };
        }
        return p;
      }));

      if (localLandingTile?.type === 'question' || localLandingTile?.type === 'boss') {
        setTimeout(() => localApplyBacktrack(2), 2200);
        return;
      } else if (localTreasureChoice === 'challenge') {
        setTimeout(() => {
          setLocalTreasureChoice('safe');
          setLocalScorePopup(null);
          setLocalActiveQuestion(null);
          setLocalLandingTile(null);
          localPassTurn();
        }, 2500);
        return;
      }
    }

    setTimeout(() => {
      setLocalScorePopup(null);
      setLocalActiveQuestion(null);
      setLocalLandingTile(null);
      localPassTurn();
    }, 3800);
  };

  const localHandleTimeOut = () => {
    if (localQuizPhase !== 'answering') return;
    sounds.playWrong();
    setLocalQuizPhase('result');
    setLocalScorePopup({ text: 'Time Out! ⏰', success: false });
    
    setLocalPlayers(prev => prev.map((p, idx) => {
      if (idx === localTurnIdx) {
        return {
          ...p,
          streak: 0,
          answersTotal: p.answersTotal + 1,
          totalTimeSpent: p.totalTimeSpent + 20
        };
      }
      return p;
    }));

    if (localLandingTile?.type === 'question' || localLandingTile?.type === 'boss') {
      setTimeout(() => localApplyBacktrack(2), 2200);
    } else {
      setTimeout(() => {
        setLocalScorePopup(null);
        setLocalActiveQuestion(null);
        setLocalLandingTile(null);
        localPassTurn();
      }, 2500);
    }
  };

  const localApplyBacktrack = (steps: number) => {
    setLocalScorePopup({ text: `Retreating ${steps} Tiles! 🕸️`, success: false });
    let backSteps = 0;
    const interval = setInterval(() => {
      if (backSteps < steps) {
        setLocalPlayers(prev => prev.map((p, idx) => idx === localTurnIdx ? { ...p, position: Math.max(0, p.position - 1) } : p));
        sounds.playStep();
        backSteps++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setLocalScorePopup(null);
          setLocalActiveQuestion(null);
          setLocalLandingTile(null);
          localPassTurn();
        }, 1000);
      }
    }, 350);
  };

  const localResolveTrap = (type: 'moveBack' | 'skipTurn') => {
    setLocalTrapEffect(null);
    if (type === 'moveBack') {
      localApplyBacktrack(2);
    } else {
      setLocalPlayers(prev => prev.map((p, idx) => idx === localTurnIdx ? { ...p, skipNextTurn: true } : p));
      setLocalLandingTile(null);
      localPassTurn();
    }
  };

  const localSelectTreasure = (choice: 'safe' | 'challenge') => {
    if (choice === 'safe') {
      sounds.playCorrect();
      setLocalPlayers(prev => prev.map((p, idx) => idx === localTurnIdx ? { ...p, coins: p.coins + 15, xp: p.xp + 10 } : p));
      setLocalScorePopup({ text: '+10 XP · +15 Coins Gained! 🪙', success: true });
      setTimeout(() => {
        setLocalScorePopup(null);
        setLocalLandingTile(null);
        localPassTurn();
      }, 2000);
    } else {
      setLocalTreasureChoice('challenge');
      localPullQuestion('easy');
    }
  };

  const localPassTurn = () => {
    const nextIdx = (localTurnIdx + 1) % localPlayers.length;
    const nextP = localPlayers[nextIdx];

    if (nextP.skipNextTurn) {
      setLocalPlayers(prev => prev.map((p, idx) => idx === nextIdx ? { ...p, skipNextTurn: false } : p));
      sounds.playTrap();
      setLocalScorePopup({ text: `${nextP.name}'s turn skipped! 🚫`, success: false });
      setTimeout(() => {
        setLocalScorePopup(null);
        setLocalTurnIdx(nextIdx);
        localPassTurn();
      }, 2000);
      return;
    }

    setLocalTurnIdx(nextIdx);
    
    // Switch to pass device screen if human
    if (!nextP.isBot && localPlayers.filter(p => !p.isBot).length > 1) {
      setLocalScreen('handoff');
    }
  };

  const localTriggerVictory = () => {
    sounds.playChest();
    
    const end = Date.now() + 3000;
    const interval = setInterval(() => {
      if (Date.now() > end) return clearInterval(interval);
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 }
      });
    }, 200);

    setLocalScreen('victory');
  };

  const localCalculateBadges = (player: LocalPlayer): string[] => {
    const earned: string[] = [];
    const acc = player.answersTotal > 0 ? (player.answersCorrect / player.answersTotal) : 0;
    
    if (acc === 1 && player.answersTotal > 0) earned.push('Perfect Round 🎯');
    
    const winnerId = localPlayers.find(p => p.position === 17)?.id;
    if (player.id === winnerId && player.wasInLastPlace) earned.push('Comeback Kid 🦎');

    const averageTimes = localPlayers.map(p => ({
      id: p.id,
      avg: p.answersTotal > 0 ? (p.totalTimeSpent / p.answersTotal) : Infinity
    }));
    const minAvg = Math.min(...averageTimes.map(t => t.avg));
    const pAvg = player.answersTotal > 0 ? (player.totalTimeSpent / player.answersTotal) : Infinity;
    
    if (pAvg === minAvg && pAvg !== Infinity && localPlayers.length > 1) {
      earned.push('Speed Runner ⚡');
    }

    return earned;
  };

  // ==========================================
  // PRIMARY SELECTION & LAYOUT
  // ==========================================

  return (
    <div className="min-h-screen bg-jungle-deep text-offwhite flex flex-col font-sans relative select-none">
      
      {/* Dynamic Hub Navbar */}
      <header className="border-b border-jungle-light bg-jungle-deep/85 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewMode('selection')}>
          <Compass className="text-gold w-8 h-8 animate-pulse-slow" />
          <h1 className="font-adventure text-2xl font-bold text-gold tracking-wide">ByteQuest: Treasure Hunt</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setAudioOn(!audioOn)}
            className="p-2 rounded-lg border border-jungle-light text-offwhite hover:bg-jungle-medium transition-colors"
          >
            {audioOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* R1: SELECTION MENU */}
      {viewMode === 'selection' && (
        <main className="max-w-4xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center w-full">
          <div className="text-center mb-12 relative">
            <h2 className="font-adventure text-5xl sm:text-6xl font-extrabold text-gold mb-2 tracking-wider">ByteQuest</h2>
            <div className="w-32 h-1 bg-gold mx-auto mb-4 rounded-full"></div>
            <p className="text-lg text-gold-light italic">A Dice-Driven Computer Science Revision Adventure</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto w-full">
            
            {/* Mode 1: Local */}
            <button
              onClick={() => { sounds.playBeep(440, 'sine', 0.1); setViewMode('local'); setLocalScreen('setup'); }}
              className="parchment-panel rounded-2xl p-6 text-center hover:scale-105 active:scale-95 transition-all text-jungle-deep flex flex-col items-center justify-between h-72 shadow-lg"
            >
              <div className="my-auto space-y-3">
                <span className="text-5xl block">🎲</span>
                <h3 className="font-adventure text-2xl font-bold text-gold-dark">Local Play</h3>
                <p className="text-xs font-semibold text-jungle-light leading-relaxed">
                  1-4 players or bots on **one device**. Pass-and-play local adventure map.
                </p>
              </div>
              <div className="w-full py-2 bg-jungle-medium text-offwhite rounded-lg text-xs font-bold font-sans uppercase mt-auto">
                Start Offline
              </div>
            </button>

            {/* Mode 2: Student Sync */}
            <button
              onClick={() => { sounds.playBeep(480, 'sine', 0.1); setViewMode('student'); }}
              className="parchment-panel rounded-2xl p-6 text-center hover:scale-105 active:scale-95 transition-all text-jungle-deep flex flex-col items-center justify-between h-72 shadow-lg"
            >
              <div className="my-auto space-y-3">
                <span className="text-5xl block">👥</span>
                <h3 className="font-adventure text-2xl font-bold text-gold-dark">Student Lobby</h3>
                <p className="text-xs font-semibold text-jungle-light leading-relaxed">
                  Join a live classroom **Ludo-style** team match using a Room Code shared by your teacher.
                </p>
              </div>
              <div className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold font-sans uppercase mt-auto">
                Connect Online
              </div>
            </button>

            {/* Mode 3: Teacher Portal */}
            <button
              onClick={() => { sounds.playBeep(520, 'sine', 0.1); setViewMode('teacher'); }}
              className="parchment-panel rounded-2xl p-6 text-center hover:scale-105 active:scale-95 transition-all text-jungle-deep flex flex-col items-center justify-between h-72 shadow-lg"
            >
              <div className="my-auto space-y-3">
                <span className="text-5xl block">🏫</span>
                <h3 className="font-adventure text-2xl font-bold text-gold-dark">Teacher Portal</h3>
                <h5 className="text-[10px] bg-gold/20 text-gold-dark px-2 rounded-full uppercase tracking-wider font-bold h-fit mx-auto mt-0">Instructor Console</h5>
                <p className="text-xs font-semibold text-jungle-light leading-relaxed">
                  Manage syllabus questions, register class rosters, allocate teams, and launch live matches.
                </p>
              </div>
              <div className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold font-sans uppercase mt-auto">
                Teacher Access
              </div>
            </button>

          </div>
        </main>
      )}

      {/* R2: TEACHER DASHBOARD PORTAL */}
      {viewMode === 'teacher' && (
        <TeacherDashboard onBack={() => setViewMode('selection')} socket={socket} />
      )}

      {/* R3: STUDENT LOBBY / LIVE GAMEPLAY */}
      {viewMode === 'student' && (
        <StudentGame onBack={() => setViewMode('selection')} socket={socket} />
      )}

      {/* R4: LOCAL PASS-AND-PLAY SYSTEM (PHASE 1 MODIFIED) */}
      {viewMode === 'local' && (
        <div className="flex-1 flex flex-col">
          {localScorePopup && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
              <div className={`px-6 py-3 rounded-full shadow-2xl font-bold border-2 text-sm ${
                localScorePopup.success ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-red-400 text-white'
              }`}>
                {localScorePopup.text}
              </div>
            </div>
          )}

          {/* S1: LOCAL SETUP */}
          {localScreen === 'setup' && (
            <main className="max-w-4xl mx-auto px-6 py-10 w-full">
              <div className="text-center mb-8">
                <h2 className="font-adventure text-3xl font-bold text-gold">Configure Offline Game</h2>
                <p className="text-gold-light text-sm">Pass the device among players to take turns</p>
              </div>

              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-xl mb-8 flex flex-col items-center gap-3">
                <label className="text-gold-light font-bold">Select Player Count</label>
                <div className="flex gap-2.5">
                  {([1, 2, 3, 4] as const).map(num => (
                    <button
                      key={num}
                      onClick={() => { sounds.playBeep(300 + num*20, 'sine', 0.1); setLocalPlayerCount(num); }}
                      className={`w-12 h-12 rounded-full font-bold text-lg border-2 transition-all flex items-center justify-center ${
                        localPlayerCount === num ? 'bg-gold border-gold text-jungle-deep scale-110 shadow-lg' : 'bg-jungle-deep border-jungle-light text-offwhite'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {Array.from({ length: localPlayerCount }).map((_, idx) => (
                  <div key={idx} className="bg-jungle-medium border border-jungle-light p-5 rounded-xl relative text-xs">
                    <h4 className="font-adventure text-base font-bold text-gold mb-3">Explorer {idx + 1}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gold-light mb-0.5">Explorer Name</label>
                        <input 
                          type="text" 
                          value={localSetupPlayers[idx].name}
                          onChange={(e) => {
                            const list = [...localSetupPlayers];
                            list[idx].name = e.target.value;
                            setLocalSetupPlayers(list);
                          }}
                          placeholder={`Player ${idx + 1}`}
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2 py-1.5 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-gold-light mb-0.5">Grade Syllabus</label>
                        <div className="flex gap-1.5">
                          {([10, 11, 12] as const).map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => {
                                const list = [...localSetupPlayers];
                                list[idx].grade = g;
                                setLocalSetupPlayers(list);
                              }}
                              className={`flex-1 py-1 border rounded-lg font-bold ${
                                localSetupPlayers[idx].grade === g ? 'bg-gold text-jungle-deep border-gold' : 'bg-jungle-deep border-jungle-light'
                              }`}
                            >
                              G{g}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <label className="block text-[10px] font-bold text-gold-light mb-1">Color</label>
                          <div className="flex gap-1">
                            {PRESET_COLORS.map((col, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => {
                                  const list = [...localSetupPlayers];
                                  list[idx].color = cIdx;
                                  setLocalSetupPlayers(list);
                                }}
                                className={`w-5 h-5 rounded-full ${localSetupPlayers[idx].color === cIdx ? 'ring-2 ring-gold border-white' : ''}`}
                                style={{ backgroundColor: col.hex }}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gold-light mb-1">Avatar</label>
                          <div className="flex gap-1 bg-jungle-deep p-1 rounded">
                            {PRESET_AVATARS.slice(0, 4).map((av, aIdx) => (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => {
                                  const list = [...localSetupPlayers];
                                  list[idx].avatar = aIdx;
                                  setLocalSetupPlayers(list);
                                }}
                                className={`text-base p-0.5 rounded ${localSetupPlayers[idx].avatar === aIdx ? 'bg-gold/20' : ''}`}
                              >
                                {av.icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {localPlayerCount === 1 && (
                  <div className="bg-jungle-medium/40 border border-jungle-light/45 p-6 rounded-xl flex flex-col justify-center text-center text-xs">
                    <h4 className="font-adventure text-gold font-bold mb-2">Auto Opponents Added</h4>
                    <p className="text-[10px] text-offwhite/70 italic mb-4">Compiler-Bot (🤖) & Binary-Beast (👾) will race against you.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3">
                <button 
                  onClick={localInitializeGame}
                  className="px-10 py-4 bg-gold hover:bg-gold-light text-jungle-deep rounded-full font-bold text-base shadow-xl"
                >
                  Start Game Map
                </button>
                <button 
                  onClick={() => setViewMode('selection')}
                  className="px-6 py-4 bg-jungle-medium border border-jungle-light rounded-full text-xs font-bold"
                >
                  Back
                </button>
              </div>
            </main>
          )}

          {/* S2: LOCAL HANDOFF */}
          {localScreen === 'handoff' && (
            <main className="max-w-md mx-auto px-6 py-20 flex-1 flex flex-col justify-center w-full">
              <div className="parchment-panel rounded-xl p-8 text-center text-jungle-deep shadow-2xl">
                <span className="text-3xl block mb-2">📱</span>
                <h3 className="font-adventure text-2xl font-bold mb-2">Pass the Device</h3>
                <p className="text-xs text-jungle-light mb-6">Pass the screen to the next explorer:</p>
                <div className="bg-jungle-deep text-offwhite p-4 rounded-xl mb-8 flex items-center justify-center gap-3">
                  <span className="text-3xl">{localPlayers[localTurnIdx]?.avatar}</span>
                  <span className="font-adventure text-xl font-bold">{localPlayers[localTurnIdx]?.name}</span>
                </div>
                <button
                  onClick={() => setLocalScreen('board')}
                  className="w-full py-3.5 bg-gold text-jungle-deep rounded-xl font-bold hover:bg-gold-light border border-gold-dark"
                >
                  Ready!
                </button>
              </div>
            </main>
          )}

          {/* S3: LOCAL BOARD PLAY */}
          {localScreen === 'board' && localPlayers.length > 0 && (
            <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full animate-pulse-slow">
              <div className="lg:col-span-3 flex flex-col gap-6">
                <div className="bg-jungle-medium border border-jungle-light p-4 rounded-2xl overflow-x-auto relative">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gold font-adventure text-lg font-bold tracking-wide">Offline Trail: {localMapName}</span>
                  </div>

                  <div className="relative min-w-[700px] h-[550px] bg-parchment rounded-xl shadow-inner border-4 border-gold-dark/40 overflow-hidden" style={{ backgroundImage: "radial-gradient(#dfd4b7 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <path d={`M ${TILE_COORDS.map(c => `${c.x}%, ${c.y}%`).join(' L ')}`} fill="none" className="map-connector" />
                    </svg>

                    {BOARD_TILES.map((tile, tIdx) => {
                      const coord = TILE_COORDS[tIdx];
                      let symbol = '📜';
                      let color = 'bg-[#E5D6B3] border-gold-dark text-jungle-deep';
                      if (tile.type === 'start') { symbol = '⛺'; color = 'bg-teal-700 border-teal-500 text-white'; }
                      else if (tile.type === 'finish') { symbol = '👑'; color = 'bg-amber-600 border-amber-400 text-white'; }
                      else if (tile.type === 'trap') { symbol = '🕸️'; color = 'bg-rose-900 border-rose-600 text-rose-100'; }
                      else if (tile.type === 'treasure') { symbol = '🎁'; color = 'bg-amber-700 border-gold text-gold-glow'; }
                      else if (tile.type === 'boss') { symbol = '🐉'; color = 'bg-indigo-950 border-indigo-500 text-indigo-200'; }

                      return (
                        <div key={tIdx} className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl font-bold shadow ${color}`} style={{ left: `${coord.x}%`, top: `${coord.y}%` }}>
                          <span>{symbol}</span>
                          <span className="absolute -bottom-1 -right-1 text-[9px] w-4.5 h-4.5 bg-jungle-deep text-gold rounded-full flex items-center justify-center border border-gold/40">{tIdx}</span>
                        </div>
                      );
                    })}

                    {localPlayers.map((p, idx) => {
                      const coord = TILE_COORDS[p.position];
                      const onTile = localPlayers.filter(pl => pl.position === p.position);
                      const sameIdx = onTile.findIndex(pl => pl.id === p.id);
                      const offX = (sameIdx - (onTile.length - 1) / 2) * 16;
                      
                      return (
                        <div key={p.id} className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 flex items-center justify-center text-xl shadow-lg transition-all duration-300 z-20 ${p.color} ${localTurnIdx === idx ? 'ring-4 ring-gold' : ''}`} style={{ left: `calc(${coord.x}% + ${offX}px)`, top: `calc(${coord.y}% - 14px)` }}>
                          <span>{p.avatar}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl border-2 ${localPlayers[localTurnIdx]?.color}`}>
                      {localPlayers[localTurnIdx]?.avatar}
                    </div>
                    <div>
                      <span className="text-xs text-gold-light font-bold uppercase tracking-wider block font-sans">Active Explorer</span>
                      <span className="text-2xl font-adventure font-bold text-gold">{localPlayers[localTurnIdx]?.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {localCurrentRoll !== null && !localIsRolling && !localIsMoving && (
                      <div className="bg-jungle-deep px-4 py-2 border border-gold/30 rounded-xl font-bold">
                        🎲 {localCurrentRoll}
                      </div>
                    )}
                    <button
                      onClick={localTriggerDiceRoll}
                      disabled={localIsRolling || localIsMoving || localPlayers[localTurnIdx]?.isBot || localActiveQuestion !== null || localLandingTile !== null}
                      className="px-8 py-4 bg-gold hover:bg-gold-light text-jungle-deep disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold font-adventure"
                    >
                      Roll Dice
                    </button>
                  </div>
                </div>
              </div>

              {/* Roster leaderboard */}
              <div className="flex flex-col gap-6">
                <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
                  <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2 mb-4">Leaderboard</h3>
                  <div className="space-y-3 text-xs">
                    {localPlayers.slice().sort((a,b)=>b.position - a.position || b.xp - a.xp).map((p, idx) => (
                      <div key={p.id} className="p-3 bg-jungle-deep/50 border border-jungle-light/40 rounded-xl">
                        <div className="flex justify-between font-bold mb-1.5">
                          <span>#{idx+1} {p.avatar} {p.name}</span>
                          {p.streak >= 3 && <span className="text-rose-500">🔥 {p.streak}</span>}
                        </div>
                        <div className="grid grid-cols-3 gap-1 bg-jungle-medium/30 p-1.5 rounded font-mono text-center">
                          <div><span className="text-[9px] block text-offwhite/50">XP</span><span className="font-bold">{p.xp}</span></div>
                          <div><span className="text-[9px] block text-offwhite/50">Gold</span><span className="font-bold">{p.coins}</span></div>
                          <div><span className="text-[9px] block text-offwhite/50">Tile</span><span className="font-bold">{p.position}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* CLAW TRAP PANEL */}
          {localScreen === 'board' && localLandingTile && localLandingTile.type === 'trap' && localTrapEffect && (
            <div className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="parchment-panel rounded-xl max-w-sm w-full p-6 text-center text-jungle-deep">
                <AlertTriangle className="w-16 h-16 text-rose-700 mx-auto mb-3" />
                <h3 className="font-adventure text-2xl font-bold mb-4">Trap Sprung!</h3>
                <div className="bg-jungle-deep text-offwhite p-4 rounded-xl mb-6">
                  {localTrapEffect === 'moveBack' ? 'Slide Back 2 Tiles! 📉' : 'Skip Next Turn! 🚫'}
                </div>
                {!localPlayers[localTurnIdx]?.isBot && (
                  <button onClick={() => localResolveTrap(localTrapEffect)} className="w-full py-3 bg-jungle-medium text-offwhite font-bold rounded-lg border border-gold">OK</button>
                )}
              </div>
            </div>
          )}

          {/* TREASURE CHEST DECISION */}
          {localScreen === 'board' && localLandingTile && localLandingTile.type === 'treasure' && localTreasureChoice === 'decision' && (
            <div className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="parchment-panel rounded-xl max-w-md w-full p-6 text-center text-jungle-deep">
                <span className="text-5xl block mb-2">🎁</span>
                <h3 className="font-adventure text-2xl font-bold mb-4">Landed on Treasure Chest!</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => localSelectTreasure('safe')} className="p-3 bg-emerald-100 border border-emerald-500 rounded-xl font-bold text-xs text-emerald-950">Safe Reward (+15 gold)</button>
                  <button onClick={() => localSelectTreasure('challenge')} className="p-3 bg-amber-100 border border-gold rounded-xl font-bold text-xs text-amber-950">Double Challenge MCQ</button>
                </div>
              </div>
            </div>
          )}

          {/* LOCAL ACTIVE QUIZ */}
          {localScreen === 'board' && localActiveQuestion && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="parchment-panel rounded-2xl max-w-xl w-full p-6 text-jungle-deep relative">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gold-dark/20 text-xs">
                  <span>Topic: {localActiveQuestion.topic}</span>
                  {localQuizPhase === 'answering' && <span className="font-bold">⏰ {localTimerRemaining}s</span>}
                </div>

                <p className="text-lg font-semibold mb-6 leading-relaxed">{localActiveQuestion.question}</p>

                <div className="space-y-3 mb-6">
                  {localActiveQuestion.options.map((opt: string, oIdx: number) => {
                    let style = 'bg-parchment-light border-gold-dark/45';
                    if (localQuizPhase === 'result') {
                      if (oIdx === localActiveQuestion.correctIndex) style = 'bg-emerald-100 border-emerald-500 text-emerald-950';
                      else if (localSelectedOptIdx === oIdx) style = 'bg-rose-100 border-rose-500 text-rose-950';
                    }
                    return (
                      <button
                        key={oIdx}
                        onClick={() => localSubmitAnswer(oIdx)}
                        disabled={localQuizPhase !== 'answering' || localPlayers[localTurnIdx]?.isBot}
                        className={`w-full text-left p-3 rounded-lg border font-semibold ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {localQuizPhase === 'result' && (
                  <div className="bg-jungle-deep text-offwhite p-3 rounded-lg text-xs">{localActiveQuestion.explanation}</div>
                )}
              </div>
            </div>
          )}

          {/* LOCAL VICTORY SUMMARY */}
          {localScreen === 'victory' && (
            <main className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
              <span className="text-7xl block mb-2">🏆</span>
              <h2 className="font-adventure text-4xl font-extrabold text-gold mb-8">Victory Achieved!</h2>
              
              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl w-full mb-8">
                <table className="w-full text-left text-xs border-collapse font-semibold">
                  <thead>
                    <tr className="border-b border-jungle-light text-gold-light uppercase">
                      <th className="py-2.5 px-1">Explorer</th>
                      <th className="py-2.5 px-1 text-center">XP</th>
                      <th className="py-2.5 px-1 text-center">Gold</th>
                      <th className="py-2.5 px-1 text-center">Accuracy</th>
                      <th className="py-2.5 px-1 text-center">Badges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localPlayers.map(p => (
                      <tr key={p.id} className="border-b border-jungle-light/20">
                        <td className="py-3 px-1">{p.avatar} {p.name}</td>
                        <td className="py-3 px-1 text-center text-gold">{p.xp}</td>
                        <td className="py-3 px-1 text-center text-gold">{p.coins}</td>
                        <td className="py-3 px-1 text-center text-emerald-400">
                          {p.answersTotal > 0 ? ((p.answersCorrect / p.answersTotal) * 100).toFixed(0) : 0}%
                        </td>
                        <td className="py-3 px-1 text-center">
                          {localCalculateBadges(p).map((b, bIdx) => (
                            <span key={bIdx} className="bg-amber-950 border border-gold/45 text-gold-glow text-[9px] px-2 py-0.5 rounded-full inline-block mx-0.5">{b}</span>
                          )) || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button 
                onClick={() => { sounds.playBeep(440, 'sine', 0.1); setLocalScreen('setup'); }}
                className="px-10 py-4 bg-gold text-jungle-deep rounded-full font-bold text-base shadow-xl"
              >
                Restart Session
              </button>
            </main>
          )}
        </div>
      )}

    </div>
  );
}
