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
  X,
  Menu
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';

// Imports from split files
import { questionBank, Question } from './questions';
import { Tile, BOARD_TILES, TILE_COORDS_DESKTOP, TILE_COORDS_MOBILE, PRESET_COLORS, PRESET_AVATARS, getTileHexClass, getTileSymbol, getArrowColor, getPCBPath, getPCBVias, getTilePositions } from './config';
import TeacherDashboard from './components/TeacherDashboard';
import StudentGame from './components/StudentGame';
import Launchpad from './components/Launchpad';

const getTokenOffset = (indexOnTile: number, totalOnTile: number) => {
  if (totalOnTile <= 1) return { x: 0, y: 0 };
  const step = window.innerWidth < 768 ? 6 : 10;
  return {
    x: (indexOnTile - (totalOnTile - 1) / 2) * step,
    y: (indexOnTile - (totalOnTile - 1) / 2) * step
  };
};

const getCurvedPath = (coords: { x: number; y: number }[]) => {
  if (coords.length === 0) return '';
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    if (p0.y !== p1.y) {
      const cpX = p0.x + (p0.x > 50 ? 7 : -7);
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    } else {
      d += ` L ${p1.x} ${p1.y}`;
    }
  }
  return d;
};

// Connect Socket.io client to backend server
const socket = io(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true
});

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
  console.log("App Component Function Executing!");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('bytequest-theme') || 'blue-gold';
  });
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('bytequest_role') === 'teacher' && !!localStorage.getItem('bytequest_teacher_info');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bytequest-theme', theme);
  }, [theme]);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const TILE_COORDS = getTilePositions(BOARD_TILES, isMobile);

  // Navigation Router: selection, local, student, teacher
  const [viewMode, setViewMode] = useState<'selection' | 'local' | 'student' | 'teacher'>('selection');
  const [localScreen, setLocalScreen] = useState<'setup' | 'board' | 'handoff' | 'victory'>('setup');

  // Lifted Student Navigation States
  const [studentGameState, setStudentGameState] = useState<'dashboard' | 'lobby' | 'playing' | 'victory'>('dashboard');
  const [studentActiveTab, setStudentActiveTab] = useState<'dashboard' | 'continue' | 'new_adventure' | 'practice_quiz' | 'daily_challenge' | 'leaderboard' | 'profile' | 'settings' | 'join_classroom'>('dashboard');
  const [studentShowLobbyConfigModal, setStudentShowLobbyConfigModal] = useState<boolean>(false);

  // Lifted Teacher Navigation States
  const [teacherActiveTab, setTeacherActiveTab] = useState<'dashboard' | 'classes' | 'teachers' | 'students' | 'questions' | 'leaderboard' | 'reports' | 'settings' | 'profile' | 'requests'>('dashboard');
  const [teacherShowModal, setTeacherShowModal] = useState<'create' | 'edit' | 'reset-password' | null>(null);

  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [pendingExitCallback, setPendingExitCallback] = useState<(() => void) | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState<boolean>(false);

  interface ByteQuestState {
    viewMode: 'selection' | 'local' | 'student' | 'teacher';
    localScreen: 'setup' | 'board' | 'handoff' | 'victory';
    studentGameState: 'dashboard' | 'lobby' | 'playing' | 'victory';
    studentActiveTab: 'dashboard' | 'continue' | 'new_adventure' | 'practice_quiz' | 'daily_challenge' | 'leaderboard' | 'profile' | 'settings' | 'join_classroom';
    studentShowLobbyConfigModal: boolean;
    teacherActiveTab: 'dashboard' | 'classes' | 'teachers' | 'students' | 'questions' | 'leaderboard' | 'reports' | 'settings' | 'profile' | 'requests';
    teacherShowModal: 'create' | 'edit' | 'reset-password' | null;
  }

  const applyNavigation = (updates: Partial<ByteQuestState>) => {
    const nextState: ByteQuestState = {
      viewMode: updates.viewMode ?? viewMode,
      localScreen: updates.localScreen ?? localScreen,
      studentGameState: updates.studentGameState ?? studentGameState,
      studentActiveTab: updates.studentActiveTab ?? studentActiveTab,
      studentShowLobbyConfigModal: updates.studentShowLobbyConfigModal ?? studentShowLobbyConfigModal,
      teacherActiveTab: updates.teacherActiveTab ?? teacherActiveTab,
      teacherShowModal: updates.teacherShowModal !== undefined ? updates.teacherShowModal : teacherShowModal,
    };

    if (updates.viewMode !== undefined) setViewMode(updates.viewMode);
    if (updates.localScreen !== undefined) setLocalScreen(updates.localScreen);
    if (updates.studentGameState !== undefined) setStudentGameState(updates.studentGameState);
    if (updates.studentActiveTab !== undefined) setStudentActiveTab(updates.studentActiveTab);
    if (updates.studentShowLobbyConfigModal !== undefined) setStudentShowLobbyConfigModal(updates.studentShowLobbyConfigModal);
    if (updates.teacherActiveTab !== undefined) setTeacherActiveTab(updates.teacherActiveTab);
    if (updates.teacherShowModal !== undefined) setTeacherShowModal(updates.teacherShowModal);

    window.history.pushState(nextState, '');
  };
  const navigateTo = (updates: Partial<ByteQuestState>) => {
    const isEnteringBoard = 
      (updates.localScreen === 'board' && localScreen !== 'board' && localScreen !== 'handoff') || 
      (updates.studentGameState === 'playing' && studentGameState !== 'playing');
      
    const isLeavingBoard = 
      (localScreen === 'board' && updates.localScreen !== undefined && updates.localScreen !== 'board' && updates.localScreen !== 'handoff') ||
      (studentGameState === 'playing' && updates.studentGameState !== undefined && updates.studentGameState !== 'playing') ||
      (localScreen === 'board' && updates.viewMode === 'selection') ||
      (studentGameState === 'playing' && updates.viewMode === 'selection');

    if (isEnteringBoard || isLeavingBoard) {
      setIsTransitioning(true);
      sounds.playChest();
      setTimeout(() => {
        applyNavigation(updates);
      }, 400);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 850);
    } else {
      applyNavigation(updates);
    }
  };

  const handleStudentActiveTab = (tab: any) => navigateTo({ studentActiveTab: tab });
  const handleStudentGameState = (state: any) => navigateTo({ studentGameState: state });
  const handleStudentShowLobbyConfigModal = (show: boolean) => navigateTo({ studentShowLobbyConfigModal: show });

  const handleTeacherActiveTab = (tab: any) => navigateTo({ teacherActiveTab: tab });
  const handleTeacherShowModal = (modal: any) => navigateTo({ teacherShowModal: modal });

  useEffect(() => {
    const initialState: ByteQuestState = {
      viewMode: 'selection',
      localScreen: 'setup',
      studentGameState: 'dashboard',
      studentActiveTab: 'dashboard',
      studentShowLobbyConfigModal: false,
      teacherActiveTab: 'dashboard',
      teacherShowModal: null
    };
    if (!window.history.state) {
      window.history.replaceState(initialState, '');
    }
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as ByteQuestState;
      if (!state) return;

      const isCurrentlyInActiveGame = 
        (viewMode === 'local' && localScreen === 'board') ||
        (viewMode === 'student' && studentGameState === 'playing');

      const poppedStateIsActiveGame = 
        (state.viewMode === 'local' && state.localScreen === 'board') ||
        (state.viewMode === 'student' && state.studentGameState === 'playing');

      if (isCurrentlyInActiveGame && !poppedStateIsActiveGame) {
        const currentGameState: ByteQuestState = {
          viewMode,
          localScreen,
          studentGameState,
          studentActiveTab,
          studentShowLobbyConfigModal,
          teacherActiveTab,
          teacherShowModal
        };
        window.history.pushState(currentGameState, '');

        setPendingExitCallback(() => () => {
          setViewMode(state.viewMode);
          setLocalScreen(state.localScreen);
          setStudentGameState(state.studentGameState);
          setStudentActiveTab(state.studentActiveTab);
          setStudentShowLobbyConfigModal(state.studentShowLobbyConfigModal);
          setTeacherActiveTab(state.teacherActiveTab);
          setTeacherShowModal(state.teacherShowModal);
          window.history.replaceState(state, '');
        });
        setShowExitConfirm(true);
        return;
      }

      setViewMode(state.viewMode);
      setLocalScreen(state.localScreen);
      setStudentGameState(state.studentGameState);
      setStudentActiveTab(state.studentActiveTab);
      setStudentShowLobbyConfigModal(state.studentShowLobbyConfigModal);
      setTeacherActiveTab(state.teacherActiveTab);
      setTeacherShowModal(state.teacherShowModal);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewMode, localScreen, studentGameState, studentActiveTab, studentShowLobbyConfigModal, teacherActiveTab, teacherShowModal]);

  const handleGlobalBack = () => {
    if (viewMode === 'local' && localScreen === 'board') {
      setPendingExitCallback(() => () => {
        navigateTo({ viewMode: 'selection', localScreen: 'setup' });
      });
      setShowExitConfirm(true);
      return;
    }
    if (viewMode === 'student' && studentGameState === 'playing') {
      setPendingExitCallback(() => () => {
        if ((window as any).ByteQuestLeaveRoom) {
          (window as any).ByteQuestLeaveRoom();
        }
        navigateTo({ viewMode: 'selection' });
      });
      setShowExitConfirm(true);
      return;
    }

    if (viewMode === 'local' && localScreen === 'setup') {
      window.history.back();
      return;
    }

    if (viewMode === 'student') {
      if (studentShowLobbyConfigModal) {
        navigateTo({ studentShowLobbyConfigModal: false });
        return;
      }
      if (studentGameState === 'lobby') {
        if ((window as any).ByteQuestLeaveRoom) {
          (window as any).ByteQuestLeaveRoom();
        }
        navigateTo({ viewMode: 'selection' });
        return;
      }
      // All other student states — return to main selection menu
      navigateTo({ viewMode: 'selection' });
      return;
    }

    if (viewMode === 'teacher') {
      if (teacherShowModal) {
        navigateTo({ teacherShowModal: null });
        return;
      }
      if (teacherActiveTab !== 'dashboard') {
        navigateTo({ teacherActiveTab: 'dashboard' });
        return;
      }
      navigateTo({ viewMode: 'selection' });
      return;
    }

    window.history.back();
  };

  // Audio globally
  const [audioOn, setAudioOn] = useState<boolean>(true);

  // Sync audio state
  useEffect(() => {
    sounds.enabled = audioOn;
  }, [audioOn]);

  // Unified Auth States
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'signup' | null>(null);
  const [authRoleSelection, setAuthRoleSelection] = useState<'student' | 'teacher' | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authGrade, setAuthGrade] = useState('11');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showMainMenuSettings, setShowMainMenuSettings] = useState(false);
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [launchpadError, setLaunchpadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const loadStudentProfile = async (studentId: string) => {
    const baseApi = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    try {
      const res = await fetch(`${baseApi}/api/v1/student/profile/${studentId}`);
      const data = await res.json();
      if (res.ok) {
        setActiveStudent(data.student);
        return data.student;
      } else {
        localStorage.removeItem('bytequest_student_id');
        setActiveStudent(null);
        return null;
      }
    } catch (e) {
      console.error('Failed to load profile', e);
      localStorage.removeItem('bytequest_student_id');
      setActiveStudent(null);
      return null;
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('bytequest_role');
    const studentId = localStorage.getItem('bytequest_student_id');
    if (role === 'student' && studentId) {
      loadStudentProfile(studentId);
      setViewMode('selection');
    } else if (role === 'teacher' && localStorage.getItem('bytequest_teacher_info')) {
      setViewMode('teacher');
    }
  }, []);

  // ==========================================
  // LOCAL GAME MODE STATE MACHINE (PHASE 1)
  // ==========================================
  const [localLevelUpTo, setLocalLevelUpTo] = useState<number | null>(null);
  
  // Local Player Setup
  const [localPlayerCount, setLocalPlayerCount] = useState<1 | 2 | 3 | 4>(1);
  const [localSetupPlayers, setLocalSetupPlayers] = useState<Array<{ name: string; grade: 10 | 11 | 12; color: number; avatar: number }>>([
    { name: 'Player 1', grade: 11, color: 0, avatar: 0 },
    { name: 'Player 2', grade: 10, color: 1, avatar: 1 },
    { name: 'Player 3', grade: 12, color: 2, avatar: 2 },
    { name: 'Player 4', grade: 11, color: 3, avatar: 3 }
  ]);
  
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
    finished?: boolean;
    finishedRank?: number;
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
  const [localCollisionTileIndex, setLocalCollisionTileIndex] = useState<number | null>(null);
  
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
  const localHandleTimeOutRef = useRef<any>(null);
  const localIsRollPendingRef = useRef<boolean>(false);
  const localIsSubmittingRef = useRef<boolean>(false);
  const localMovementIntervalRef = useRef<any>(null);

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
    
    navigateTo({ viewMode: 'local', localScreen: savedState.screen || 'board' });
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
            if (localHandleTimeOutRef.current) {
              localHandleTimeOutRef.current();
            }
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
    // If we are leaving the board screen, do a full reset of active variables
    if (viewMode !== 'local' || localScreen !== 'board') {
      setLocalIsMoving(false);
      setLocalIsRolling(false);
      setLocalCurrentRoll(null);
    }
    
    setLocalActiveQuestion(null);
    setLocalLandingTile(null);
    setLocalScorePopup(null);
    localIsRollPendingRef.current = false;
    localIsSubmittingRef.current = false;

    if (localBotRollTimeoutRef.current) {
      clearTimeout(localBotRollTimeoutRef.current);
      localBotRollTimeoutRef.current = null;
    }
    if (localBotThinkTimeoutRef.current) {
      clearTimeout(localBotThinkTimeoutRef.current);
      localBotThinkTimeoutRef.current = null;
    }
    if (localMovementIntervalRef.current) {
      clearInterval(localMovementIntervalRef.current);
      localMovementIntervalRef.current = null;
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
    navigateTo({ localScreen: 'board' });
  };

  const getLocalTurnPhase = (): 'WAITING' | 'READY_TO_ROLL' | 'ROLLING' | 'MOVING' | 'QUESTION' | 'PROCESSING_ANSWER' | 'TURN_COMPLETE' => {
    if (localIsRolling) return 'ROLLING';
    if (localIsMoving) return 'MOVING';
    if (localActiveQuestion) {
      if (localQuizPhase === 'result') return 'PROCESSING_ANSWER';
      return 'QUESTION';
    }
    const activeP = localPlayers[localTurnIdx];
    if (activeP && !activeP.isBot) {
      return 'READY_TO_ROLL';
    }
    return 'WAITING';
  };

  const renderLocalDiceStatusArea = (phase: string, playerName: string, rollVal: number | null, isMobile: boolean) => {
    const wrapperClass = isMobile ? "flex flex-col items-center justify-center text-center text-white font-sans gap-0.5" : "w-full text-center flex flex-col items-center gap-1 font-sans";
    
    switch (phase) {
      case 'READY_TO_ROLL':
        return (
          <div className={wrapperClass}>
            <span className="text-[#FFD700] font-adventure text-xs font-bold block uppercase animate-pulse">🎲 YOUR TURN</span>
            <span className="text-[9px] text-amber-200 font-bold uppercase tracking-wider">ROLL THE DICE</span>
          </div>
        );
      case 'ROLLING':
        return (
          <div className={wrapperClass}>
            <span className="text-amber-200 font-adventure text-xs font-bold block uppercase animate-bounce">⚡ ROLLING...</span>
          </div>
        );
      case 'MOVING':
        return (
          <div className={wrapperClass}>
            <span className="text-amber-250 font-adventure text-xs font-bold block uppercase">🏃‍♂️ MOVING...</span>
            {rollVal !== null && <span className="text-[9px] text-amber-300 font-bold uppercase tracking-wider">{rollVal} SPACES</span>}
          </div>
        );
      case 'QUESTION':
        return (
          <div className={wrapperClass}>
            <span className="text-[var(--primary-light)] font-adventure text-xs font-bold block uppercase animate-pulse">❓ QUESTION TIME</span>
            <span className="text-[9px] text-amber-200 font-bold uppercase tracking-wider">ANSWER THE QUESTION</span>
          </div>
        );
      case 'PROCESSING_ANSWER':
        return (
          <div className={wrapperClass}>
            <span className="text-emerald-400 font-adventure text-xs font-bold block uppercase">📖 PROCESSING...</span>
          </div>
        );
      case 'WAITING':
      default:
        return (
          <div className={wrapperClass}>
            <span className="text-stone-400 font-adventure text-xs font-bold block uppercase">🤖 BOT THINKING</span>
            <span className="text-[10px] text-white font-extrabold truncate max-w-[150px] uppercase">{playerName}</span>
          </div>
        );
    }
  };

  const localTriggerDiceRoll = () => {
    if (localIsRollPendingRef.current || localIsRolling || localIsMoving || localActiveQuestion || localLandingTile) return;
    localIsRollPendingRef.current = true;
    
    setLocalIsRolling(true);
    setLocalCurrentRoll(null);
    sounds.playRoll();

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setLocalCurrentRoll(roll);
      setLocalIsRolling(false);
      localIsRollPendingRef.current = false;
      
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
    }, 550);
  };

  const localResolveLandedTile = () => {
    const activeP = localPlayers[localTurnIdx];
    const tile = BOARD_TILES[activeP.position];
    setLocalLandingTile(tile);
    // Tile effects (treasure/trap/boss) handled inside localSubmitAnswer
  };

  const localPullQuestion = (roll?: number) => {
    localIsSubmittingRef.current = false;
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
      if (askedList.includes(q.id)) return false;
      if (localPlayerSolvedQuestionIds.includes(q.id)) return false;
      if (localBotSolvedQuestionIds.includes(q.id)) return false;
      if (localPendingBotQuestions.some(pq => pq.id === q.id)) return false;
      return true;
    });

    if (pool.length === 0) {
      pool = questionBank.filter(q => {
        if (q.difficulty !== targetDifficulty) return false;
        if (askedList.includes(q.id)) return false;
        return true;
      });
    }

    if (pool.length === 0) {
      pool = questionBank.filter(q => {
        if (askedList.includes(q.id)) return false;
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
    if (localQuizPhase !== 'answering' || !localActiveQuestion || localIsSubmittingRef.current) return;
    localIsSubmittingRef.current = true;
    
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
    if (localMovementIntervalRef.current) {
      clearInterval(localMovementIntervalRef.current);
    }
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
        localMovementIntervalRef.current = null;
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
    localMovementIntervalRef.current = interval;
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
        const baseFinishedCount = currentPlayers.filter(p => p.finished).length;
        const newFinishedRank = baseFinishedCount + 1;
        
        let newPlayers = currentPlayers.map((p, idx) => 
          idx === localTurnIdx ? { ...p, finished: true, finishedRank: newFinishedRank } : p
        );

        setLocalScorePopup({ text: `🏁 ${activeP.name} finished in Rank ${newFinishedRank}!`, success: true });

        const finishedCount = newPlayers.filter(p => p.finished).length;
        const isFinishedCondition = newPlayers.length <= 1 ? (finishedCount === 1) : (finishedCount === newPlayers.length - 1);

        let finalPlayers = newPlayers;
        if (isFinishedCondition) {
          const remainingIndex = newPlayers.findIndex(p => !p.finished);
          if (remainingIndex !== -1) {
            finalPlayers = newPlayers.map((p, idx) => 
              idx === remainingIndex ? { ...p, finished: true, finishedRank: newPlayers.length } : p
            );
          }
        }

        setTimeout(() => {
          setLocalScorePopup(null);
          setLocalActiveQuestion(null);
          setLocalLandingTile(null);
          if (isFinishedCondition) {
            localTriggerVictory();
          } else {
            localPassTurn();
          }
        }, 2200);

        return finalPlayers;
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
        const isSkipTurnTrap = [11, 12].includes(tile.index);
        if (isSkipTurnTrap) {
          setLocalScorePopup({ text: '🚫 Bug caught you! Skip next turn.', success: false });
          updatedPlayers = updatedPlayers.map((p, idx) => idx === localTurnIdx ? { ...p, skipNextTurn: true } : p);
        } else {
          setLocalScorePopup({ text: '⏮️ Bug knocked you back 2 tiles!', success: false });
          updatedPlayers = updatedPlayers.map((p, idx) => idx === localTurnIdx ? { ...p, position: Math.max(0, p.position - 2) } : p);
        }
      }

      // Apply Tile Collision Rule (Arriving player B stays, existing player A is pushed back 4 tiles)
      let clashedPlayerName = '';
      let clashedNewPos = 0;
      let clashingOccurred = false;
      const activePFinal = updatedPlayers[localTurnIdx];

      const clashedPlayerIdx = updatedPlayers.findIndex((p, idx) => 
        idx !== localTurnIdx && !activePFinal.finished && p.position === activePFinal.position && activePFinal.position !== 0 && !p.finished
      );

      if (clashedPlayerIdx !== -1) {
        const clashedPlayer = updatedPlayers[clashedPlayerIdx];
        clashedPlayerName = clashedPlayer.name;
        clashedNewPos = Math.max(0, clashedPlayer.position - 4);
        clashingOccurred = true;
        
        // Push existing player back, active player remains on tile
        updatedPlayers = updatedPlayers.map((p, idx) => 
          idx === clashedPlayerIdx ? { ...p, position: clashedNewPos } : p
        );

        setLocalCollisionTileIndex(activePFinal.position);
        setTimeout(() => {
          setLocalCollisionTileIndex(null);
        }, 1500);
      }

      let delay = 2500;
      if (clashingOccurred) {
        delay = 4500;
        sounds.playWrong();
        setLocalScorePopup({ text: `💥 Collision! ${clashedPlayerName} moved back 4 tiles.`, success: false });
      }

      setTimeout(() => {
        setLocalScorePopup(null);
        setLocalLandingTile(null);
        localPassTurn();
      }, delay);

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
  localHandleTimeOutRef.current = localHandleTimeOut;

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
    localIsRollPendingRef.current = false;
    localIsSubmittingRef.current = false;
    // Find next unfinished player index
    let nextIdx = localTurnIdx;
    let found = false;
    for (let i = 1; i <= localPlayers.length; i++) {
      const idx = (localTurnIdx + i) % localPlayers.length;
      if (!localPlayers[idx].finished) {
        nextIdx = idx;
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(`[LOCAL GAME] All players finished turn rotation skipped.`);
      return;
    }

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
      if (localPlayers.filter(p => !p.isBot && !p.finished).length > 1) {
        setLocalScreen('handoff');
      } else {
        setLocalScreen('board');
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
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const baseApi = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

    // 1. Try Student login first
    try {
      const studentRes = await fetch(`${baseApi}/api/v1/student/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      
      if (studentRes.ok) {
        const studentData = await studentRes.json();
        localStorage.setItem('bytequest_student_id', studentData.student.id);
        localStorage.setItem('bytequest_role', 'student');
        
        // Fetch and await student profile sync before proceeding
        const profile = await loadStudentProfile(studentData.student.id);
        setAuthLoading(false);
        if (!profile) {
          setAuthError('Unable to sync explorer profile. Please try again.');
          return;
        }

        setShowAuthModal(null);
        
        // Execute pending action or return to Launchpad selection screen
        if (pendingAction === 'play_online' || pendingAction === 'online_adventure' || pendingAction === 'student_new_adventure') {
          setViewMode('student');
          setStudentGameState('lobby');
          setStudentActiveTab('dashboard');
          setTimeout(() => {
            if ((window as any).ByteQuestAutoCreatePractice) {
              (window as any).ByteQuestAutoCreatePractice();
            }
          }, 300);
        } else if (pendingAction === 'join_lobby') {
          const lobbyCode = localStorage.getItem('bytequest_pending_lobby_code') || '';
          setViewMode('student');
          setStudentGameState('lobby');
          setStudentActiveTab('dashboard');
          setTimeout(() => {
            if ((window as any).ByteQuestAutoJoinLobby && lobbyCode) {
              (window as any).ByteQuestAutoJoinLobby(lobbyCode);
            }
          }, 300);
        } else if (pendingAction === 'daily_challenge') {
          setViewMode('student');
          setStudentGameState('dashboard');
          setStudentActiveTab('daily_challenge');
        } else if (pendingAction === 'join_classroom') {
          const classCode = localStorage.getItem('bytequest_pending_classroom_code') || '';
          setViewMode('student');
          setStudentGameState('dashboard');
          setStudentActiveTab('join_classroom');
          setTimeout(() => {
            if ((window as any).ByteQuestAutoJoinClassroom) {
              (window as any).ByteQuestAutoJoinClassroom(classCode);
            }
          }, 300);
        } else {
          setViewMode('selection');
        }
        setPendingAction(null);
        return;
      }
    } catch (err) {
      console.warn("Student authentication check failed, trying teacher...");
    }

    // 2. Try Teacher login next
    try {
      const teacherRes = await fetch(`${baseApi}/api/v1/teacher/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      
      if (teacherRes.ok) {
        const teacherData = await teacherRes.json();
        localStorage.setItem('bytequest_teacher_info', JSON.stringify(teacherData.teacher));
        localStorage.setItem('bytequest_role', 'teacher');
        setAuthLoading(false);
        setShowAuthModal(null);
        setViewMode('teacher');
        setTeacherActiveTab('dashboard');
        return;
      } else {
        const teacherData = await teacherRes.json();
        setAuthError(teacherData.error || 'Invalid clearance email or password.');
      }
    } catch (err) {
      setAuthError('Connection failed. Server is currently offline.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUnifiedSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const baseApi = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

    try {
      const res = await fetch(`${baseApi}/api/v1/student/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          grade: Number(authGrade),
          firstName: authFirstName,
          lastName: authLastName
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('bytequest_student_id', data.student.id);
        localStorage.setItem('bytequest_role', 'student');
        
        // Fetch and await student profile sync before proceeding
        const profile = await loadStudentProfile(data.student.id);
        setAuthLoading(false);
        if (!profile) {
          setAuthError('Unable to sync explorer profile. Please try again.');
          return;
        }

        setShowAuthModal(null);
        
        // Execute pending action or return to Launchpad selection screen
        if (pendingAction === 'play_online' || pendingAction === 'online_adventure' || pendingAction === 'student_new_adventure') {
          setViewMode('student');
          setStudentGameState('lobby');
          setStudentActiveTab('dashboard');
          setTimeout(() => {
            if ((window as any).ByteQuestAutoCreatePractice) {
              (window as any).ByteQuestAutoCreatePractice();
            }
          }, 300);
        } else if (pendingAction === 'join_lobby') {
          const lobbyCode = localStorage.getItem('bytequest_pending_lobby_code') || '';
          setViewMode('student');
          setStudentGameState('lobby');
          setStudentActiveTab('dashboard');
          setTimeout(() => {
            if ((window as any).ByteQuestAutoJoinLobby && lobbyCode) {
              (window as any).ByteQuestAutoJoinLobby(lobbyCode);
            }
          }, 300);
        } else if (pendingAction === 'daily_challenge') {
          setViewMode('student');
          setStudentGameState('dashboard');
          setStudentActiveTab('daily_challenge');
        } else if (pendingAction === 'join_classroom') {
          const classCode = localStorage.getItem('bytequest_pending_classroom_code') || '';
          setViewMode('student');
          setStudentGameState('dashboard');
          setStudentActiveTab('join_classroom');
          setTimeout(() => {
            if ((window as any).ByteQuestAutoJoinClassroom) {
              (window as any).ByteQuestAutoJoinClassroom(classCode);
            }
          }, 300);
        } else {
          setViewMode('selection');
        }
        setPendingAction(null);
      } else {
        setAuthError(data.error || 'Signup failed.');
      }
    } catch (err) {
      setAuthError('Connection failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const isDark = (viewMode === 'local' && localScreen === 'board') || viewMode === 'student' || viewMode === 'selection';
    if (isDark) {
      document.body.style.backgroundColor = 'var(--board-bg-start)';
      document.body.style.color = '#1E293B';
    } else {
      document.body.style.backgroundColor = '#FDFBF7';
      document.body.style.color = '#1E293B';
    }
  }, [viewMode, localScreen]);

  // ==========================================
  // PRIMARY SELECTION & LAYOUT
  // ==========================================

  const isDarkThemeActive = (viewMode === 'local' && localScreen === 'board') || viewMode === 'student' || viewMode === 'selection';

  return (
    <div className={`min-h-screen flex flex-col font-sans relative select-none ${
      isDarkThemeActive 
        ? 'bg-gradient-to-b from-[var(--board-bg-start)] via-[var(--board-bg-mid)] to-[var(--board-bg-end)] text-slate-800' 
        : 'bg-jungle-deep text-[#0F172A]'
    }`}>
      {toastMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-bounce pointer-events-none">
          <div className="alert-warning px-6 py-3 rounded-2xl font-adventure font-extrabold text-sm uppercase tracking-widest shadow-md flex items-center gap-2">
            <span>⚠️</span> {toastMessage}
          </div>
        </div>
      )}
      
      {/* Header displayed ONLY when not on selection page */}
      {viewMode !== 'selection' && (() => {
        const isGameBoardActive = (viewMode === 'local' && localScreen === 'board') || viewMode === 'student';
        return (
          <header className={`border-b-3 ${isGameBoardActive ? 'border-[var(--accent-color)] bg-white/95 text-slate-800' : 'border-[var(--primary-color)] bg-white/98 text-stone-900'} backdrop-blur px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-md`}>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGlobalBack}
                className={`mr-2 px-4 py-2 rounded-xl border-2 active:scale-95 transition-all text-xs font-bold font-adventure flex items-center gap-1.5 shadow-sm uppercase tracking-wider ${isGameBoardActive ? 'bg-white border-[var(--accent-color)] text-[var(--accent-dark)] hover:bg-[var(--primary-subtle-bg)]/80' : 'bg-[var(--primary-subtle-bg)] border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-[var(--primary-subtle-hover)]/50'}`}
              >
                ← Back
              </button>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                if (isGameBoardActive) {
                  setPendingExitCallback(() => () => navigateTo({ viewMode: 'selection' }));
                  setShowExitConfirm(true);
                } else {
                  navigateTo({ viewMode: 'selection' });
                }
              }}>
                <Compass className="w-8 h-8 animate-pulse-slow shrink-0 text-[var(--primary-color)]" />
                <h1 className="font-adventure text-xl sm:text-2xl font-extrabold tracking-wider truncate uppercase text-[var(--primary-color)]">ByteQuest</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setAudioOn(!audioOn)}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                {audioOn 
                  ? <Volume2 className="w-4 h-4" /> 
                  : <VolumeX className="w-4 h-4 text-[var(--primary-color)]" />
                }
              </button>
              {viewMode === 'teacher' && isTeacherLoggedIn && (
                <button
                  id="teacher-hamburger-btn"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toggle-teacher-sidebar'));
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden shadow-sm transition-colors"
                  title="Open Menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              )}
            </div>
          </header>
        );
      })()}

      {viewMode === 'selection' && (
        <Launchpad
          activeStudent={activeStudent}
          launchpadError={launchpadError}
          onClearError={() => setLaunchpadError(null)}
          onPlayOffline={() => {
            sounds.playBeep(440, 'sine', 0.1);
            setPendingAction(null);
            setAuthError('');
            setShowAuthModal(null);
            setLaunchpadError(null);
            navigateTo({ viewMode: 'local', localScreen: 'setup' });
          }}
          onPlayOnline={() => {
            sounds.playBeep(440, 'sine', 0.1);
            setLaunchpadError(null);
            if (activeStudent) {
              navigateTo({ viewMode: 'student', studentGameState: 'lobby', studentActiveTab: 'dashboard' });
              setTimeout(() => {
                if ((window as any).ByteQuestAutoCreatePractice) {
                  (window as any).ByteQuestAutoCreatePractice();
                }
              }, 200);
            } else {
              setPendingAction('play_online');
              showToast('PLEASE SIGN IN FIRST');
              setAuthError('PLEASE SIGN IN FIRST');
              setShowAuthModal('login');
            }
          }}
          onJoinLobby={(code) => {
            sounds.playBeep(440, 'sine', 0.1);
            setLaunchpadError(null);
            if (!code.trim()) return;
            localStorage.setItem('bytequest_pending_lobby_code', code.trim().toUpperCase());
            if (activeStudent) {
              navigateTo({ viewMode: 'student', studentGameState: 'lobby', studentActiveTab: 'dashboard' });
              setTimeout(() => {
                if ((window as any).ByteQuestAutoJoinLobby) {
                  (window as any).ByteQuestAutoJoinLobby(code.trim().toUpperCase());
                }
              }, 200);
            } else {
              setPendingAction('join_lobby');
              showToast('PLEASE SIGN IN FIRST');
              setAuthError('PLEASE SIGN IN FIRST');
              setShowAuthModal('login');
            }
          }}
          onDailyChallenge={() => {
            sounds.playBeep(440, 'sine', 0.1);
            setLaunchpadError(null);
            if (activeStudent) {
              navigateTo({ viewMode: 'student', studentGameState: 'dashboard', studentActiveTab: 'daily_challenge' });
            } else {
              setPendingAction('daily_challenge');
              showToast('PLEASE SIGN IN FIRST');
              setAuthError('PLEASE SIGN IN FIRST');
              setShowAuthModal('login');
            }
          }}
          onJoinClassroom={(code) => {
            sounds.playBeep(440, 'sine', 0.1);
            setLaunchpadError(null);
            if (!code.trim()) return;
            localStorage.setItem('bytequest_pending_classroom_code', code.trim().toUpperCase());
            if (activeStudent) {
              navigateTo({ viewMode: 'student', studentGameState: 'dashboard', studentActiveTab: 'join_classroom' });
              setTimeout(() => {
                if ((window as any).ByteQuestAutoJoinClassroom) {
                  (window as any).ByteQuestAutoJoinClassroom(code.trim().toUpperCase());
                }
              }, 200);
            } else {
              setPendingAction('join_classroom');
              showToast('PLEASE SIGN IN FIRST');
              setAuthError('PLEASE SIGN IN FIRST');
              setShowAuthModal('login');
            }
          }}
          onOpenSettings={() => {
            sounds.playBeep(390, 'sine', 0.05);
            setShowMainMenuSettings(true);
          }}
          onSignIn={() => {
            setAuthError('');
            setLaunchpadError(null);
            setAuthRoleSelection(null);
            setPendingAction(null); // Explicit sign-in from top right resets pending action
            setShowAuthModal('login');
          }}
          onSignUp={() => {
            setAuthError('');
            setLaunchpadError(null);
            setAuthRoleSelection(null);
            setPendingAction(null); // Explicit sign-up from top right resets pending action
            setShowAuthModal('signup');
          }}
          onSignOut={() => {
            sounds.playBeep(350, 'sine', 0.05);
            localStorage.removeItem('bytequest_student_id');
            localStorage.removeItem('bytequest_role');
            localStorage.removeItem('bytequest_teacher_info');
            setActiveStudent(null);
            setPendingAction(null);
            setLaunchpadError(null);
            setShowAuthModal(null);
            navigateTo({ viewMode: 'selection' });
          }}
          audioOn={audioOn}
          setAudioOn={setAudioOn}
        />
      )}

          {/* MAIN MENU SETTINGS OVERLAY MODAL */}
          {showMainMenuSettings && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white text-stone-900 border-3 border-gold p-6 sm:p-8 rounded-[2rem] w-full max-w-sm shadow-[6px_6px_0px_var(--primary-dark)] relative select-text">
                <h3 className="font-adventure text-2xl font-extrabold text-gold border-b-2 border-[var(--primary-subtle-border)] pb-3 mb-6 uppercase tracking-wider text-center">
                  System Settings
                </h3>

                <div className="space-y-6">
                  {/* Audio Toggle */}
                  <div className="flex items-center justify-between font-adventure border-b border-slate-100 pb-4">
                    <span className="font-bold text-sm text-slate-700">Audio Synthesizer</span>
                    <button
                      onClick={() => setAudioOn(!audioOn)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border-2 ${
                        audioOn 
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700' 
                          : 'bg-[var(--primary-subtle-bg)] border-[var(--primary-subtle-border)] text-[var(--primary-subtle-text)]'
                      }`}
                    >
                      {audioOn ? "Enabled 🔊" : "Muted 🔇"}
                    </button>
                  </div>

                  {/* Theme Switcher */}
                  <div className="space-y-2.5 font-adventure border-b border-slate-100 pb-4">
                    <span className="font-bold text-sm text-slate-700 block text-left">Interface Theme</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'red-gold', name: 'Red + Gold', emoji: '❤️' },
                        { id: 'blue-gold', name: 'Blue + Gold', emoji: '💙' },
                        { id: 'green-gold', name: 'Green + Gold', emoji: '💚' },
                        { id: 'purple-gold', name: 'Purple + Gold', emoji: '💜' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            sounds.playBeep(440, 'sine', 0.05);
                            setTheme(t.id);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 text-[10px] font-extrabold transition-all ${
                            theme === t.id
                              ? 'bg-slate-900 border-slate-900 text-white shadow-inner scale-[1.02]'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="text-xs">{t.emoji}</span>
                          <span>{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auth Status details */}
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px] block">Account Status</span>
                    {localStorage.getItem('bytequest_role') ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-stone-800 capitalize">{localStorage.getItem('bytequest_role')} Account</p>
                          <p className="text-[10px] text-slate-400">Auto-auth active</p>
                        </div>
                        <button
                          onClick={() => {
                            localStorage.removeItem('bytequest_student_id');
                            localStorage.removeItem('bytequest_teacher_info');
                            localStorage.removeItem('bytequest_role');
                            sounds.playBeep(300, 'sine', 0.1);
                            setShowMainMenuSettings(false);
                            window.location.reload();
                          }}
                          className="px-2.5 py-1.5 bg-gold text-white font-bold rounded-lg uppercase tracking-wider text-[9px] hover:bg-gold-light active:scale-95 transition-all border-b-2 border-gold-dark"
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <p className="font-bold text-slate-400 italic">No authenticated profile loaded.</p>
                    )}
                  </div>

                  {/* Gameplay details */}
                  <div className="text-[10px] text-slate-500 font-semibold leading-relaxed border-t border-slate-100 pt-4">
                    <p className="font-bold text-gold mb-1 font-adventure uppercase tracking-wider">Adventure Rules:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Roll the dice to advance on the map track.</li>
                      <li>Land on Trap or Treasure tiles to prompt CS questions.</li>
                      <li>Answering correctly speeds progress; failing slows it.</li>
                    </ul>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => { sounds.playBeep(350, 'sine', 0.05); setShowMainMenuSettings(false); }}
                    className="w-full py-3 bg-gold hover:bg-gold-light text-white border-b-4 border-gold-dark rounded-xl font-adventure font-extrabold text-sm uppercase tracking-wider transition-all shadow-md"
                  >
                    Return to Menu
                  </button>
                </div>
              </div>
            </div>
          )}



      {/* UNIFIED AUTH MODAL OVERLAY */}
      {showAuthModal && (
            <div className="fixed inset-0 launcher-container z-50 flex items-center justify-center p-4">
              {/* CSS Particle background simulation */}
              {Array.from({ length: 25 }).map((_, i) => (
                <div 
                  key={i} 
                  className="launcher-particle"
                  style={{
                    left: `${(i * 7) % 100}%`,
                    bottom: `-${Math.random() * 20}%`,
                    animationDelay: `${(i * 0.4).toFixed(1)}s`,
                    width: `${((i % 4) + 3)}px`,
                    height: `${((i % 4) + 3)}px`,
                  }}
                />
              ))}

              <div className="launcher-glass text-white p-6 sm:p-8 w-full max-w-sm relative select-text animate-scale-in">
                
                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowAuthModal(null);
                    setAuthRoleSelection(null);
                    setPendingAction(null);
                    setAuthError('');
                  }}
                  className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div>
                  {showAuthModal === 'login' ? (
                    <>
                      <h3 className="font-adventure text-3xl font-extrabold text-[var(--primary-color)] tracking-widest text-center uppercase mb-1">
                        Welcome Back
                      </h3>
                      <p className="text-center text-[10px] text-slate-400 font-bold tracking-wide uppercase mb-6">
                        Continue Your Journey
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-adventure text-2xl font-extrabold text-[var(--primary-color)] tracking-wider text-center uppercase mb-1">
                        Create Account
                      </h3>
                      <p className="text-center text-[10px] text-slate-400 font-bold tracking-wide uppercase mb-6">
                        Enter the Adventure Campaign
                      </p>
                    </>
                  )}

                  {/* Unified Login Form */}
                  {showAuthModal === 'login' && (
                    <form onSubmit={handleUnifiedLogin} className="space-y-5 text-xs font-semibold">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-350 mb-1.5 tracking-wider font-adventure">Explorer Email</label>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="e.g. explorer@bytequest.edu"
                          className="w-full bg-slate-950/65 border border-slate-700/60 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-[var(--primary-color)] font-bold transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-350 mb-1.5 tracking-wider font-adventure">Password</label>
                        <input
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-950/65 border border-slate-700/60 rounded-xl px-3.5 py-3 text-white focus:outline-none focus:border-[var(--primary-color)] font-bold transition-all"
                          required
                        />
                      </div>
                      
                      {authError && (
                        <p className="alert-error text-[10px] font-bold p-2.5 rounded-xl text-center font-sans">
                          {authError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-3.5 game-btn-primary text-white font-adventure font-extrabold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
                      >
                        {authLoading ? "Entering..." : "Enter Adventure"}
                      </button>

                      <div className="text-center pt-2">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">New Explorer?</span>
                        <button
                          type="button"
                          onClick={() => { setAuthError(''); setShowAuthModal('signup'); }}
                          className="text-[var(--primary-color)] hover:text-[var(--primary-light)] font-adventure font-extrabold tracking-widest text-xs transition-colors"
                        >
                          Create Account →
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Unified Student Signup Form */}
                  {showAuthModal === 'signup' && (
                    <form onSubmit={handleUnifiedSignup} className="space-y-4 text-xs font-semibold">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-350 mb-1 tracking-wider font-adventure">First Name</label>
                          <input
                            type="text"
                            value={authFirstName}
                            onChange={(e) => setAuthFirstName(e.target.value)}
                            placeholder="Aarav"
                            className="w-full bg-slate-950/65 border border-slate-700/60 rounded-xl px-2.5 py-2.5 text-white focus:outline-none focus:border-[var(--primary-color)] font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-350 mb-1 tracking-wider font-adventure">Last Name</label>
                          <input
                            type="text"
                            value={authLastName}
                            onChange={(e) => setAuthLastName(e.target.value)}
                            placeholder="Sharma"
                            className="w-full bg-slate-950/65 border border-slate-700/60 rounded-xl px-2.5 py-2.5 text-white focus:outline-none focus:border-[var(--primary-color)] font-bold"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-350 mb-1 tracking-wider font-adventure">Syllabus Grade</label>
                        <select
                          value={authGrade}
                          onChange={(e) => setAuthGrade(e.target.value)}
                          className="w-full bg-slate-950/65 border border-slate-700/60 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[var(--primary-color)] font-bold font-adventure"
                        >
                          <option value="10">Class 10 (Basics)</option>
                          <option value="11">Class 11 (Functions)</option>
                          <option value="12">Class 12 (Advanced)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-350 mb-1 tracking-wider font-adventure">Explorer Email</label>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="aarav@student.com"
                          className="w-full bg-slate-950/65 border border-slate-700/60 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[var(--primary-color)] font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-350 mb-1 tracking-wider font-adventure">Create Password</label>
                        <input
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full bg-slate-950/65 border border-slate-700/60 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[var(--primary-color)] font-bold"
                          required
                        />
                      </div>
                      
                      {authError && (
                        <p className="alert-error text-[10px] font-bold p-2 rounded-lg text-center font-sans">
                          {authError}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-3.5 game-btn-primary text-white font-adventure font-extrabold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase text-xs tracking-wider"
                      >
                        {authLoading ? "Initializing..." : "Create Account"}
                      </button>

                      <p className="text-center text-[10px] text-slate-400 font-bold mt-3">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => { setAuthError(''); setShowAuthModal('login'); }}
                          className="text-[var(--primary-color)] hover:text-[var(--primary-light)] font-bold"
                        >
                          Sign In
                        </button>
                      </p>
                    </form>
                  )}
                </div>

              </div>
            </div>
          )}

      {/* R2: TEACHER WORKSPACE */}
      {viewMode === 'teacher' && (
        <TeacherDashboard 
          onBack={() => navigateTo({ viewMode: 'selection' })} 
          socket={socket} 
          activeTab={teacherActiveTab}
          setActiveTab={handleTeacherActiveTab}
          showTeacherModal={teacherShowModal}
          setShowTeacherModal={handleTeacherShowModal}
          theme={theme}
          setTheme={setTheme}
          onLoginStateChange={setIsTeacherLoggedIn}
        />
      )}

      {/* R3: STUDENT LOBBY / LIVE GAMEPLAY */}
      {viewMode === 'student' && (
        <StudentGame 
          onBack={(err?: string) => {
            if (err) {
              setLaunchpadError(err);
            } else {
              setLaunchpadError(null);
            }
            navigateTo({ viewMode: 'selection' });
          }} 
          socket={socket} 
          onStartSoloPractice={() => { sounds.playBeep(440, 'sine', 0.1); navigateTo({ viewMode: 'local', localScreen: 'setup' }); }}
          onResumeLocalPractice={resumeLocalPracticeGame}
          gameState={studentGameState}
          setGameState={handleStudentGameState}
          activeTab={studentActiveTab}
          setActiveTab={handleStudentActiveTab}
          showLobbyConfigModal={studentShowLobbyConfigModal}
          setShowLobbyConfigModal={handleStudentShowLobbyConfigModal}
          activeStudent={activeStudent}
          onUpdateStudent={loadStudentProfile}
          sounds={sounds}
          theme={theme}
          setTheme={setTheme}
        />
      )}

      {viewMode === 'local' && (
        <div className={`flex-1 flex flex-col min-h-screen relative pb-28 select-none ${localScreen === 'board' ? 'board-bg text-white' : 'bg-[#FDFBF7] text-stone-900'}`}>
          {localScorePopup && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
              <div className={`px-6 py-3 rounded-full shadow-2xl font-bold border-2 text-sm ${
                localScorePopup.success ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-[var(--primary-subtle-border)] text-white'
              }`}>
                {localScorePopup.text}
              </div>
            </div>
          )}

          {/* S1: LOCAL SETUP */}
          {localScreen === 'setup' && (
            <main className="max-w-4xl mx-auto px-6 py-10 w-full flex-1">
              <div className="text-center mb-8">
                <h2 className="font-adventure text-3xl font-extrabold text-[var(--primary-color)] uppercase tracking-wide">Configure Offline Game</h2>
                <p className="text-slate-500 text-xs font-semibold">Pass the device among players to take turns</p>
              </div>

              <div className="bg-white border-3 border-[var(--primary-color)] p-6 rounded-2xl mb-8 flex flex-col items-center gap-3 shadow-[4px_4px_0px_var(--primary-dark)] text-slate-800">
                <label className="text-slate-700 font-adventure text-sm font-extrabold uppercase tracking-wider">Select Player Count</label>
                <div className="flex gap-2.5">
                  {([1, 2, 3, 4] as const).map(num => (
                    <button
                      key={num}
                      onClick={() => { sounds.playBeep(300 + num*20, 'sine', 0.1); setLocalPlayerCount(num); }}
                      className={`w-12 h-12 rounded-xl font-adventure font-extrabold text-lg border-2 transition-all flex items-center justify-center ${
                        localPlayerCount === num 
                          ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white scale-110 shadow-md' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {Array.from({ length: localPlayerCount }).map((_, idx) => (
                  <div key={idx} className="bg-white border-3 border-[var(--primary-color)] p-5 rounded-2xl relative text-xs shadow-[4px_4px_0px_var(--primary-dark)] text-slate-850">
                    <h4 className="font-adventure text-base font-extrabold text-[var(--primary-color)] mb-3 uppercase tracking-wide">Explorer {idx + 1}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Explorer Name</label>
                        <input 
                          type="text" 
                          value={localSetupPlayers[idx].name}
                          onChange={(e) => {
                            const list = [...localSetupPlayers];
                            list[idx].name = e.target.value;
                            setLocalSetupPlayers(list);
                          }}
                          placeholder={`Player ${idx + 1}`}
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold text-xs"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Grade Syllabus</label>
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
                              className={`flex-1 py-2 border-2 rounded-xl font-bold uppercase text-[10px] transition-all ${
                                localSetupPlayers[idx].grade === g 
                                  ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-sm' 
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              G{g}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center gap-4 pt-1.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Token Color</label>
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
                                className={`w-5 h-5 rounded-full border border-slate-200 transition-all ${localSetupPlayers[idx].color === cIdx ? 'ring-2 ring-[var(--primary-color)] ring-offset-1 border-white scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: col.hex }}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wider mb-1">Avatar</label>
                          <div className="flex gap-1 bg-slate-50 border-2 border-slate-200 p-1 rounded-xl">
                            {PRESET_AVATARS.slice(0, 4).map((av, aIdx) => (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => {
                                  const list = [...localSetupPlayers];
                                  list[idx].avatar = aIdx;
                                  setLocalSetupPlayers(list);
                                }}
                                className={`text-sm p-1 rounded-lg transition-all ${localSetupPlayers[idx].avatar === aIdx ? 'bg-[var(--primary-color)]/15 scale-110' : ''}`}
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
                  <div className="bg-white border-3 border-[var(--primary-color)] p-6 rounded-2xl flex flex-col justify-center text-center text-xs shadow-[4px_4px_0px_var(--primary-dark)] text-slate-800 md:col-span-2">
                    <h4 className="font-adventure text-[var(--primary-color)] font-extrabold text-sm uppercase mb-1">Auto Opponents Added</h4>
                    <p className="text-[10px] text-slate-550 font-semibold italic">Compiler-Bot (🤖) & Binary-Beast (👾) will race against you.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-4">
                <button 
                  onClick={localInitializeGame}
                  className="px-10 py-4 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white rounded-2xl font-adventure font-extrabold text-base uppercase tracking-wider border-b-4 border-[var(--primary-dark)] shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  Start Game Map
                </button>
                <button 
                  onClick={() => setViewMode('selection')}
                  className="px-6 py-4 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  Back
                </button>
              </div>
            </main>
          )}

          {/* S3: LOCAL BOARD PLAY */}
          {(localScreen === 'board' || localScreen === 'handoff') && localPlayers.length > 0 && (
            <main className={`max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-4 w-full flex-1 flex flex-col justify-between relative ${windowWidth < 500 ? 'h-[calc(100vh-60px)] overflow-hidden' : 'pb-24'}`}>
              
              {/* S2: LOCAL HANDOFF OVERLAY */}
              {localScreen === 'handoff' && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-[var(--primary-deep-medium)] border-4 border-[var(--accent-color)] rounded-[2rem] p-8 text-center text-white shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-sm w-full relative animate-scale-in">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(var(--accent-light-rgb),0.1),transparent_70%)] pointer-events-none"></div>
                    <span className="text-3xl block mb-2 animate-bounce">📱</span>
                    <h3 className="font-adventure text-2xl font-extrabold text-[var(--accent-light)] mb-2 uppercase tracking-wider">Pass the Device</h3>
                    <p className="text-xs text-amber-200/70 font-semibold mb-6">Pass the screen to the next explorer:</p>
                    <div className="bg-[var(--primary-deep-dark)] text-[var(--accent-light)] border-2 border-[var(--accent-color)]/50 p-4 rounded-2xl mb-8 flex items-center justify-center gap-3">
                      <span className="text-3xl">{localPlayers[localTurnIdx]?.avatar}</span>
                      <span className="font-adventure text-xl font-extrabold uppercase tracking-wide">{localPlayers[localTurnIdx]?.name}</span>
                    </div>
                    <button
                      onClick={() => navigateTo({ localScreen: 'board' })}
                      className="w-full py-3.5 bg-gradient-to-r from-[var(--accent-color)] to-[var(--accent-light)] hover:from-[var(--accent-light)] hover:to-[var(--accent-color)] text-[var(--primary-deep-dark)] rounded-xl font-adventure font-extrabold border-b-4 border-[var(--accent-dark)] uppercase tracking-wider text-xs transition-all active:scale-95 shadow-md"
                    >
                      Ready!
                    </button>
                  </div>
                </div>
              )}
              {/* STICKY LOCAL PLAY HUD */}
              {localPlayers[localTurnIdx] && (
                <div className={`sticky top-14 md:top-[60px] z-30 pcb-card-panel border-3 border-[var(--accent-color)] px-4 flex items-center justify-between gap-4 text-white select-none animate-fade-in ${windowWidth < 500 ? 'mb-2 h-[48px] py-1 text-[11px]' : 'mb-4 py-3'}`}>
                  <div className="flex items-center gap-2">
                    <span className={windowWidth < 500 ? "text-lg" : "text-2xl"}>{localPlayers[localTurnIdx].avatar}</span>
                    <div>
                      <span className={`text-[var(--accent-light)] font-adventure font-extrabold block leading-none ${windowWidth < 500 ? 'text-xs' : 'text-sm'}`}>{localPlayers[localTurnIdx].name}</span>
                      <span className={`text-amber-200/70 font-bold uppercase tracking-wider ${windowWidth < 500 ? 'text-[7px]' : 'text-[9px]'}`}>Grade {localPlayers[localTurnIdx].grade}</span>
                    </div>
                  </div>
                  
                  {/* Progress XP Bar */}
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold text-amber-200 uppercase tracking-widest ${windowWidth < 500 ? 'text-[8px]' : 'text-[10px]'}`}>XP</span>
                    <div className={`bg-stone-950 border border-[var(--accent-color)]/30 rounded-full p-0.5 overflow-hidden flex items-center relative shadow-inner ${windowWidth < 500 ? 'h-2.5 w-16' : 'h-3.5 w-24 md:w-40'}`}>
                      <div 
                        className="bg-gradient-to-r from-[var(--accent-color)] to-[var(--accent-light)] h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_var(--accent-light)]"
                        style={{ width: `${Math.max(15, Math.min(100, (localPlayers[localTurnIdx].xp % 100)))}%` }}
                      ></div>
                      <span className={`absolute inset-0 flex items-center justify-center font-bold font-mono text-white ${windowWidth < 500 ? 'text-[7px]' : 'text-[8px]'}`}>
                        {localPlayers[localTurnIdx].xp}
                      </span>
                    </div>
                  </div>

                  {/* Coins Display */}
                  <div className={`flex items-center gap-1.5 bg-[var(--primary-deep-dark)] border-2 border-[var(--accent-color)] rounded-full shadow-md ${windowWidth < 500 ? 'px-2 py-0.5' : 'px-3 py-1.5'}`}>
                    <span className={windowWidth < 500 ? 'text-xs' : 'text-base'}>🪙</span>
                    <span className={`font-adventure font-extrabold text-[var(--accent-light)] tracking-wider font-mono ${windowWidth < 500 ? 'text-xs' : 'text-sm'}`}>
                      {localPlayers[localTurnIdx].coins}
                    </span>
                  </div>
                </div>
              )}

              <div className={`grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-5 w-full items-start ${windowWidth < 500 ? 'flex-1 flex flex-col justify-between overflow-hidden min-h-0' : ''}`}>
                {/* GAME BOARD PANEL */}
                <div className={`lg:col-span-3 pcb-card-panel border-3 border-[#D4AF37] p-2 md:p-5 relative w-full flex-col ${windowWidth < 500 ? 'h-full flex overflow-hidden min-h-0 gap-2' : 'flex gap-3'}`}>
                  {/* Board viewport — full size, no clipping, tiles 0-17 always visible */}
                  <div className="relative w-full board-bg border-2 border-[#D4AF37]/50 rounded-2xl overflow-visible shadow-inner" style={windowWidth < 500 ? { height: '80%', paddingBottom: 0 } : { paddingBottom: isMobile ? (windowWidth < 500 ? '300%' : '135%') : '72%' }}>
                    {/* Inner absolute container fills the padding-bottom area */}
                    <div className="absolute inset-3">
                      {/* Dark Fantasy Tech map details & circuit lines */}
                      <div className="absolute inset-0 bg-slate-950/20 pointer-events-none rounded-xl"></div>
                      
                      {/* Floating Sparkles / Particle Effects */}
                      <div className="absolute inset-0 pointer-events-none z-0">
                        <div className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ left: '15%', top: '25%', animationDuration: '3s' }}></div>
                        <div className="absolute w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ left: '80%', top: '65%', animationDuration: '5s' }}></div>
                        <div className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ left: '25%', top: '75%', animationDuration: '3.5s' }}></div>
                        <div className="absolute w-1 h-1 bg-emerald-400 rounded-full animate-ping" style={{ left: '50%', top: '45%', animationDuration: '4.5s' }}></div>
                      </div>

                      {/* Subtle center radial glow */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.06),transparent_70%)] pointer-events-none rounded-xl"></div>

                      {/* Single Winding Board-game Road Path */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="glowingPathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="50%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#F59E0B" />
                          </linearGradient>
                        </defs>
                        
                        {/* 1. Road Drop Shadow */}
                        <path 
                          d={getPCBPath(TILE_COORDS)} 
                          fill="none" 
                          stroke="#02080f" 
                          strokeWidth="5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{ opacity: 0.6 }}
                        />
                        {/* 2. Raised Copper/Steel Base */}
                        <path 
                          d={getPCBPath(TILE_COORDS)} 
                          fill="none" 
                          stroke="#132F3C" 
                          strokeWidth="3.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        {/* 3. Glowing Neon Core Line */}
                        <path 
                          d={getPCBPath(TILE_COORDS)} 
                          fill="none" 
                          className="pcb-neon-glow" 
                          stroke="#22D3EE" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                        {/* 4. Glowing Data Packets Signal Flow */}
                        <path 
                          d={getPCBPath(TILE_COORDS)} 
                          fill="none" 
                          className="pcb-trace-signal" 
                          stroke="#22D3EE" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{ filter: 'drop-shadow(0 0 3px #22D3EE)' }}
                        />

                        {/* 5. Glowing Via-Dots at Chamfer Bend Points */}
                        {getPCBVias(TILE_COORDS).map((via, idx) => (
                          <circle 
                            key={`via-${idx}`} 
                            cx={via.x} 
                            cy={via.y} 
                            r="0.8" 
                            fill="#0b1e24" 
                            stroke="#22D3EE" 
                            strokeWidth="0.4" 
                            style={{ filter: 'drop-shadow(0 0 2px #22D3EE)' }}
                          />
                        ))}
                      </svg>

                      {/* Isometric Hexagonal Tiles */}
                      {BOARD_TILES.map((tile, tIdx) => {
                        const coord = TILE_COORDS[tIdx];
                        const activePlayer = localPlayers[localTurnIdx];
                        const isDestination = activePlayer && activePlayer.position === tIdx;
                        const isCompleted = localPlayers.some((pl: any) => pl.position > tIdx);

                        const hexClass = getTileHexClass(tIdx);
                        const symbol = getTileSymbol(tIdx);

                        return (
                          <div 
                            key={tIdx} 
                            className={`stone-plinth ${hexClass} ${isDestination ? 'stone-plinth-destination' : ''} ${isCompleted ? 'stone-plinth-completed' : ''} ${localCollisionTileIndex === tIdx ? 'collision-flash' : ''}`} 
                            style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                            title={tile.label}
                          >
                            {/* Metallic Solder Pins on Left */}
                            <div className="absolute -left-1.5 top-1.5 bottom-1.5 w-1.5 flex flex-col justify-around pointer-events-none">
                              <div className="h-0.5 w-full bg-slate-400/80 rounded-l shadow-sm"></div>
                              <div className="h-0.5 w-full bg-slate-400/80 rounded-l shadow-sm"></div>
                              <div className="h-0.5 w-full bg-slate-400/80 rounded-l shadow-sm"></div>
                            </div>
                            {/* Metallic Solder Pins on Right */}
                            <div className="absolute -right-1.5 top-1.5 bottom-1.5 w-1.5 flex flex-col justify-around pointer-events-none">
                              <div className="h-0.5 w-full bg-slate-400/80 rounded-r shadow-sm"></div>
                              <div className="h-0.5 w-full bg-slate-400/80 rounded-r shadow-sm"></div>
                              <div className="h-0.5 w-full bg-slate-400/80 rounded-r shadow-sm"></div>
                            </div>


                            <div className="flex flex-col items-center justify-center text-white select-none">
                              {tIdx === 0 ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-[7px] sm:text-[9px] font-adventure font-extrabold text-[#38BDF8] tracking-tighter uppercase leading-none">START</span>
                                  <span className="text-[10px] sm:text-sm">{symbol}</span>
                                </div>
                              ) : tIdx === 17 ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className="text-[7px] sm:text-[9px] font-adventure font-extrabold text-yellow-300 tracking-tighter uppercase leading-none">FINISH</span>
                                  <span className="text-xs sm:text-lg animate-bounce">{symbol}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] sm:text-sm font-sans font-bold">{symbol}</span>
                              )}
                            </div>
                            <span className="absolute -top-1.5 -right-1.5 z-10 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-950 border border-slate-700 text-white flex items-center justify-center font-bold font-mono text-[7px] sm:text-[9px] shadow-lg select-none">{tIdx + 1}</span>
                          </div>
                        );
                      })}



                      {/* Characters standing miniatures standees */}
                      {localPlayers.map((p, idx) => {
                        const coord = TILE_COORDS[p.position];
                        const onTile = localPlayers.filter(pl => pl.position === p.position);
                        const sameIdx = onTile.findIndex(pl => pl.id === p.id);
                        
                        // Max 3 players fanned. For 4th player, render an overflow badge once. For 5th+, render nothing.
                        if (sameIdx > 3) return null;
                        
                        const offset = getTokenOffset(sameIdx, Math.min(4, onTile.length));
                        const isActive = localTurnIdx === idx;
                        
                        return (
                          <div 
                            key={p.id} 
                            className="avatar-standee" 
                            style={{ 
                              left: `${coord.x}%`, 
                              top: `${coord.y}%`,
                              transform: `translate(-50%, -70%) translate(${offset.x}px, ${offset.y}px)`
                            }}
                          >
                            <div className={isActive ? 'active-token-bounce' : ''}>
                              {sameIdx === 3 ? (
                                <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-slate-850 border border-slate-600 text-white flex items-center justify-center font-bold text-[8px] sm:text-[10px] shadow-md select-none">
                                  +{onTile.length - 3}
                                </div>
                              ) : (
                                <>
                                  <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs border border-white shadow-md text-white ${p.color || 'bg-blue-600'} ${isActive ? 'ring-2 ring-[#FFD700]' : ''}`}>
                                    {p.avatar}
                                  </div>
                                  {onTile.length === 1 && (
                                    <span className="text-[5px] sm:text-[7px] font-sans font-bold text-white bg-slate-950/80 border border-slate-800 px-1 py-0.5 rounded-md block truncate max-w-[44px] mt-0.5 leading-none text-center shadow-md select-none">
                                      {p.name}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Compact Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-0.5 p-1 rounded-xl bg-slate-950/40 border border-slate-800 text-white select-none text-[7px] sm:text-[10px] w-full mt-1" style={windowWidth < 500 ? { height: '4%', minHeight: '18px', margin: 0, padding: '2px' } : undefined}>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex items-center justify-center text-[6px]">❓</span><span>Question</span></div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 flex items-center justify-center text-[6px]">XP</span><span>XP Reward</span></div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex items-center justify-center text-[6px]">💰</span><span>Treasure</span></div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex items-center justify-center text-[6px]">🎯</span><span>Challenge</span></div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 flex items-center justify-center text-[6px]">⏳</span><span>Bug A (Skip Turn)</span></div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 flex items-center justify-center text-[6px]">↩️</span><span>Bug B (Back 2)</span></div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 flex items-center justify-center text-[6px]">👾</span><span>Boss</span></div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-600 flex items-center justify-center text-[6px]">👑</span><span>Finish</span></div>
                  </div>

                  {/* MOBILE DOCKED TURN PANEL - dynamic turn phase status */}
                  {(() => {
                    const phase = getLocalTurnPhase();
                    const isMyTurnNow = phase === 'READY_TO_ROLL';
                    const activePName = localPlayers[localTurnIdx]?.name || '';
                    return (
                      <div className={`flex md:hidden pcb-card-panel items-center select-none transition-all ${isMyTurnNow ? 'border-3 border-[var(--accent-light)] shadow-[0_0_20px_var(--accent-glow)]' : 'border-3 border-[var(--accent-color)]'} ${windowWidth < 500 ? 'h-[16%] min-h-[82px] max-h-[100px] w-full flex-row justify-between p-2 gap-4' : 'flex-col justify-center p-3 gap-1.5 max-w-[280px] mx-auto'}`}>
                        <div className={windowWidth < 500 ? 'text-left flex-1 min-w-0' : 'w-full'}>
                          {renderLocalDiceStatusArea(phase, activePName, localCurrentRoll, true)}
                        </div>

                        {/* D6 Cube Die */}
                        <div className={`relative flex items-center justify-center shrink-0 ${windowWidth < 500 ? 'w-14 h-14' : 'w-20 h-20'}`}>
                          <button
                            onClick={localTriggerDiceRoll}
                            disabled={!isMyTurnNow || localIsRolling || localIsMoving || localActiveQuestion !== null || localLandingTile !== null}
                            className={`relative rounded-full hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center ${isMyTurnNow ? 'animate-pulse bg-[var(--primary-deep)] shadow-[0_0_20px_var(--accent-glow)] border-2 border-[var(--accent-light)]' : 'bg-[var(--primary-deep-dark)] border-2 border-[var(--accent-color)]/40'} ${windowWidth < 500 ? 'w-12 h-12' : 'w-16 h-16'}`}
                            title={isMyTurnNow ? 'Your Turn — Roll Dice!' : 'Not your turn'}
                          >
                            <svg viewBox="0 0 100 100" className={`dice-spin-shake ${windowWidth < 500 ? 'w-10 h-10' : 'w-14 h-14'}`} style={{ filter: isMyTurnNow ? 'drop-shadow(0 0 8px var(--accent-glow))' : 'drop-shadow(0 2px 4px rgba(var(--accent-light-rgb), 0.25))' }}>
                              {/* Top face */}
                              <polygon points="50,8 90,30 50,52 10,30" fill="var(--primary-deep)" stroke="var(--accent-color)" strokeWidth="2.5"/>
                              {/* Left face */}
                              <polygon points="10,30 50,52 50,92 10,70" fill="var(--primary-deep-dark)" stroke="var(--accent-color)" strokeWidth="2.5"/>
                              {/* Right face */}
                              <polygon points="90,30 50,52 50,92 90,70" fill="var(--primary-deep-dark)" stroke="var(--accent-color)" strokeWidth="2.5"/>
                              {/* Top face pips */}
                              <circle cx="38" cy="26" r="3.5" fill="var(--accent-light)"/>
                              <circle cx="50" cy="34" r="3.5" fill="var(--accent-light)"/>
                              <circle cx="62" cy="26" r="3.5" fill="var(--accent-light)"/>
                            </svg>
                          </button>

                          {localCurrentRoll !== null && !localIsRolling && !localIsMoving && (
                            <div className="absolute inset-0 bg-[var(--primary-deep)]/95 flex items-center justify-center animate-scale-in pointer-events-none rounded-xl border-2 border-[var(--accent-color)] shadow-lg">
                              <span className="font-adventure text-3xl font-extrabold text-[var(--accent-light)]">
                                {localCurrentRoll}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className={`flex flex-col gap-5 lg:col-span-1 ${windowWidth < 500 ? 'hidden lg:flex' : ''}`}>
                  {/* DESKTOP TURN PANEL - dynamic phase-aware status */}
                  {(() => {
                    const phase = getLocalTurnPhase();
                    const isMyTurnNow = phase === 'READY_TO_ROLL';
                    const activePName = localPlayers[localTurnIdx]?.name || '';
                    return (
                      <div className={`hidden md:flex p-6 pcb-card-panel flex-col items-center justify-center text-center text-white select-none transition-all ${isMyTurnNow ? 'border-3 border-[var(--accent-light)] shadow-[0_0_30px_var(--accent-glow)]' : 'border-3 border-[var(--accent-color)]'}`}>
                        <span className="text-[10px] block font-bold text-amber-300 uppercase tracking-wider mb-2 font-adventure">Current Turn</span>
                        <div className="mb-2">
                          <span className="font-adventure text-lg font-extrabold text-[var(--accent-light)] block uppercase tracking-wide truncate max-w-[140px]">
                            {activePName}
                          </span>
                        </div>

                        {/* Dynamic status area */}
                        <div className="mb-3 border-t border-b border-[var(--accent-color)]/20 py-2 w-full">
                          {renderLocalDiceStatusArea(phase, activePName, localCurrentRoll, false)}
                        </div>

                        {/* D6 Cube Die — Desktop */}
                        <div className="relative w-28 h-28 flex items-center justify-center mb-2">
                          <button
                            onClick={localTriggerDiceRoll}
                            disabled={!isMyTurnNow || localIsRolling || localIsMoving || localActiveQuestion !== null || localLandingTile !== null}
                            className={`relative w-24 h-24 rounded-full hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center ${isMyTurnNow ? 'animate-pulse bg-[var(--primary-deep)] shadow-[0_0_30px_var(--accent-glow)] border-3 border-[var(--accent-light)]' : 'bg-[var(--primary-deep-dark)] border-2 border-[var(--accent-color)]/45'}`}
                            title={isMyTurnNow ? 'Your Turn — Click to Roll!' : 'Not your turn'}
                          >
                            <svg viewBox="0 0 100 100" className={`w-20 h-20 ${localIsRolling ? 'dice-spin-shake' : 'hover:drop-shadow-md'}`} style={{ filter: isMyTurnNow ? 'drop-shadow(0 0 12px var(--accent-glow))' : 'drop-shadow(0 3px 6px rgba(var(--accent-light-rgb), 0.25))' }}>
                              {/* Top face */}
                              <polygon points="50,8 90,30 50,52 10,30" fill="var(--primary-deep)" stroke="var(--accent-color)" strokeWidth="2"/>
                              {/* Left face */}
                              <polygon points="10,30 50,52 50,92 10,70" fill="var(--primary-deep-dark)" stroke="var(--accent-color)" strokeWidth="2"/>
                              {/* Right face */}
                              <polygon points="90,30 50,52 50,92 90,70" fill="var(--primary-deep-dark)" stroke="var(--accent-color)" strokeWidth="2"/>
                              {/* Top face pips */}
                              <circle cx="38" cy="25" r="4" fill="var(--accent-light)"/>
                              <circle cx="50" cy="33" r="4" fill="var(--accent-light)"/>
                              <circle cx="62" cy="25" r="4" fill="var(--accent-light)"/>
                              {/* Left face pip */}
                              <circle cx="28" cy="60" r="3.5" fill="var(--accent-light)"/>
                              {/* Right face pips */}
                              <circle cx="72" cy="58" r="3.5" fill="var(--accent-light)"/>
                              <circle cx="72" cy="72" r="3.5" fill="var(--accent-light)"/>
                            </svg>
                          </button>

                          {localCurrentRoll !== null && !localIsRolling && !localIsMoving && (
                            <div className="absolute inset-0 bg-[var(--primary-deep)]/95 flex items-center justify-center animate-scale-in pointer-events-none rounded-2xl border-3 border-[var(--accent-color)] shadow-lg">
                              <div className="text-center">
                                <span className="block text-[8px] text-[var(--accent-light)] uppercase font-extrabold tracking-widest leading-none mb-0.5 font-adventure">ROLLED</span>
                                <span className="font-adventure text-5xl font-extrabold text-[var(--accent-light)]">
                                  {localCurrentRoll}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-amber-200/50 block font-adventure tracking-wider uppercase">
                          {isMyTurnNow ? '🎲 Your Turn' : 'Roll Dice (1–6)'}
                        </span>
                      </div>
                    );
                  })()}

                  {localActiveQuestion && localPlayers[localTurnIdx]?.isBot ? (
                    <div className="bg-white border-3 border-[var(--primary-color)] p-5 rounded-3xl shadow-[4px_4px_0px_var(--primary-dark)] space-y-4 select-text text-stone-900">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Bot Thinking...</span>
                          <span className="font-adventure text-base font-extrabold text-[var(--primary-color)] block">🤖 {localPlayers[localTurnIdx]?.name}</span>
                        </div>
                        {localQuizPhase === 'answering' && (
                          <span className="text-xs font-bold px-2 py-1 rounded-full border bg-[var(--primary-subtle-bg)] border-[var(--primary-color)] text-[var(--primary-color)] animate-pulse">
                            ⏰ {localTimerRemaining}s
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-[9px] font-bold text-[var(--primary-color)] uppercase tracking-wider block mb-1">Question</span>
                        <p className="text-stone-800 text-xs font-semibold leading-relaxed">{localActiveQuestion.question}</p>
                      </div>

                      <div className="space-y-1.5">
                        {localActiveQuestion.options.map((opt: string, oi: number) => {
                          let chipStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                          if (localQuizPhase === 'result') {
                            if (oi === localActiveQuestion.correctIndex) chipStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold';
                            else if (oi === localSelectedOptIdx) chipStyle = 'bg-[var(--primary-subtle-bg)] border-[var(--primary-subtle-border)] text-red-800 font-bold';
                          }
                          return (
                            <div key={oi} className={`w-full text-left px-3 py-2 rounded-xl border text-[10px] font-semibold ${chipStyle}`}>
                              {String.fromCharCode(65 + oi)}. {opt}
                            </div>
                          );
                        })}
                      </div>

                      {localQuizPhase === 'result' && (
                        <div className={`p-2 rounded-xl text-[10px] font-bold text-center border ${
                          localSelectedOptIdx === localActiveQuestion.correctIndex ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-[var(--primary-subtle-bg)] border-[var(--primary-subtle-border)] text-red-800'
                        }`}>
                          {localSelectedOptIdx === localActiveQuestion.correctIndex ? `✓ Correct` : `✗ Wrong`}
                        </div>
                      )}

                      {localQuizPhase === 'result' && localActiveQuestion.explanation && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] text-slate-600">
                          <p className="font-bold text-[var(--primary-color)] mb-1 font-adventure uppercase tracking-wider">Explanation:</p>
                          {localActiveQuestion.explanation}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pcb-card-panel border-3 border-[var(--accent-color)] p-4 text-white">
                      <button 
                        onClick={() => setIsLeaderboardExpanded(!isLeaderboardExpanded)}
                        className="w-full flex justify-between items-center font-adventure text-sm font-extrabold text-[var(--accent-light)] border-b border-[var(--accent-color)]/35 pb-2 uppercase tracking-wider"
                      >
                        <span>📊 Standings</span>
                        <span>{isLeaderboardExpanded ? '▲ Collapse' : '▼ Expand'}</span>
                      </button>
                      
                      {isLeaderboardExpanded && (
                        <div className="space-y-3 text-xs mt-3 animate-fade-in">
                          {localPlayers.slice().sort((a, b) => {
                            const rA = a.finishedRank || (a.finished ? 1 : 99);
                            const rB = b.finishedRank || (b.finished ? 1 : 99);
                            if (rA !== rB) return rA - rB;
                            return b.position - a.position || b.xp - a.xp;
                          }).map((p, idx) => (
                            <div key={p.id} className={`p-3 bg-[var(--primary-deep-dark)] border-2 rounded-2xl shadow-md text-white ${p.finished ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-[var(--accent-color)]/30'}`}>
                              <div className="flex justify-between items-center font-bold mb-2">
                                <span className="text-[var(--accent-light)] text-xs flex items-center gap-1.5">
                                  <span className="font-adventure text-[var(--accent-light)]">
                                    {p.finished ? `🏆 #${p.finishedRank}` : `#${idx+1}`}
                                  </span>
                                  <span>{p.avatar}</span>
                                  <span className={`truncate max-w-[90px] ${p.finished ? 'text-emerald-300' : 'text-amber-100'}`}>{p.name} {p.finished && '🏁'}</span>
                                </span>
                                {p.streak >= 3 && <span className="text-rose-400 animate-pulse text-[10px]">🔥 {p.streak}</span>}
                              </div>
                              <div className="grid grid-cols-3 gap-1 bg-[var(--primary-deep-medium)] border border-[var(--accent-color)]/35 p-1 rounded-xl text-center">
                                <div className="border-r border-[var(--accent-color)]/20"><span className="text-[7px] block text-amber-200/50 uppercase leading-none">XP</span><span className="font-bold text-xs text-white">{p.xp}</span></div>
                                <div className="border-r border-[var(--accent-color)]/20"><span className="text-[7px] block text-amber-200/50 uppercase leading-none">Gold</span><span className="font-bold text-xs text-white">{p.coins}</span></div>
                                <div><span className="text-[7px] block text-amber-200/50 uppercase leading-none">Tile</span><span className="font-bold text-xs text-[var(--accent-light)]">{p.position + 1}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </main>
          )}
          {/* LOCAL ACTIVE QUIZ (Only for human turns) */}
          {localScreen === 'board' && localActiveQuestion && !localPlayers[localTurnIdx]?.isBot && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto select-text animate-fade-in">
              <div className="parchment-scroll max-w-xl w-full p-6 text-slate-800 relative shadow-2xl my-8">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--accent-color)]/30 text-xs text-stone-500 font-sans font-bold">
                  <span>Topic: {localActiveQuestion.topic}</span>
                  {localQuizPhase === 'answering' && <span className="font-bold text-[var(--accent-dark)]">⏰ {localTimerRemaining}s</span>}
                </div>

                <p className="text-lg font-bold mb-6 leading-relaxed text-slate-800 font-sans">{localActiveQuestion.question}</p>

                <div className="space-y-3 mb-6">
                  {localActiveQuestion.options.map((opt: string, oIdx: number) => {
                    const isSelected = localSelectedOptIdx === oIdx;
                    let style = 'bg-[var(--primary-subtle-bg)]/30 border-[var(--accent-color)]/45 hover:bg-[var(--primary-subtle-hover)] hover:border-[var(--accent-color)] text-slate-800';
                    if (localQuizPhase === 'result') {
                      if (oIdx === localActiveQuestion.correctIndex) style = 'bg-emerald-100 border-emerald-600 text-emerald-950 font-bold';
                      else if (isSelected) style = 'bg-rose-100 border-rose-600 text-rose-950 font-bold';
                    } else if (isSelected) {
                      style = 'border-[var(--accent-dark)] bg-[var(--primary-subtle-hover)] text-slate-900 ring-2 ring-[var(--accent-color)]/35';
                    }
                    return (
                      <button
                        key={oIdx}
                        onClick={() => localSubmitAnswer(oIdx)}
                        disabled={localQuizPhase !== 'answering' || localPlayers[localTurnIdx]?.isBot}
                        className={`w-full text-left p-4 rounded-xl border-2 font-bold text-xs transition-all shadow-sm active:translate-y-0.5 ${style}`}
                      >
                        {String.fromCharCode(65 + oIdx)}. {opt}
                      </button>
                    );
                  })}
                </div>

                {localQuizPhase === 'result' && localActiveQuestion.explanation && (
                  <div className="bg-[var(--primary-subtle-bg)] border border-[var(--accent-color)]/40 p-4 rounded-xl text-xs text-stone-700">
                    <p className="font-adventure text-[var(--accent-dark)] font-bold mb-1 uppercase tracking-wider">Explanation:</p>
                    {localActiveQuestion.explanation}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOCAL VICTORY SUMMARY */}
          {localScreen === 'victory' && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-text animate-fade-in font-serif">
              <div className="bg-[var(--primary-deep-medium)] border-4 border-[var(--accent-color)] max-w-xl w-full p-8 text-center rounded-[2rem] relative shadow-[0_0_60px_var(--accent-glow)] animate-scale-in flex flex-col items-center text-white">
                {/* Shiny confetti glow overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,var(--accent-glow),transparent_70%)] pointer-events-none"></div>
                
                <span className="text-7xl block mb-4 animate-bounce">🏆</span>
                <h2 className="font-adventure text-4xl font-extrabold text-[var(--accent-light)] mb-2 drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)] uppercase tracking-widest">Victory!</h2>
                <p className="text-amber-200/70 font-sans text-xs uppercase tracking-widest font-bold mb-6">Adventure Completed</p>
                
                {localLevelUpTo !== null && (
                  <div className="bg-gradient-to-r from-[var(--accent-color)] to-[var(--accent-light)] text-stone-950 border border-[var(--accent-light)] px-6 py-2 rounded-2xl font-adventure text-sm font-bold mb-6 animate-pulse shadow-md">
                    🎉 LEVEL UP! You reached Level {localLevelUpTo}! 🎉
                  </div>
                )}

                {/* Champion stats */}
                {localPlayers.length > 0 && (() => {
                  const sorted = localPlayers.slice().sort((a, b) => {
                    const rA = a.finishedRank || 999;
                    const rB = b.finishedRank || 999;
                    if (rA !== rB) return rA - rB;
                    return b.position - a.position || b.xp - a.xp;
                  });
                  const winner = sorted[0];
                  return (
                    <div className="bg-[var(--primary-deep-dark)] border border-[var(--accent-color)]/50 rounded-3xl p-6 w-full max-w-sm mb-6 shadow-md text-left font-sans">
                      <h4 className="text-xs font-extrabold text-[var(--accent-light)] uppercase tracking-wider mb-3 text-center">Champion: {winner.avatar} {winner.name}</h4>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-[var(--primary-deep-medium)] border border-[var(--accent-color)]/35 p-3 rounded-2xl">
                          <span className="text-[10px] block text-amber-200/50 uppercase font-bold">XP Gained</span>
                          <span className="text-lg font-bold text-white">+{winner.xp} XP</span>
                        </div>
                        <div className="bg-[var(--primary-deep-medium)] border border-[var(--accent-color)]/35 p-3 rounded-2xl">
                          <span className="text-[10px] block text-amber-200/50 uppercase font-bold">Coins Earned</span>
                          <span className="text-lg font-bold text-white">+{winner.coins} Gold</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Ranked Standings list */}
                <div className="w-full max-w-md max-h-48 overflow-y-auto scrollbar-none mb-8 space-y-2">
                  {localPlayers.slice().sort((a, b) => {
                    const rA = a.finishedRank || 999;
                    const rB = b.finishedRank || 999;
                    if (rA !== rB) return rA - rB;
                    if (a.position !== b.position) return b.position - a.position;
                    return b.xp - a.xp;
                  }).map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-[var(--primary-deep-dark)] border border-[var(--accent-color)]/30 rounded-xl text-xs text-white">
                      <span className="font-bold">#{idx+1} {p.avatar} {p.name}</span>
                      <div className="flex gap-2">
                        {localCalculateBadges(p).map((b, bIdx) => (
                          <span key={bIdx} className="bg-[var(--primary-deep)] border border-[var(--accent-color)]/45 text-[var(--accent-light)] text-[7px] px-1.5 py-0.5 rounded font-bold">{b}</span>
                        ))}
                      </div>
                      <span className="font-semibold text-amber-200/80">{p.xp} XP | {p.coins} Coins</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 w-full justify-center">
                  <button
                    onClick={() => { sounds.playBeep(440, 'sine', 0.1); navigateTo({ localScreen: 'setup' }); }}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-[var(--accent-color)] to-[var(--accent-dark)] hover:from-[var(--accent-light)] hover:to-[var(--accent-color)] text-white font-bold text-xs shadow-md active:translate-y-0.5 transition-all font-adventure uppercase tracking-wider border-b-4 border-[var(--accent-dark)]"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => { sounds.playBeep(440, 'sine', 0.1); navigateTo({ viewMode: 'selection' }); }}
                    className="px-6 py-3 rounded-full bg-[var(--primary-deep)] hover:bg-[var(--primary-deep-medium)] text-[var(--accent-light)] border-2 border-[var(--accent-color)]/80 font-bold text-xs shadow-md active:translate-y-0.5 transition-all font-adventure uppercase tracking-wider"
                  >
                    Exit Game
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leave Game Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999999] animate-fade-in select-text">
          <div className="bg-white border-3 border-[var(--primary-color)] text-stone-900 p-6 rounded-[2rem] w-full max-w-sm shadow-[6px_6px_0px_var(--primary-dark)] relative">
            <h3 className="font-adventure text-2xl font-extrabold text-[var(--primary-color)] mb-2 uppercase tracking-wide">
              Leave Game?
            </h3>
            <p className="text-xs font-semibold text-slate-500 mb-6">
              Current match progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  setPendingExitCallback(null);
                }}
                className="flex-1 py-2.5 bg-slate-50 border-2 border-slate-200 hover:bg-slate-100 text-slate-700 font-adventure font-extrabold rounded-xl text-xs uppercase tracking-wide transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  if (pendingExitCallback) pendingExitCallback();
                  setPendingExitCallback(null);
                }}
                className="flex-1 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white border-b-4 border-[var(--primary-dark)] font-adventure font-extrabold rounded-xl text-xs uppercase tracking-wide transition-all"
              >
                Leave Match
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Screen Transition Overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 z-[99999] bg-[var(--primary-deep-dark)]/90 flex items-center justify-center pointer-events-auto backdrop-blur-md">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full border-4 border-[#D4AF37]/20 animate-spin-slow border-dashed"></div>
            <Compass className="absolute text-[#D4AF37] w-10 h-10 animate-pulse-slow" />
          </div>
        </div>
      )}

    </div>
  );
}

