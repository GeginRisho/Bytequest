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
  BookOpen,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';

// Imports from split files
import { questionBank, Question } from './questions';
import { Tile, BOARD_TILES, TILE_COORDS, PRESET_COLORS, PRESET_AVATARS } from './config';
import TeacherDashboard from './components/TeacherDashboard';
import StudentGame from './components/StudentGame';

const getTokenOffset = (indexOnTile: number, totalOnTile: number) => {
  if (totalOnTile <= 1) return { x: 0, y: 0 };
  const angle = (indexOnTile / totalOnTile) * 2 * Math.PI - Math.PI / 2;
  const isMobile = window.innerWidth < 768;
  const radius = isMobile ? 8 : 14;
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius)
  };
};

// Connect Socket.io client to backend server
const socket = io(import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`, {
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
  const [localLevelUpTo, setLocalLevelUpTo] = useState<number | null>(null);
  
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
    botDifficulty?: 'easy' | 'medium' | 'hard';
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
  const [localIsFirstQuestion, setLocalIsFirstQuestion] = useState<boolean>(true);
  const [localPendingRetryQuestion, setLocalPendingRetryQuestion] = useState<Question | null>(null);
  
  // Float score popup
  const [localScorePopup, setLocalScorePopup] = useState<{ text: string; success: boolean } | null>(null);
  const [localShowTutorial, setLocalShowTutorial] = useState<boolean>(false);

  const localBotRollTimeoutRef = useRef<any>(null);
  const localBotThinkTimeoutRef = useRef<any>(null);
  const localTimerIntervalRef = useRef<any>(null);
  const localSubmitAnswerRef = useRef<any>(null);

  // Spaced Repetition Bot to Player & No Repeats pools
  const [localPendingBotQuestions, setLocalPendingBotQuestions] = useState<any[]>([]);
  const [localPlayerSolvedQuestionIds, setLocalPlayerSolvedQuestionIds] = useState<string[]>([]);
  const [localBotSolvedQuestionIds, setLocalBotSolvedQuestionIds] = useState<string[]>([]);

  // Fast bot think time calculator: Easy 2-3s, Medium 3-4s, Hard/Boss 4-5s
  const localGetBotThinkTime = (botDifficulty?: 'easy' | 'medium' | 'hard'): number => {
    if (botDifficulty === 'easy') return 1000;
    if (botDifficulty === 'hard') return 3000;
    return 2000; // default medium
  };





  const saveLocalAdventureState = (players: LocalPlayer[], turnIdx: number, mapName: string, screen: string, askedQs: Record<string, string[]>, pendingBotQs: any[], playerSolved: string[], botSolved: string[]) => {
    const saved = {
      players,
      turnIdx,
      mapName,
      screen,
      askedQs,
      pendingBotQs,
      playerSolved,
      botSolved
    };
    localStorage.setItem('bytequest_local_adventure', JSON.stringify(saved));
  };

  const resumeLocalPracticeGame = (savedState: any) => {
    setLocalPlayers(savedState.players || []);
    setLocalTurnIdx(savedState.turnIdx || 0);
    setLocalMapName(savedState.mapName || 'Mixed Map');
    setLocalScreen(savedState.screen || 'board');
    setLocalAskedQs(savedState.askedQs || {});
    setLocalPendingBotQuestions(savedState.pendingBotQs || []);
    setLocalPlayerSolvedQuestionIds(savedState.playerSolved || []);
    setLocalBotSolvedQuestionIds(savedState.botSolved || []);
    
    setViewMode('local');
    setLocalQuizPhase('answering');
    setLocalActiveQuestion(null);
    setLocalSelectedOptIdx(null);
  };

  // Autosave local adventure game state to localStorage
  useEffect(() => {
    if (viewMode === 'local' && localScreen === 'board' && localPlayers.length > 0) {
      saveLocalAdventureState(
        localPlayers,
        localTurnIdx,
        localMapName,
        localScreen,
        localAskedQs,
        localPendingBotQuestions,
        localPlayerSolvedQuestionIds,
        localBotSolvedQuestionIds
      );
    }
  }, [viewMode, localScreen, localPlayers, localTurnIdx, localMapName, localAskedQs, localPendingBotQuestions, localPlayerSolvedQuestionIds, localBotSolvedQuestionIds]);

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

  // Cleanup local questions and states on screen/mode transition
  useEffect(() => {
    setLocalActiveQuestion(null);
    setLocalLandingTile(null);
    setLocalScorePopup(null);
    if (localBotRollTimeoutRef.current) {
      clearTimeout(localBotRollTimeoutRef.current);
      localBotRollTimeoutRef.current = null;
    }
    if (localBotThinkTimeoutRef.current) {
      clearTimeout(localBotThinkTimeoutRef.current);
      localBotThinkTimeoutRef.current = null;
    }
  }, [localScreen, viewMode, localTurnIdx]);

  // Temporary Turn Check Diagnostic Logging
  useEffect(() => {
    if (viewMode === 'local' && localScreen === 'board') {
      const activeP = localPlayers[localTurnIdx];
      const turnOwnerName = activeP?.name || 'none';
      const isBot = activeP?.isBot || false;
      const isMyTurn = !isBot;
      
      console.log(`[LOCAL DEBUG TURN CHECK] Turn Player: ${turnOwnerName}, isBot: ${isBot}, isMyTurn: ${isMyTurn}, activeQuestion: ${localActiveQuestion ? 'present' : 'null'}`);
    }
  }, [viewMode, localScreen, localTurnIdx, localPlayers, localActiveQuestion]);

  // Automated bot rolls
  useEffect(() => {
    if (viewMode === 'local' && localScreen === 'board') {
      const activeP = localPlayers[localTurnIdx];
      if (activeP && activeP.isBot && !localIsRolling && !localIsMoving && !localLandingTile && !localActiveQuestion) {
        console.log(`[BOT DEBUG] BOT TURN START: ${activeP.name}`);
        localBotRollTimeoutRef.current = setTimeout(() => {
          console.log(`[BOT DEBUG] BOT ROLL: ${activeP.name} triggers roll`);
          localTriggerDiceRoll();
        }, 1800);
      }
    }
    return () => {
      if (localBotRollTimeoutRef.current) {
        clearTimeout(localBotRollTimeoutRef.current);
        localBotRollTimeoutRef.current = null;
      }
    };
  }, [localTurnIdx, localPlayers, localScreen, viewMode, localIsRolling, localIsMoving, localLandingTile, localActiveQuestion]);

  // ==========================================
  // LOCAL GAME FLOW RESOLUTION HANDLERS
  // ==========================================

  const localInitializeGame = () => {
    sounds.playBeep(523, 'sine', 0.15);
    setLocalIsFirstQuestion(true);
    setLocalPendingRetryQuestion(null);
    setLocalPendingBotQuestions([]);
    setLocalPlayerSolvedQuestionIds([]);
    setLocalBotSolvedQuestionIds([]);
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
        botDifficulty: 'easy',
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
        botDifficulty: 'medium',
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
      
      const activeP = localPlayers[localTurnIdx];
      if (activeP.position + roll > 17) {
        setLocalScorePopup({ text: `Rolled ${roll}! Too high to finish. Stay on tile ${activeP.position}.`, success: false });
        setTimeout(() => {
          setLocalScorePopup(null);
          localPassTurn();
        }, 2200);
        return;
      }

      // FIXED: Don't move yet — pull question first
      localPullQuestion(roll);
    }, 1200);
  };

  // Move animation — called AFTER correct answer
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
    // Tile effects (treasure/trap/boss) handled inside localSubmitAnswer
  };

  const localPullQuestion = (roll?: number) => {
    const activeP = localPlayers[localTurnIdx];
    const askedList = localAskedQs[activeP.id] || [];

    // Same-question-reask-next-turn logic!
    if (localPendingRetryQuestion) {
      const q = localPendingRetryQuestion;
      setLocalPendingRetryQuestion(null);
      setLocalActiveQuestion(q);
      setLocalSelectedOptIdx(null);
      setLocalTimerRemaining(20);
      setLocalQuizPhase('answering');
      setLocalQuestionStartTime(Date.now());

      if (activeP.isBot) {
        const botThinkTime = localGetBotThinkTime(activeP.botDifficulty);
        console.log(`[BOT DEBUG] QUESTION RECEIVED (RETRY): "${q.question}"`);
        console.log(`[BOT DEBUG] BOT THINKING: ${activeP.name} will think for ${botThinkTime}ms (Difficulty: ${activeP.botDifficulty})`);
        localBotThinkTimeoutRef.current = setTimeout(() => {
          let correctRate = 0.70;
          if (activeP.botDifficulty === 'easy') correctRate = 0.85;
          else if (activeP.botDifficulty === 'medium') correctRate = 0.70;
          else if (activeP.botDifficulty === 'hard') correctRate = 0.55;

          const correct = Math.random() < correctRate;
          let selection = q.correctIndex;
          if (!correct) {
            const incorrects = q.options.map((_, i) => i).filter(i => i !== q.correctIndex);
            selection = incorrects[Math.floor(Math.random() * incorrects.length)];
          }
          const optLetter = String.fromCharCode(65 + selection);
          console.log(`[BOT DEBUG] BOT SELECTED OPTION ${optLetter}`);
          console.log(`[BOT DEBUG] CALLING submitAnswer() with option index ${selection}`);
          localSubmitAnswerRef.current(selection);
        }, botThinkTime);
      }
      return;
    }

    // Human turn: Check if there are pending questions answered by bot
    if (!activeP.isBot && localPendingBotQuestions.length > 0) {
      const nextQ = localPendingBotQuestions[0];
      setLocalPendingBotQuestions(prev => prev.slice(1));
      
      setLocalActiveQuestion(nextQ);
      setLocalSelectedOptIdx(null);
      setLocalTimerRemaining(20);
      setLocalQuizPhase('answering');
      setLocalQuestionStartTime(Date.now());
      return;
    }

    // Otherwise generate a new question
    const isBossTarget = roll !== undefined && Math.min(BOARD_TILES.length - 1, activeP.position + roll) === 8 ||
      Math.min(BOARD_TILES.length - 1, activeP.position + (roll || 0)) === 16;

    const grade = activeP.isBot ? 'mixed' : activeP.grade;
    
    // Easy Questions First & Difficulty progression: Easy -> Easy -> Medium -> Medium -> Hard
    let targetDifficulty: 'easy' | 'medium' | 'hard';
    if (isBossTarget) {
      targetDifficulty = 'hard';
    } else {
      const corrects = activeP.answersCorrect;
      if (corrects < 2) targetDifficulty = 'easy';
      else if (corrects < 4) targetDifficulty = 'medium';
      else targetDifficulty = 'hard';
    }

    let pool = questionBank.filter(q => {
      if (q.difficulty !== targetDifficulty) return false;
      if (grade !== 'mixed' && q.grade !== grade) return false;
      // Do not repeat questions
      if (localPlayerSolvedQuestionIds.includes(q.id)) return false;
      if (localBotSolvedQuestionIds.includes(q.id)) return false;
      if (localPendingBotQuestions.some(pq => pq.id === q.id)) return false;
      return true;
    });

    if (pool.length === 0) {
      pool = questionBank.filter(q => {
        if (q.difficulty !== targetDifficulty) return false;
        if (localPlayerSolvedQuestionIds.includes(q.id)) return false;
        if (localBotSolvedQuestionIds.includes(q.id)) return false;
        return true;
      });
    }

    if (pool.length === 0) {
      pool = questionBank.filter(q => {
        if (localPlayerSolvedQuestionIds.includes(q.id)) return false;
        return true;
      });
    }

    if (pool.length === 0) pool = [...questionBank];
    
    const q = pool[Math.floor(Math.random() * pool.length)] || questionBank[0];
    
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
      const botThinkTime = localGetBotThinkTime(activeP.botDifficulty);
      console.log(`[BOT DEBUG] QUESTION RECEIVED: "${q.question}"`);
      console.log(`[BOT DEBUG] BOT THINKING: ${activeP.name} will think for ${botThinkTime}ms (Difficulty: ${activeP.botDifficulty})`);
      localBotThinkTimeoutRef.current = setTimeout(() => {
        let correctRate = 0.70;
        if (activeP.botDifficulty === 'easy') correctRate = 0.85;
        else if (activeP.botDifficulty === 'medium') correctRate = 0.70;
        else if (activeP.botDifficulty === 'hard') correctRate = 0.55;

        const correct = Math.random() < correctRate;
        let selection = q.correctIndex;
        if (!correct) {
          const incorrects = q.options.map((_, i) => i).filter(i => i !== q.correctIndex);
          selection = incorrects[Math.floor(Math.random() * incorrects.length)];
        }
        const optLetter = String.fromCharCode(65 + selection);
        console.log(`[BOT DEBUG] BOT SELECTED OPTION ${optLetter}`);
        console.log(`[BOT DEBUG] CALLING submitAnswer() with option index ${selection}`);
        localSubmitAnswerRef.current(selection);
      }, botThinkTime);
    }
  };

  const localSubmitAnswer = (oIdx: number) => {
    const activeP = localPlayers[localTurnIdx];
    if (activeP && activeP.isBot) {
      console.log(`[BOT DEBUG] submitAnswer executing for ${activeP.name}: oIdx=${oIdx}, phase=${localQuizPhase}, hasQuestion=${!!localActiveQuestion}`);
    }
    if (localQuizPhase !== 'answering' || !localActiveQuestion) return;
    
    if (localBotThinkTimeoutRef.current) {
      clearTimeout(localBotThinkTimeoutRef.current);
      localBotThinkTimeoutRef.current = null;
    }

    setLocalSelectedOptIdx(oIdx);
    setLocalQuizPhase('result');
    const isCorrect = oIdx === localActiveQuestion.correctIndex;
    const timeSpent = (Date.now() - localQuestionStartTime) / 1000;
    if (activeP.isBot) {
      console.log(`[BOT DEBUG] ANSWER ACCEPTED: Option ${String.fromCharCode(65 + oIdx)} (Correct: ${isCorrect})`);
    }

    // Tracking solved pools & Spaced Repetition queue
    if (activeP.isBot) {
      setLocalPendingBotQuestions(prev => {
        if (prev.some(pq => pq.id === localActiveQuestion!.id)) return prev;
        return [...prev, localActiveQuestion];
      });
      setLocalBotSolvedQuestionIds(prev => [...prev, localActiveQuestion!.id]);
    } else {
      setLocalPlayerSolvedQuestionIds(prev => [...prev, localActiveQuestion!.id]);
    }

    if (isCorrect) {
      setLocalPendingRetryQuestion(null); // Clear retry!
      sounds.playCorrect();
      
      let xp = 15;
      let coins = 5;
      if (localActiveQuestion.difficulty === 'easy') {
        xp = 10;
      } else if (localActiveQuestion.difficulty === 'hard') {
        xp = 25;
        coins = 15;
      }

      const nextStreak = activeP.streak + 1;
      let streakBonus = 0;
      if (nextStreak % 3 === 0 && nextStreak > 0) {
        streakBonus = 5;
      }

      let popupText = `✅ Correct! +${xp} XP · +${coins + streakBonus} Coins`;
      if (streakBonus > 0) popupText += ` · 🔥 Streak Bonus!`;
      setLocalScorePopup({ text: popupText, success: true });

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

      // FIXED: Move AFTER correct answer
      const roll = localCurrentRoll || 1;
      setTimeout(() => {
        setLocalScorePopup(null);
        setLocalActiveQuestion(null);
        // Animate movement then resolve tile
        localAnimateMovementThenResolve(roll);
      }, 2000);

    } else {
      sounds.playWrong();
      
      // FIXED: Wrong answer = NO movement. Player stays in place.
      setLocalPendingRetryQuestion(localActiveQuestion); // Save for spaced repetition retry!
      
      setLocalScorePopup({ text: `❌ Wrong Answer! 📖 Retry question queued for next turn.`, success: false });

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

      // No backtrack — just clear and pass turn
      setTimeout(() => {
        setLocalScorePopup(null);
        setLocalActiveQuestion(null);
        setLocalLandingTile(null);
        localPassTurn();
      }, 3500);
    }
  };
  localSubmitAnswerRef.current = localSubmitAnswer;

  // Movement animation called AFTER correct answer
  const localAnimateMovementThenResolve = (roll: number) => {
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
        const activeP = localPlayers[localTurnIdx];
        if (activeP && activeP.isBot) {
          console.log(`[BOT DEBUG] BOT MOVE COMPLETE`);
        }
        setTimeout(() => {
          localResolveLandedTileAfterMove();
        }, 300);
      }
    }, 350);
  };

  const localResolveLandedTileAfterMove = () => {
    setLocalPlayers(currentPlayers => {
      const activeP = currentPlayers[localTurnIdx];
      const tile = BOARD_TILES[activeP.position];
      setLocalLandingTile(tile);

      const minPos = Math.min(...currentPlayers.map(p => p.position));
      let updatedPlayers = currentPlayers;
      if (activeP.position === minPos) {
        updatedPlayers = currentPlayers.map((p, idx) => idx === localTurnIdx ? { ...p, wasInLastPlace: true } : p);
      }

      if (tile.type === 'finish') {
        setTimeout(() => localTriggerVictory(), 600);
        return updatedPlayers;
      }

      if (tile.type === 'boss') {
        sounds.playBeep(330, 'square', 0.3, 0.15);
        setLocalScorePopup({ text: '🐉 Boss Tile! Extra XP awarded!', success: true });
        updatedPlayers = updatedPlayers.map((p, idx) => idx === localTurnIdx ? { ...p, xp: p.xp + 30, coins: p.coins + 10 } : p);
      } else if (tile.type === 'treasure') {
        sounds.playChest();
        setLocalScorePopup({ text: '🎁 Treasure! +15 Coins, +10 XP!', success: true });
        updatedPlayers = updatedPlayers.map((p, idx) => idx === localTurnIdx ? { ...p, xp: p.xp + 10, coins: p.coins + 15 } : p);
      } else if (tile.type === 'trap') {
        sounds.playTrap();
        const randTrap = Math.random() < 0.5 ? 'moveBack' : 'skipTurn';
        if (randTrap === 'moveBack') {
          setLocalScorePopup({ text: '🕸️ Trap! Back 2 spaces.', success: false });
          updatedPlayers = updatedPlayers.map((p, idx) => idx === localTurnIdx ? { ...p, position: Math.max(0, p.position - 2) } : p);
        } else {
          setLocalScorePopup({ text: '🚫 Trap! Next turn skipped.', success: false });
          updatedPlayers = updatedPlayers.map((p, idx) => idx === localTurnIdx ? { ...p, skipNextTurn: true } : p);
        }
      }

      setTimeout(() => {
        setLocalScorePopup(null);
        setLocalLandingTile(null);
        localPassTurn();
      }, 2500);

      return updatedPlayers;
    });
  };

  const localHandleTimeOut = () => {
    if (localQuizPhase !== 'answering') return;
    
    if (localBotThinkTimeoutRef.current) {
      clearTimeout(localBotThinkTimeoutRef.current);
      localBotThinkTimeoutRef.current = null;
    }

    sounds.playWrong();
    setLocalQuizPhase('result');
    
    // FIXED: Time out = no movement, retry queued
    setLocalPendingRetryQuestion(localActiveQuestion); // Save for retry!
    setLocalScorePopup({ text: `Time Out! ⏰ Retry question queued for next turn.`, success: false });
    
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

    setTimeout(() => {
      setLocalScorePopup(null);
      setLocalActiveQuestion(null);
      setLocalLandingTile(null);
      localPassTurn();
    }, 3500);
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

  const localPassTurn = () => {
    const nextIdx = (localTurnIdx + 1) % localPlayers.length;
    const nextP = localPlayers[nextIdx];

    console.log(`[BOT DEBUG] TURN COMPLETE. Passing turn from index ${localTurnIdx} to index ${nextIdx} (${nextP.name})`);

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
    
    if (nextP.isBot) {
      setLocalScreen('board');
    } else {
      // Switch to pass device screen if human
      if (localPlayers.filter(p => !p.isBot).length > 1) {
        setLocalScreen('handoff');
      }
    }
  };

  const localTriggerVictory = () => {
    sounds.playChest();
    
    // Reset local level up state
    setLocalLevelUpTo(null);

    // Report match completion to backend database if student is logged in
    const studentId = localStorage.getItem('bytequest_student_id');
    if (studentId) {
      const baseApi = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      fetch(`${baseApi}/api/v1/student/profile/${studentId}/match-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.leveledUp) {
          setLocalLevelUpTo(data.level);
        }
      })
      .catch(err => console.error("Error reporting local match completed:", err));
    }

    const end = Date.now() + 3000;
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        setLocalScreen('victory');
        return;
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 }
      });
    }, 200);
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
        <StudentGame 
          onBack={() => setViewMode('selection')} 
          socket={socket} 
          onStartSoloPractice={() => { sounds.playBeep(440, 'sine', 0.1); setViewMode('local'); setLocalScreen('setup'); }}
          onResumeLocalPractice={resumeLocalPracticeGame}
        />
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
            <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col justify-between relative pb-24">
              {/* STICKY LOCAL PLAY HUD */}
              {localPlayers[localTurnIdx] && (
                <div className="sticky top-14 md:top-0 z-30 bg-jungle-medium/95 backdrop-blur border border-jungle-light px-4 py-2 rounded-xl flex items-center justify-between gap-2 mb-4 shadow-lg text-[10px] md:text-xs font-bold font-adventure text-gold-light animate-fade-in">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{localPlayers[localTurnIdx].avatar}</span>
                    <span className="text-white uppercase tracking-wide">{localPlayers[localTurnIdx].name}</span>
                  </div>
                  <div className="hidden sm:inline">|</div>
                  <div>📚 GRADE <span className="text-white font-mono">{localPlayers[localTurnIdx].grade}</span></div>
                  <div>|</div>
                  <div>⭐ XP <span className="text-white font-mono">{localPlayers[localTurnIdx].xp}</span></div>
                  <div>|</div>
                  <div>🪙 COINS <span className="text-white font-mono">{localPlayers[localTurnIdx].coins}</span></div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full items-start">
                <div className="lg:col-span-3 bg-jungle-medium border border-jungle-light p-3 md:p-4 rounded-2xl md:rounded-3xl relative shadow-2xl w-full flex flex-col gap-3">
                  <div className="relative aspect-[4/3] w-full bg-jungle-deep/45 border border-gold/15 rounded-xl md:rounded-2xl flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#1a3d30,transparent_70%)]"></div>
                    
                    <div className="relative w-[78%] h-[78%] md:w-[90%] md:h-[90%]">
                      
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <path d={`M ${TILE_COORDS.map(c => `${c.x}%, ${c.y}%`).join(' L ')}`} fill="none" className="map-connector" />
                      </svg>

                      {BOARD_TILES.map((tile, tIdx) => {
                        const coord = TILE_COORDS[tIdx];
                        const isSafe = [0, 5, 10, 15, 20].includes(tIdx); // Offline SAFE_TILES matching config
                        const activePlayer = localPlayers[localTurnIdx];
                        const isDestination = activePlayer && activePlayer.position === tIdx;
                        const isOccupied = localPlayers.some((pl: any) => pl.position === tIdx);

                        let symbol = '📜';
                        let color = 'bg-[#E5D6B3] border-gold-dark text-jungle-deep';
                        if (tile.type === 'start') { symbol = '⛺'; color = 'bg-teal-700 border-teal-500 text-white'; }
                        else if (tile.type === 'finish') { symbol = '👑'; color = 'bg-amber-600 border-amber-400 text-white animate-pulse'; }
                        else if (tile.type === 'trap') { symbol = '🕸️'; color = 'bg-rose-900 border-rose-600 text-rose-100'; }
                        else if (tile.type === 'treasure') { 
                          symbol = '🎁'; 
                          color = isOccupied 
                            ? 'bg-amber-700 border-gold text-gold-glow shadow-[0_0_20px_#f59e0b] ring-2 ring-gold/60' 
                            : 'bg-amber-700 border-gold text-gold-glow'; 
                        }
                        else if (tile.type === 'boss') { 
                          symbol = '🐉'; 
                          color = isOccupied 
                            ? 'bg-indigo-950 border-indigo-400 text-indigo-200 shadow-[0_0_20px_#6366f1] ring-2 ring-indigo-500/60' 
                            : 'bg-indigo-950 border-indigo-500 text-indigo-200'; 
                        }

                        const destinationClass = isDestination ? 'ring-4 ring-gold ring-offset-2 ring-offset-jungle-deep shadow-[0_0_25px_#f59e0b] border-gold' : '';
                        const safeClass = isSafe ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#F3EAD3]' : '';

                        return (
                          <div 
                            key={tIdx} 
                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-[30px] h-[30px] sm:w-[52px] sm:h-[52px] rounded-full border-2 flex items-center justify-center text-[10px] sm:text-lg font-bold transition-all duration-300 shadow-md group ${color} ${destinationClass} ${safeClass}`} 
                            style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                          >
                            <span>{symbol}</span>
                            {isSafe && (
                              <div className="absolute -top-1 -left-1 bg-emerald-600 text-white p-0.5 rounded-full border border-white">
                                <Shield className="w-2 h-2" />
                              </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 text-[6px] sm:text-[8px] w-3 h-3 sm:w-4 sm:h-4 bg-jungle-deep text-gold rounded-full flex items-center justify-center border border-gold/40">{tIdx}</span>
                          </div>
                        );
                      })}

                      {localPlayers.map((p, idx) => {
                        const coord = TILE_COORDS[p.position];
                        const onTile = localPlayers.filter(pl => pl.position === p.position);
                        const sameIdx = onTile.findIndex(pl => pl.id === p.id);
                        const offset = getTokenOffset(sameIdx, onTile.length);
                        
                        return (
                          <div 
                            key={p.id} 
                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-[26px] h-[26px] sm:w-[38px] sm:h-[38px] rounded-full border border-2 flex items-center justify-center text-[9px] sm:text-xs font-extrabold shadow-lg transition-all duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] z-20 ${p.color} ${localTurnIdx === idx ? 'ring-3 sm:ring-4 ring-gold animate-bounce-slow' : ''}`} 
                            style={{ 
                              left: `calc(${coord.x}% + ${offset.x}px)`, 
                              top: `calc(${coord.y}% + ${offset.y}px)` 
                            }}
                          >
                            <span>{p.avatar}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* MOBILE DOCKED TURN PANEL - MERGED & DOCKED OUTSIDE PATH */}
                  <div className="flex md:hidden bg-jungle-deep/40 border border-gold/20 p-3 rounded-xl flex-col items-center justify-center gap-2.5 shadow-md select-none text-center">
                    <div>
                      <h4 className="text-gold font-adventure text-sm font-bold block truncate max-w-[200px]" title={localPlayers[localTurnIdx]?.name}>
                        {localPlayers[localTurnIdx]?.name}
                      </h4>
                      <span className="text-[9px] bg-gold/15 text-gold px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block font-sans">
                        Active Explorer
                      </span>
                      {localCurrentRoll !== null && !localIsRolling && !localIsMoving && (
                        <p className="text-gold-glow font-bold font-mono text-[10px] mt-1.5">
                          Rolled: {localCurrentRoll} 🎲
                        </p>
                      )}
                    </div>

                    <div className="flex justify-center items-center py-1">
                      <button
                        onClick={localTriggerDiceRoll}
                        disabled={localIsRolling || localIsMoving || localPlayers[localTurnIdx]?.isBot || localActiveQuestion !== null || localLandingTile !== null}
                        className="w-14 h-14 bg-gold hover:bg-gold-light border border-gold-dark text-jungle-deep rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 disabled:opacity-40 disabled:pointer-events-none transition-all duration-150"
                      >
                        <Dices className={`w-6 h-6 ${localIsRolling ? 'animate-bounce' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* DESKTOP TURN PANEL - HIDDEN ON MOBILE */}
                  <div className="hidden md:flex bg-jungle-medium border border-jungle-light p-6 rounded-2xl flex-col items-center justify-center text-center shadow-xl">
                    <span className="text-[10px] block font-bold text-gold-light uppercase tracking-wider mb-2">Turn Information</span>
                    <div className="mb-4">
                      <span className="font-adventure text-lg font-bold text-white block">
                        {localPlayers[localTurnIdx]?.name}
                      </span>
                      <span className="text-[10px] bg-gold/15 text-gold px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                        Active Explorer
                      </span>
                    </div>

                    <button
                      onClick={localTriggerDiceRoll}
                      disabled={localIsRolling || localIsMoving || localPlayers[localTurnIdx]?.isBot || localActiveQuestion !== null || localLandingTile !== null}
                      className="w-16 h-16 bg-gold border-2 border-gold-dark text-jungle-deep rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 disabled:opacity-40 disabled:pointer-events-none transition-all duration-150"
                    >
                      <Dices className={`w-8 h-8 ${localIsRolling ? 'animate-bounce' : ''}`} />
                    </button>

                    {localCurrentRoll !== null && !localIsRolling && !localIsMoving && (
                      <div className="mt-3 font-adventure text-gold text-lg font-bold">
                        Rolled: {localCurrentRoll} 🎲
                      </div>
                    )}
                  </div>

                {localActiveQuestion && localPlayers[localTurnIdx]?.isBot ? (
                  <div className="bg-jungle-medium border border-indigo-500/50 p-6 rounded-2xl shadow-2xl space-y-4 select-text">
                    <div className="flex justify-between items-center border-b border-jungle-light pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block font-sans">Bot Thinking...</span>
                        <span className="font-adventure text-lg font-bold text-white">🤖 {localPlayers[localTurnIdx]?.name}</span>
                      </div>
                      {localQuizPhase === 'answering' && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full border bg-jungle-deep border-jungle-light text-gold animate-pulse">
                          ⏰ {localTimerRemaining}s
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-[9px] font-bold text-gold-light uppercase tracking-wider block mb-1">Question</span>
                      <p className="text-white text-xs font-semibold leading-relaxed font-sans">{localActiveQuestion.question}</p>
                    </div>

                    <div className="space-y-1.5">
                      {localActiveQuestion.options.map((opt: string, oi: number) => {
                        let chipStyle = 'bg-jungle-deep/60 border-jungle-light/30 text-offwhite/70';
                        if (localQuizPhase === 'result') {
                          if (oi === localActiveQuestion.correctIndex) chipStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
                          else if (oi === localSelectedOptIdx) chipStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
                        }
                        return (
                          <div key={oi} className={`w-full text-left px-3 py-2 rounded-lg border text-[10px] font-semibold ${chipStyle}`}>
                            {String.fromCharCode(65 + oi)}. {opt}
                          </div>
                        );
                      })}
                    </div>

                    {localQuizPhase === 'result' && (
                      <div className={`p-2 rounded-lg text-[10px] font-bold text-center border ${
                        localSelectedOptIdx === localActiveQuestion.correctIndex ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-rose-950/80 border-rose-500 text-rose-300'
                      }`}>
                        {localSelectedOptIdx === localActiveQuestion.correctIndex ? `✓ Correct` : `✗ Wrong`}
                      </div>
                    )}

                    {localQuizPhase === 'result' && localActiveQuestion.explanation && (
                      <div className="bg-jungle-deep/80 text-offwhite p-3 rounded-lg text-[10px] border border-jungle-light/20">
                        <p className="font-bold text-gold mb-1 font-sans">Explanation:</p>
                        {localActiveQuestion.explanation}
                      </div>
                    )}
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </main>
          )}

          {/* LOCAL ACTIVE QUIZ (Only for human turns) */}
          {localScreen === 'board' && localActiveQuestion && !localPlayers[localTurnIdx]?.isBot && (
            <div className="fixed inset-0 bg-black/15 z-50 flex items-center justify-center p-4">
              <div className="parchment-panel rounded-2xl max-w-xl w-full p-6 text-jungle-deep relative shadow-2xl">
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
              
              {localLevelUpTo !== null && (
                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-jungle-deep border border-yellow-300 px-6 py-3 rounded-2xl font-adventure text-lg font-bold mb-6 animate-bounce text-center shadow-lg">
                  🎉 LEVEL UP! You are now Level {localLevelUpTo}! 🎉
                </div>
              )}

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
