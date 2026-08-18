import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  Clock, 
  Award, 
  Dices, 
  Volume2, 
  VolumeX, 
  HelpCircle,
  Users,
  Shield,
  Activity,
  Flame,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  User,
  CheckCircle2,
  ListOrdered,
  Settings as SettingsIcon,
  LogOut,
  Send,
  Loader,
  Flag
} from 'lucide-react';
import { Tile, BOARD_TILES, TILE_COORDS_DESKTOP, TILE_COORDS_MOBILE, SAFE_TILES, PRESET_COLORS, PRESET_AVATARS, getTileHexClass, getTileSymbol, getArrowColor, getPCBPath, getPCBVias, getTilePositions } from '../config';
import { questionBank, Question } from '../questions';
import confetti from 'canvas-confetti';


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

interface StudentGameProps {
  onBack: (err?: string) => void;
  socket: any;
  onStartSoloPractice: () => void;
  onResumeLocalPractice: (savedState: any) => void;
  gameState: 'dashboard' | 'lobby' | 'playing' | 'victory';
  setGameState: (state: 'dashboard' | 'lobby' | 'playing' | 'victory') => void;
  activeTab: 'dashboard' | 'continue' | 'new_adventure' | 'practice_quiz' | 'daily_challenge' | 'leaderboard' | 'profile' | 'settings' | 'join_classroom';
  setActiveTab: (tab: 'dashboard' | 'continue' | 'new_adventure' | 'practice_quiz' | 'daily_challenge' | 'leaderboard' | 'profile' | 'settings' | 'join_classroom') => void;
  showLobbyConfigModal: boolean;
  setShowLobbyConfigModal: (show: boolean) => void;
  // Passed from App.tsx to avoid re-authentication inside StudentGame
  activeStudent?: any;
  onUpdateStudent?: (studentId: string) => void;
  sounds?: any;
  theme: string;
  setTheme: (theme: string) => void;
}

export default function StudentGame({ 
  onBack, 
  socket, 
  onStartSoloPractice, 
  onResumeLocalPractice,
  gameState,
  setGameState,
  activeTab,
  setActiveTab,
  showLobbyConfigModal,
  setShowLobbyConfigModal,
  activeStudent: propActiveStudent,
  onUpdateStudent,
  sounds: _sounds,
  theme,
  setTheme
}: StudentGameProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const TILE_COORDS = getTilePositions(BOARD_TILES, isMobile);

  // Authentication & Profile States
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [classList, setClassList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [rosterStudents, setRosterStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [joinName, setJoinName] = useState<string>('');
  const [joinClassId, setJoinClassId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [joinStatus, setJoinStatus] = useState<string>('');
  const [syncFailed, setSyncFailed] = useState<boolean>(false);


  // Dashboard Nav States
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinClassroomStatus, setJoinClassroomStatus] = useState<string>('');
  const [joinClassroomError, setJoinClassroomError] = useState<string>('');
  
  // Lobby Config States
  const [lobbyConfigName, setLobbyConfigName] = useState<string>('');
  const [lobbyConfigGrade, setLobbyConfigGrade] = useState<string>('mixed');
  const [lobbyConfigMaxPlayers, setLobbyConfigMaxPlayers] = useState<number>(4);
  const [lobbyConfigPrivate, setLobbyConfigPrivate] = useState<boolean>(false);

  // Active Game State controls
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [multiplayerLevelUp, setMultiplayerLevelUp] = useState<boolean>(false);
  
  // Roster/Lobby Sync
  const [rosterClass, setRosterClass] = useState<any>(null);
  const [myTeam, setMyTeam] = useState<any>(null);
  const [syncState, setSyncState] = useState<any>(null);
  const [collisionTileIndex, setCollisionTileIndex] = useState<number | null>(null);
  const [lobbyTimeoutError, setLobbyTimeoutError] = useState<boolean>(false);
  const [lastLobbyAction, setLastLobbyAction] = useState<{ type: 'create' | 'join'; code?: string } | null>(null);

  useEffect(() => {
    let timer: any;
    if (gameState === 'lobby' && !syncState) {
      setLobbyTimeoutError(false);
      timer = setTimeout(() => {
        setLobbyTimeoutError(true);
      }, 12000);
    } else {
      setLobbyTimeoutError(false);
    }
    return () => clearTimeout(timer);
  }, [gameState, syncState]);

  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [scorePopup, setScorePopup] = useState<string | null>(null);

  // Synced Quiz State
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(15);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Synced 15-second Turn Countdown Effect
  useEffect(() => {
    if (gameState !== 'playing' || !activeQuestion) {
      setTimerRemaining(15);
      return;
    }
    const interval = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuestion, gameState]);

  // Expose socket room leave logic to global window object
  useEffect(() => {
    (window as any).ByteQuestLeaveRoom = () => {
      if (socket && syncState) {
        socket.emit('room:leave', { roomCode: syncState.roomCode });
      }
    };
    return () => {
      delete (window as any).ByteQuestLeaveRoom;
    };
  }, [socket, syncState]);

  // Expose auto-create practice room hook for App.tsx to call after auth
  useEffect(() => {
    (window as any).ByteQuestAutoCreatePractice = () => {
      const studentId = localStorage.getItem('bytequest_student_id');
      if (socket && studentId) {
        const studentName = propActiveStudent?.name || activeStudent?.name || 'Player';
        setLastLobbyAction({ type: 'create' });
        socket.emit('student:create_practice', { studentId, studentName });
        setGameState('lobby');
      }
    };
    return () => { delete (window as any).ByteQuestAutoCreatePractice; };
  }, [socket, propActiveStudent, activeStudent]);

  // Expose auto-join lobby hook for App.tsx to call after auth
  useEffect(() => {
    (window as any).ByteQuestAutoJoinLobby = (code: string) => {
      const studentId = localStorage.getItem('bytequest_student_id');
      const studentName = propActiveStudent?.name || activeStudent?.name || 'Player';
      if (socket && studentId && code) {
        setLastLobbyAction({ type: 'join', code });
        if (code.startsWith('BQ')) {
          socket.emit('student:join_practice', { roomCode: code, studentId, studentName });
        } else {
          socket.emit('student:join', { roomCode: code, studentId });
        }
        setRoomCode(code);
        setGameState('lobby');
      }
    };
    return () => { delete (window as any).ByteQuestAutoJoinLobby; };
  }, [socket, propActiveStudent, activeStudent]);

  // Expose auto-join classroom hook for App.tsx to call after auth
  useEffect(() => {
    (window as any).ByteQuestAutoJoinClassroom = (code: string) => {
      setJoinCodeInput(code);
      // Attempt to resolve and join the classroom
      if (code) {
        setTimeout(() => {
          const btn = document.getElementById('classroom-join-submit-btn');
          if (btn) btn.click();
        }, 100);
      }
    };
    return () => { delete (window as any).ByteQuestAutoJoinClassroom; };
  }, []);

  // Audio Config
  const [audioOn, setAudioOn] = useState<boolean>(true);
  const [diceRolling, setDiceRolling] = useState<boolean>(false);
  const [localRollResult, setLocalRollResult] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [hasPendingRetry, setHasPendingRetry] = useState<boolean>(false);
  const [showRetryToast, setShowRetryToast] = useState<boolean>(false);

  // Online tile-by-tile movement animation state
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>({});
  const [isMovingOnline, setIsMovingOnline] = useState<boolean>(false);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState<boolean>(false);
  const activeIntervalsRef = useRef<Record<string, any>>({});
  const previousPositionsRef = useRef<Record<string, number>>({});

  // Auth/State refs for socket connect/reconnect stability
  const syncStateRef = useRef<any>(null);
  const rollPendingRef = useRef<boolean>(false);
  const onlineIsSubmittingRef = useRef<boolean>(false);

  useEffect(() => {
    syncStateRef.current = syncState;
  }, [syncState]);

  // Reset answer submission guard when a new active question is received or cleared
  useEffect(() => {
    onlineIsSubmittingRef.current = false;
  }, [activeQuestion]);

  // Animate teams from old positions to new positions one tile at a time
  const animateTeamMovement = (teamId: string, fromPos: number, toPos: number, onComplete?: () => void) => {
    if (fromPos === toPos) {
      if (onComplete) onComplete();
      return;
    }
    if (activeIntervalsRef.current[teamId]) {
      clearInterval(activeIntervalsRef.current[teamId]);
    }
    setIsMovingOnline(true);
    let current = fromPos;
    const step = toPos > fromPos ? 1 : -1;
    const interval = setInterval(() => {
      current += step;
      setDisplayPositions(prev => ({ ...prev, [teamId]: current }));
      if (current === toPos) {
        clearInterval(interval);
        delete activeIntervalsRef.current[teamId];
        // Check if any other teams are still moving
        const remainingMoves = Object.keys(activeIntervalsRef.current).length;
        if (remainingMoves === 0) {
          setIsMovingOnline(false);
        }
        if (onComplete) onComplete();
      }
    }, 320);
    activeIntervalsRef.current[teamId] = interval;
  };

  // Sync positions state hook
  useEffect(() => {
    if (gameState === 'playing' && syncState && syncState.teams) {
      syncState.teams.forEach((t: any) => {
        const oldPos = previousPositionsRef.current[t.id];
        const newPos = t.position;
        if (oldPos !== undefined) {
          if (oldPos !== newPos) {
            animateTeamMovement(t.id, oldPos, newPos);
          }
        } else {
          // Initialize first time
          setDisplayPositions(prev => ({ ...prev, [t.id]: newPos }));
        }
        previousPositionsRef.current[t.id] = newPos;
      });
    } else if (gameState === 'lobby' || !syncState) {
      // Clear tracking when not playing
      previousPositionsRef.current = {};
      setDisplayPositions({});
      Object.values(activeIntervalsRef.current).forEach((interval: any) => {
        clearInterval(interval);
      });
      activeIntervalsRef.current = {};
      setIsMovingOnline(false);
    }
  }, [syncState, gameState]);

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [editFirstName, setEditFirstName] = useState<string>('');
  const [editLastName, setEditLastName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editSchool, setEditSchool] = useState<string>('');
  const [editAvatar, setEditAvatar] = useState<string>('👾');
  const [editProfilePic, setEditProfilePic] = useState<string>('');
  const [editDiff, setEditDiff] = useState<string>('medium');
  const [editClass, setEditClass] = useState<string>('Class 11');
  const [editSection, setEditSection] = useState<string>('B');
  const [editCurrentPw, setEditCurrentPw] = useState<string>('');
  const [editNewPw, setEditNewPw] = useState<string>('');
  const [profileSaveStatus, setProfileSaveStatus] = useState<string>('');
  const [profileSaveError, setProfileSaveError] = useState<string>('');

  // Local Practice Quiz State
  const [quizTopic, setQuizTopic] = useState<string>('Python Programming');
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [quizQs, setQuizQs] = useState<Question[]>([]);
  const [quizQIdx, setQuizQIdx] = useState<number>(0);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizSelectedOpt, setQuizSelectedOpt] = useState<number | null>(null);
  const [quizChecked, setQuizChecked] = useState<boolean>(false);

  // Daily Challenge State
  const [dailyActive, setDailyActive] = useState<boolean>(false);
  const [dailyQs, setDailyQs] = useState<Question[]>([]);
  const [dailyQIdx, setDailyQIdx] = useState<number>(0);
  const [dailyScore, setDailyScore] = useState<number>(0);
  const [dailySelectedOpt, setDailySelectedOpt] = useState<number | null>(null);
  const [dailyChecked, setDailyChecked] = useState<boolean>(false);
  const [dailyPlayedToday, setDailyPlayedToday] = useState<boolean>(false);
  const [dailyLoading, setDailyLoading] = useState<boolean>(false);
  const [showDailyResults, setShowDailyResults] = useState<boolean>(false);

  // API Config
  const baseApi = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
  const STUDENT_API_BASE = `${baseApi}/api/v1/student`;
  const TEACHER_API_BASE = `${baseApi}/api/v1/teacher`;

  // Restore Student Session on Mount (only if not already provided via prop)
  useEffect(() => {
    if (propActiveStudent) {
      // Profile passed from App.tsx — use it directly, no need to reload
      setActiveStudent(propActiveStudent);
    } else {
      const cachedStudentId = localStorage.getItem('bytequest_student_id');
      if (cachedStudentId) {
        loadStudentProfile(cachedStudentId);
      }
    }
  }, []);

  // Sync prop changes (e.g. profile refresh after rewards)
  useEffect(() => {
    if (propActiveStudent) {
      setActiveStudent(propActiveStudent);
    }
  }, [propActiveStudent]);

  // Auto-start Daily Challenge when tab is opened
  useEffect(() => {
    if (activeTab === 'daily_challenge') {
      handleStartDailyChallenge();
    }
  }, [activeTab]);

  const loadStudentProfile = async (studentId: string) => {
    setLoading(true);
    setSyncFailed(false);
    try {
      const res = await fetch(`${STUDENT_API_BASE}/profile/${studentId}`);
      const data = await res.json();
      if (res.ok) {
        setActiveStudent(data.student);
        localStorage.setItem('bytequest_student_id', studentId);
        // NOTE: Do NOT call setGameState here — game state is managed by App.tsx
        // and setting it here would override the intended destination (lobby, daily_challenge, etc.)
      } else {
        localStorage.removeItem('bytequest_student_id');
        setActiveStudent(null);
        setSyncFailed(true);
      }
    } catch (e) {
      console.error('Failed to load profile', e);
      localStorage.removeItem('bytequest_student_id');
      setActiveStudent(null);
      setSyncFailed(true);
    } finally {
      setLoading(false);
    }
  };



  const handleJoinCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || !activeStudent) return;
    setJoinClassroomStatus('');
    setJoinClassroomError('');
    try {
      const res = await fetch(`${STUDENT_API_BASE}/join-by-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeStudent.id,
          joinCode: joinCodeInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setJoinCodeInput('');
        setJoinClassroomStatus(data.message || 'Request submitted successfully. Pending teacher approval.');
        loadStudentProfile(activeStudent.id);
      } else {
        let errStr = data.error || 'Failed to submit join request.';
        if (errStr.toLowerCase().includes('not found') || errStr.toLowerCase().includes('invalid')) {
          errStr = 'INVALID CLASS CODE';
        }
        setJoinClassroomError(errStr.toUpperCase());
      }
    } catch (err: any) {
      setJoinClassroomError(err.message || 'An error occurred.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bytequest_student_id');
    localStorage.removeItem('bytequest_role');
    setActiveStudent(null);
    onBack();
  };




  // Socket Listener Wiring
  useEffect(() => {
    if (socket && activeStudent) {
      // Auto-reconnect: on (re)connect, if we're in a game, rejoin
      const handleConnect = () => {
        setIsConnected(true);
        const currentSync = syncStateRef.current;
        if (currentSync && currentSync.roomCode && currentSync.status === 'PLAYING') {
          socket.emit('student:reconnect', { roomCode: currentSync.roomCode, studentId: activeStudent.id });
        }
      };
      const handleDisconnect = () => setIsConnected(false);

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      socket.on('room:updated', (data: any) => {
        setHasPendingRetry(data.hasPendingRetry || false);
        if (data.status === 'PLAYING') {
          setGameState('playing');
        } else if (data.status === 'LOBBY') {
          setGameState('lobby');
        }

        // Find my team
        const matchedTeam = data.teams.find((t: any) => 
          t.members.some((m: any) => m.id === activeStudent.id)
        );
        setMyTeam(matchedTeam);
        setSyncState(data);
        rollPendingRef.current = false;
      });

      socket.on('game:dice_rolled', (data: any) => {
        setDiceRolling(true);
        setLocalRollResult(data.roll);
        playBeep(250 + Math.random() * 200, 'triangle', 0.8, 0.1);
        
        setTimeout(() => {
          setDiceRolling(false);
        }, 1200);
      });

      socket.on('game:question_pushed', (data: any) => {
        setActiveQuestion(data.question);
        setTimerRemaining(data.timerRemaining);
        setSelectedOption(null);
        setQuizResult(null);
        setScorePopup(null);
      });

      socket.on('game:answer_result', (data: any) => {
        setQuizResult(data);
        if (data.isCorrect) {
          playBeep(523, 'sine', 0.2, 0.1);
          setTimeout(() => playBeep(659, 'sine', 0.3, 0.1), 120);
          setScorePopup(`✅ CORRECT! Moving to tile ${data.newPosition}.`);
        } else {
          playBeep(220, 'sawtooth', 0.4, 0.1);
          setScorePopup(`❌ INCORRECT! No movement. 📖 Retry queued!`);
          // Show spaced repetition toast
          if (data.hasRetryQuestion) {
            setShowRetryToast(true);
            setTimeout(() => setShowRetryToast(false), 4000);
          }
        }

        if (data.captureText) {
          setLogMessages(prev => [data.captureText, ...prev.slice(0, 8)]);
          playBeep(180, 'square', 0.5, 0.12);
          
          if (data.captureText.includes('Collision') || data.captureText.includes('occupied') || data.captureText.includes('occupied!')) {
            setCollisionTileIndex(data.newPosition);
            setTimeout(() => {
              setCollisionTileIndex(null);
            }, 1500);
          }
        }

        setTimeout(() => {
          setActiveQuestion(null);
          setQuizResult(null);
          setScorePopup(null);
        }, 3600);
      });

      socket.on('game:log', (data: any) => {
        setLogMessages(prev => [data.message, ...prev.slice(0, 8)]);
      });

      socket.on('game:victory', (data: any) => {
        setMultiplayerLevelUp(false);
        if (activeStudent && data.leveledUpMembers && data.leveledUpMembers.includes(activeStudent.id)) {
          setMultiplayerLevelUp(true);
        }

        const end = Date.now() + 3000;
        const confettiInterval = setInterval(() => {
          if (Date.now() > end) {
            clearInterval(confettiInterval);
            setGameState('victory');
            setSyncState((prev: any) => ({ ...prev, teams: data.teams, status: 'FINISHED' }));
            return;
          }
          confetti({
            startVelocity: 30,
            spread: 360,
            ticks: 60,
            origin: { x: Math.random(), y: Math.random() - 0.2 }
          });
        }, 200);
      });

      socket.on('room:error', (data: any) => {
        let msg = data.message || '';
        if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('invalid')) {
          msg = 'ROOM NOT FOUND';
        } else if (msg.toLowerCase().includes('full')) {
          msg = 'ROOM IS FULL';
        } else {
          msg = msg.toUpperCase();
        }
        setJoinError(msg);
        onBack(msg);
      });

      socket.on('error', (data: any) => {
        const msg = (data.message || 'CONNECTION ERROR').toUpperCase();
        setJoinError(msg);
        onBack(msg);
      });
    }

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('room:updated');
        socket.off('game:dice_rolled');
        socket.off('game:question_pushed');
        socket.off('game:answer_result');
        socket.off('game:log');
        socket.off('game:victory');
        socket.off('room:error');
        socket.off('error');
      }
      // Clear all active movement intervals on unmount
      Object.values(activeIntervalsRef.current).forEach((interval: any) => {
        clearInterval(interval);
      });
    };
  }, [socket, activeStudent]);

  // Clean active question overlays on screen transitions
  useEffect(() => {
    setActiveQuestion(null);
    setQuizResult(null);
    setScorePopup(null);
  }, [gameState]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    setProfileSaveStatus('');
    setProfileSaveError('');
    setLoading(true);
    try {
      const body: any = {};
      if (editFirstName.trim()) body.firstName = editFirstName.trim();
      if (editLastName.trim()) body.lastName = editLastName.trim();
      if (editEmail.trim()) body.email = editEmail.trim();
      if (editSchool.trim()) body.schoolName = editSchool.trim();
      if (editNewPw) {
        body.currentPassword = editCurrentPw;
        body.newPassword = editNewPw;
      }
      
      const res = await fetch(`${STUDENT_API_BASE}/profile/${activeStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        // Save local metadata fields
        localStorage.setItem(`bytequest_student_avatar_${activeStudent.id}`, editAvatar);
        localStorage.setItem(`bytequest_student_pic_${activeStudent.id}`, editProfilePic);
        localStorage.setItem(`bytequest_student_diff_${activeStudent.id}`, editDiff);

        // Check if class/section change request is needed
        const currentClassName = activeStudent.class?.name || 'Class 11';
        const currentSection = activeStudent.class?.section || 'B';
        const classChanged = editClass !== currentClassName || editSection !== currentSection;
        
        let customStatus = '✅ Profile updated successfully!';
        if (classChanged) {
          try {
            const reqRes = await fetch(`${STUDENT_API_BASE}/join-request/class-change`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: activeStudent.id,
                className: editClass,
                section: editSection
              })
            });
            if (reqRes.ok) {
              customStatus = '✅ Profile updated & Class Change request submitted to teacher!';
            }
          } catch (reqErr) {
            console.error('Failed to submit class request change', reqErr);
          }
        }

        setProfileSaveStatus(customStatus);
        setEditCurrentPw('');
        setEditNewPw('');
        setEditingProfile(false);
        loadStudentProfile(activeStudent.id);
      } else {
        setProfileSaveError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileSaveError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!roomCode.trim()) return;

    if (roomCode.startsWith('BQ')) {
      if (!activeStudent || !socket) return;
      socket.emit('student:join_practice', { roomCode, studentId: activeStudent.id, studentName: activeStudent.name });
      setGameState('lobby');
      return;
    }

    try {
      const res = await fetch(`${TEACHER_API_BASE}/sessions/code/${roomCode}`);
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'Room Code not found');
        return;
      }
      setRosterClass(data);
    } catch (err) {
      setJoinError('Server connection failed.');
    }
  };

  const handleGoBack = () => {
    playBeep(430, 'sine', 0.05);
    if (showLobbyConfigModal) {
      setShowLobbyConfigModal(false);
      return;
    }
    // From lobby or playing — always go back to the main game menu (Launchpad)
    if (gameState === 'lobby' || gameState === 'playing') {
      if (socket && syncState) socket.emit('room:leave', { roomCode: syncState?.roomCode });
      onBack();
      return;
    }
    // From any dashboard sub-tab — go back to main menu (Launchpad)
    onBack();
  };

  const getTimerColorClass = (seconds: number, hasQuestion: boolean) => {
    if (!hasQuestion) return 'text-gold-light/40';
    if (seconds === 5) return 'text-orange-500 animate-pulse';
    if (seconds < 5) return 'text-[var(--primary-color)] animate-pulse font-extrabold';
    return 'text-emerald-500';
  };

  const handleSelectNameAndJoin = () => {
    if (!activeStudent || !socket) return;
    setLastLobbyAction({ type: 'join', code: roomCode });
    if (roomCode.startsWith('BQ')) {
      socket.emit('student:join_practice', { roomCode, studentId: activeStudent.id, studentName: activeStudent.name });
    } else {
      socket.emit('student:join', { roomCode, studentId: activeStudent.id });
    }
    setGameState('lobby');
  };

  const handleCreatePracticeRoom = () => {
    if (!activeStudent || !socket) return;
    setLastLobbyAction({ type: 'create' });
    socket.emit('student:create_practice', { studentId: activeStudent.id, studentName: activeStudent.name });
    setGameState('lobby');
  };

  const handleLobbyRetry = () => {
    if (!lastLobbyAction || !socket || !activeStudent) return;
    setLobbyTimeoutError(false);
    
    // Re-connect socket if disconnected
    if (!socket.connected) {
      socket.connect();
    }
    
    if (lastLobbyAction.type === 'create') {
      socket.emit('student:create_practice', { studentId: activeStudent.id, studentName: activeStudent.name });
    } else if (lastLobbyAction.type === 'join' && lastLobbyAction.code) {
      if (lastLobbyAction.code.startsWith('BQ')) {
        socket.emit('student:join_practice', { roomCode: lastLobbyAction.code, studentId: activeStudent.id, studentName: activeStudent.name });
      } else {
        socket.emit('student:join', { roomCode: lastLobbyAction.code, studentId: activeStudent.id });
      }
    }
  };

  const getOnlineTurnPhase = (): 'WAITING' | 'READY_TO_ROLL' | 'ROLLING' | 'MOVING' | 'QUESTION' | 'PROCESSING_ANSWER' | 'TURN_COMPLETE' => {
    if (!syncState || syncState.status !== 'PLAYING') return 'WAITING';
    if (diceRolling) return 'ROLLING';
    if (isMovingOnline) return 'MOVING';
    if (activeQuestion) {
      if (quizResult) return 'PROCESSING_ANSWER';
      return 'QUESTION';
    }
    if (checkIsMyTurn()) {
      return 'READY_TO_ROLL';
    }
    return 'WAITING';
  };

  const renderDiceStatusArea = (phase: string, playerName: string, rollVal: number | null, isMobile: boolean) => {
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
            <span className="text-stone-400 font-adventure text-xs font-bold block uppercase">⏳ WAITING FOR</span>
            <span className="text-[10px] text-white font-extrabold truncate max-w-[150px] uppercase">{playerName}</span>
          </div>
        );
    }
  };

  const handleStartPracticeGame = () => {
    if (socket && syncState) {
      socket.emit('student:start_practice', { roomCode: syncState.roomCode });
    }
  };

  const handleRollClick = () => {
    const phase = getOnlineTurnPhase();
    if (rollPendingRef.current || phase !== 'READY_TO_ROLL' || diceRolling || activeQuestion !== null || isMovingOnline) {
      return;
    }
    rollPendingRef.current = true;
    if (socket && syncState) {
      socket.emit('student:roll', { roomCode: syncState.roomCode, studentId: activeStudent.id });
    }
    // Automatically reset roll lock after 3 seconds in case of lost network
    setTimeout(() => {
      rollPendingRef.current = false;
    }, 3000);
  };

  const handleSubmitAnswer = (oIdx: number) => {
    if (quizResult || !activeQuestion || !socket || onlineIsSubmittingRef.current) return;
    onlineIsSubmittingRef.current = true;
    setSelectedOption(oIdx);
    
    const timeSpent = 20 - timerRemaining;
    socket.emit('student:answer', {
      roomCode: syncState.roomCode,
      studentId: activeStudent.id,
      answerIndex: oIdx,
      timeSpent
    });
  };

  // Practice Quiz Mechanics
  const handleStartPracticeQuiz = () => {
    const pool = questionBank.filter(q => q.topic.toLowerCase().includes(quizTopic.toLowerCase()) && q.difficulty === quizDifficulty);
    if (pool.length === 0) {
      alert('No matching questions found in the question bank.');
      return;
    }
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 5);
    setQuizQs(shuffled);
    setQuizQIdx(0);
    setQuizScore(0);
    setQuizSelectedOpt(null);
    setQuizChecked(false);
    setQuizActive(true);
  };

  const handleQuizAnswerSelect = (idx: number) => {
    if (quizChecked) return;
    setQuizSelectedOpt(idx);
  };

  const handleQuizCheck = () => {
    if (quizSelectedOpt === null) return;
    setQuizChecked(true);
    const correct = quizSelectedOpt === quizQs[quizQIdx].correctIndex;
    if (correct) {
      playBeep(523, 'sine', 0.2, 0.1);
      setQuizScore(prev => prev + 1);
    } else {
      playBeep(220, 'sawtooth', 0.3, 0.1);
    }
  };

  const handleQuizNext = async () => {
    if (quizQIdx < quizQs.length - 1) {
      setQuizQIdx(prev => prev + 1);
      setQuizSelectedOpt(null);
      setQuizChecked(false);
    } else {
      const earnedXp = quizScore * (quizDifficulty === 'easy' ? 5 : quizDifficulty === 'hard' ? 15 : 10);
      const earnedCoins = quizScore * 3;
      if (activeStudent) {
        try {
          await fetch(`${STUDENT_API_BASE}/profile/${activeStudent.id}/rewards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xpEarned: earnedXp, coinsEarned: earnedCoins, minutesEarned: 5 })
          });
          localStorage.setItem('bytequest_student_id', activeStudent.id);
        } catch (e) {}
      }
      alert(`Quiz completed! You scored ${quizScore}/5. Gained +${earnedXp} XP and +${earnedCoins} Coins!`);
      setQuizActive(false);
      loadStudentProfile(activeStudent.id);
    }
  };

  // Daily Challenge Mechanics
  const handleStartDailyChallenge = () => {
    if (dailyPlayedToday) {
      alert("You have already completed today's challenge! Come back tomorrow.");
      onBack();
      return;
    }
    setDailyLoading(true);
    setDailyActive(false);
    setShowDailyResults(false);
    setTimeout(() => {
      try {
        if (!questionBank || questionBank.length === 0) {
          setDailyQs([]);
          setDailyActive(false);
        } else {
          const shuffled = [...questionBank].sort(() => 0.5 - Math.random()).slice(0, 5);
          setDailyQs(shuffled);
          setDailyQIdx(0);
          setDailyScore(0);
          setDailySelectedOpt(null);
          setDailyChecked(false);
          setDailyActive(true);
        }
      } catch (err) {
        console.error("Daily challenge start error:", err);
        setDailyQs([]);
        setDailyActive(false);
      } finally {
        setDailyLoading(false);
      }
    }, 600);
  };

  const handleDailyAnswerSelect = (idx: number) => {
    if (dailyChecked) return;
    setDailySelectedOpt(idx);
  };

  const handleDailyCheck = () => {
    if (dailySelectedOpt === null) return;
    setDailyChecked(true);
    const correct = dailySelectedOpt === dailyQs[dailyQIdx].correctIndex;
    if (correct) {
      playBeep(523, 'sine', 0.2, 0.1);
      setDailyScore(prev => prev + 1);
    } else {
      playBeep(220, 'sawtooth', 0.3, 0.1);
    }
  };

  const handleDailyNext = () => {
    if (dailyQIdx < dailyQs.length - 1) {
      setDailyQIdx(prev => prev + 1);
      setDailySelectedOpt(null);
      setDailyChecked(false);
    } else {
      if (activeStudent) {
        fetch(`${STUDENT_API_BASE}/profile/${activeStudent.id}/rewards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xpEarned: 20, coinsEarned: 10, minutesEarned: 5 })
        }).then(() => {
          loadStudentProfile(activeStudent.id);
          if (onUpdateStudent) {
            onUpdateStudent(activeStudent.id);
          }
        });
      }
      setDailyPlayedToday(true);
      setDailyActive(false);
      setShowDailyResults(true);
    }
  };



  const playBeep = (freq: number, type: OscillatorType, duration: number, vol: number = 0.08) => {
    if (!audioOn) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio blocked by browser policy");
    }
  };

  const checkIsMyTurn = (): boolean => {
    if (!syncState || syncState.status !== 'PLAYING') return false;
    
    const activeTeam = syncState.teams[syncState.activeTeamIdx];
    if (!activeTeam) return false;

    if (activeTeam.members && activeTeam.members.length > 0) {
      const activeTeammate = activeTeam.members[activeTeam.activeMemberIdx];
      return activeTeammate?.id === activeStudent?.id;
    }
    
    return activeTeam.id === activeStudent?.id;
  };

  const getActivePlayerName = (): string => {
    if (!syncState) return '';
    const activeTeam = syncState.teams[syncState.activeTeamIdx];
    const activeTeammate = activeTeam?.members[activeTeam.activeMemberIdx];
    return activeTeammate ? activeTeammate.name : activeTeam.name;
  };

  if (!activeStudent) {
    const cachedStudentId = localStorage.getItem('bytequest_student_id');

    return (
      <main className="max-w-md mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full min-h-[85vh] select-none font-sans">
        <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] text-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative flex flex-col justify-between text-center min-h-[300px]">
          <div className="my-auto py-6">
            {syncFailed ? (
              <>
                <span className="text-6xl block mb-6 animate-pulse">⚠️</span>
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] uppercase tracking-widest mb-2">
                  Unable to sync explorer profile
                </h3>
                <p className="text-white/60 text-xs font-semibold mb-8">
                  We could not retrieve your explorer profile from the CS campaign records.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (cachedStudentId) {
                        loadStudentProfile(cachedStudentId);
                      } else {
                        onBack();
                      }
                    }}
                    className="w-full py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-adventure font-extrabold rounded-xl border-b-4 border-[var(--primary-dark)] uppercase tracking-wider text-xs transition-all active:scale-95 shadow-md"
                  >
                    Retry Sync
                  </button>
                  <button
                    onClick={() => onBack()}
                    className="w-full py-3 bg-stone-900 hover:bg-stone-850 text-white/80 font-adventure font-extrabold rounded-xl border border-white/10 uppercase tracking-wider text-xs transition-all active:scale-95 shadow-md"
                  >
                    Back to Menu
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-6">
                  <Loader className="w-12 h-12 animate-spin text-[var(--primary-color)]" />
                </div>
                <h3 className="font-adventure text-xl font-bold text-[#FFD700] uppercase tracking-widest mb-2 animate-pulse">
                  Syncing Explorer Profile...
                </h3>
                <p className="text-white/60 text-xs font-semibold">
                  Connecting to ByteQuest database, please wait.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (gameState === 'dashboard') {
    const pendingAssignments = activeStudent.assignments ? activeStudent.assignments.filter((a: any) => !a.isCompleted) : [];

    return (
      <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-b from-[var(--primary-deep-dark)] via-[var(--primary-deep-dark)] to-[#000000] text-white relative pb-20 select-none">
        
        {/* PREMIUM GAME OVERLAY HUD (TOP BAR) */}
        <header className="sticky top-0 z-40 bg-[var(--primary-deep-dark)]/95 backdrop-blur border-b-3 border-[var(--primary-color)] shadow-lg px-4 py-3 select-none text-white">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleGoBack}
                className="px-3.5 py-2 bg-gradient-to-b from-[var(--primary-dark)] to-[var(--primary-deep-medium)] hover:brightness-110 text-white font-adventure font-extrabold rounded-xl border border-white/20 text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-md mr-1.5"
                title="Return to Menu"
              >
                ← Exit
              </button>
              
              {/* Player Info (Avatar, Name, Grade) */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl border border-white/20 bg-gradient-to-br from-[var(--primary-dark)] to-[var(--primary-deep-medium)] flex items-center justify-center text-xl shadow-md">
                    {editAvatar || '👾'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 font-adventure text-[7px] font-extrabold px-1 py-0.5 rounded border border-stone-950 shadow">
                    L{activeStudent.level}
                  </div>
                </div>
                <div className="leading-tight">
                  <span className="font-adventure text-xs font-extrabold text-white block truncate max-w-[120px] uppercase">{activeStudent.name}</span>
                  <span className="text-[8px] bg-[var(--primary-deep-medium)]/55 border border-[var(--primary-color)]/40 text-amber-250 px-1.5 py-0.5 rounded-lg font-bold uppercase">Class {activeStudent.grade || 11}</span>
                </div>
              </div>
            </div>

            {/* XP progress bar */}
            <div className="flex-1 max-w-[180px] sm:max-w-xs space-y-1 hidden min-[380px]:block">
              <div className="flex justify-between text-[8px] font-bold text-white/50 uppercase tracking-wider font-adventure leading-none">
                <span>XP Level Progress</span>
                <span>{activeStudent.xp} / 1000</span>
              </div>
              <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${Math.min(100, (activeStudent.xp / 1000) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Coins Counter & Utility Buttons */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[var(--primary-deep-medium)] border border-[#FFD700]/30 px-2.5 py-1 rounded-xl text-amber-400 font-bold text-xs shadow-md">
                <span>🪙</span>
                <span className="font-mono">{activeStudent.coins}</span>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setAudioOn(!audioOn)}
                  className="p-2 rounded-xl border border-white/10 bg-black/40 hover:border-white/20 text-white/70 hover:text-white transition-all active:scale-95 shadow-md"
                  title="Toggle Sound"
                >
                  {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-[var(--primary-color)]" />}
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-xl border border-[var(--primary-dark)]/40 bg-[var(--primary-deep-medium)]/40 hover:bg-[var(--primary-deep-medium)]/60 text-white/80 transition-all active:scale-95 shadow-md"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* MAIN GAME CONTENT VIEWPORT - Center Center Layout */}
        <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1 flex flex-col justify-center select-text">
          <section className="flex-1 min-h-[50vh] animate-scale-in">
          {activeTab === 'dashboard' && (
            <div className="space-y-4 md:space-y-6">
              {/* PROFILE CARD */}
              <div className="bg-jungle-medium border border-jungle-light p-4 rounded-2xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-jungle-deep border border-gold/45 flex items-center justify-center text-3xl overflow-hidden shrink-0">
                  {localStorage.getItem(`bytequest_student_pic_${activeStudent.id}`) ? (
                    <img src={localStorage.getItem(`bytequest_student_pic_${activeStudent.id}`)!} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    localStorage.getItem(`bytequest_student_avatar_${activeStudent.id}`) || '👾'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-adventure text-lg font-bold text-gold truncate">{activeStudent.name}</h3>
                      <p className="text-[10px] text-gold-light font-semibold">{activeStudent.className || 'Roster Class'}</p>
                    </div>
                    <span className="bg-gold/15 text-gold text-[9px] font-bold px-2 py-0.5 rounded border border-gold/30">LVL {activeStudent.level}</span>
                  </div>
                  {/* XP Progress Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-[8px] font-bold text-offwhite/50 mb-0.5">
                      <span>XP PROGRESS</span>
                      <span>{activeStudent.xp} XP</span>
                    </div>
                    <div className="w-full h-2 bg-jungle-deep rounded-full overflow-hidden border border-jungle-light/20">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${Math.min(100, (activeStudent.xp / 1000) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* THREE STATISTICS CARDS (Level, Matches, Coins in 1 row) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-jungle-deep border border-jungle-light/35 p-3 rounded-xl text-center">
                  <span className="text-xl block mb-0.5">🛡️</span>
                  <span className="text-[9px] block text-offwhite/50 font-bold uppercase tracking-wider">Level</span>
                  <span className="font-adventure text-sm font-bold text-gold">{activeStudent.level}</span>
                </div>
                <div className="bg-jungle-deep border border-jungle-light/35 p-3 rounded-xl text-center">
                  <span className="text-xl block mb-0.5">⚔️</span>
                  <span className="text-[9px] block text-offwhite/50 font-bold uppercase tracking-wider">Matches</span>
                  <span className="font-adventure text-sm font-bold text-gold">{activeStudent.matchesPlayed || 0}</span>
                </div>
                <div className="bg-jungle-deep border border-jungle-light/35 p-3 rounded-xl text-center">
                  <span className="text-xl block mb-0.5">🪙</span>
                  <span className="text-[9px] block text-offwhite/50 font-bold uppercase tracking-wider">Coins</span>
                  <span className="font-adventure text-sm font-bold text-gold">{activeStudent.coins}</span>
                </div>
              </div>

              {/* QUICK ACTIONS (2x2 Grid) */}
              <div>
                <h4 className="font-adventure text-xs font-bold text-gold uppercase tracking-wider mb-2">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { playBeep(370, 'sine', 0.05); setActiveTab('continue'); }}
                    className="parchment-panel rounded-xl p-3 flex flex-col items-center justify-center text-center text-offwhite hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[85px] border border-gold-dark/20"
                  >
                    <span className="text-2xl mb-1">⏳</span>
                    <span className="text-[11px] font-bold leading-tight">Continue Adventure</span>
                  </button>
                  <button
                    onClick={() => { playBeep(390, 'sine', 0.05); setActiveTab('new_adventure'); }}
                    className="parchment-panel rounded-xl p-3 flex flex-col items-center justify-center text-center text-offwhite hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[85px] border border-gold-dark/20"
                  >
                    <span className="text-2xl mb-1">🎲</span>
                    <span className="text-[11px] font-bold leading-tight">New Adventure</span>
                  </button>
                  <button
                    onClick={() => { playBeep(460, 'sine', 0.05); setActiveTab('join_classroom'); }}
                    className="parchment-panel rounded-xl p-3 flex flex-col items-center justify-center text-center text-offwhite hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[85px] border border-gold-dark/20"
                  >
                    <span className="text-2xl mb-1">🏫</span>
                    <span className="text-[11px] font-bold leading-tight">Join Classroom</span>
                  </button>
                  <button
                    onClick={() => { playBeep(410, 'sine', 0.05); setActiveTab('practice_quiz'); }}
                    className="parchment-panel rounded-xl p-3 flex flex-col items-center justify-center text-center text-offwhite hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[85px] border border-gold-dark/20"
                  >
                    <span className="text-2xl mb-1">📝</span>
                    <span className="text-[11px] font-bold leading-tight">Practice Quiz</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'continue' && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="flex justify-start">
                <button
                  onClick={handleGoBack}
                  className="px-4 py-2 bg-gold/15 border border-gold/30 hover:bg-gold/25 text-gold font-bold rounded-lg text-xs uppercase font-adventure transition-all"
                >
                  ← Back
                </button>
              </div>
              {/* Option A: Reconnect Live Match */}
              {roomCode && (
                <div className="parchment-panel rounded-2xl p-8 text-offwhite text-center space-y-4 shadow-xl">
                  <span className="text-5xl block">⏳</span>
                  <h3 className="font-adventure text-2xl font-bold text-gold-dark">Active Multiplayer Lobby</h3>
                  <p className="text-xs font-semibold text-slate-500">You have a pending or active multiplayer lobby code: <span className="font-mono text-lg font-bold text-[var(--primary-dark)]">{roomCode}</span></p>
                  <button 
                    onClick={handleSelectNameAndJoin}
                    className="px-8 py-3 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg border-2 border-gold-dark shadow-md text-xs uppercase"
                  >
                    Reconnect & Enter Lobby
                  </button>
                </div>
              )}

              {/* Option B: Local/Offline Saved Adventure */}
              <div className="parchment-panel rounded-2xl p-8 text-offwhite text-center space-y-4 shadow-xl">
                <span className="text-5xl block">🎲</span>
                <h3 className="font-adventure text-2xl font-bold text-gold-dark font-adventure">Offline Saved Adventure</h3>
                {localStorage.getItem('bytequest_local_adventure') ? (
                  <>
                    <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                      An unfinished local offline practice game was found! You can resume exactly where you left off.
                    </p>
                    <button 
                      onClick={() => {
                        const saved = JSON.parse(localStorage.getItem('bytequest_local_adventure')!);
                        onResumeLocalPractice(saved);
                      }}
                      className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg border border-emerald-500 shadow-md text-xs uppercase"
                    >
                      Resume Saved Adventure
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-rose-800 font-bold leading-relaxed">
                      No saved adventure found.
                    </p>
                    <button 
                      onClick={onStartSoloPractice}
                      className="px-8 py-3 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg border-2 border-gold-dark shadow-md text-xs uppercase"
                    >
                      Start New Adventure
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'new_adventure' && (
            <div className="space-y-4">
              <div className="bg-jungle-medium border border-jungle-light p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGoBack}
                    className="px-3 py-1.5 rounded-lg bg-[var(--primary-subtle-bg)] border border-[var(--primary-subtle-border)] hover:bg-[var(--primary-subtle-hover)] text-[var(--primary-dark)] font-bold text-xs uppercase font-adventure transition-all"
                  >
                    ← Back
                  </button>
                  <div>
                    <h3 className="font-adventure text-lg font-bold text-[var(--primary-dark)] uppercase tracking-wider">Explorer Launchpad</h3>
                    <p className="text-slate-600 text-[10px]">Select a game mode to begin your CS learning campaign.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* CARD 1: SOLO SANDBOX */}
                <div className="parchment-panel rounded-xl p-4 flex flex-col justify-between text-offwhite min-h-[195px] md:min-h-[260px] lg:min-h-[290px] shadow-md">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                      <span className="text-2xl md:text-4xl">🤖</span>
                      <h4 className="font-adventure text-sm md:text-lg font-bold text-gold-dark truncate">Solo Sandbox</h4>
                    </div>
                    <p className="text-[10px] md:text-xs font-semibold text-slate-500 leading-tight md:leading-relaxed">
                      Fight compilation bots in a completely local, offline practice match.
                    </p>
                  </div>
                  <button 
                    onClick={onStartSoloPractice}
                    className="w-full h-11 bg-jungle-medium hover:bg-slate-100 border border-slate-200 shadow-sm text-offwhite font-bold text-[10px] md:text-xs rounded-lg uppercase transition-all tracking-wide min-h-[44px] mt-4 flex items-center justify-center"
                  >
                    Start Solo
                  </button>
                </div>

                {/* CARD 2: CREATE LOBBY */}
                <div className="parchment-panel rounded-xl p-4 flex flex-col justify-between text-offwhite min-h-[195px] md:min-h-[260px] lg:min-h-[290px] shadow-md">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                      <span className="text-2xl md:text-4xl">🔑</span>
                      <h4 className="font-adventure text-sm md:text-lg font-bold text-gold-dark truncate">Create Lobby</h4>
                    </div>
                    <p className="text-[10px] md:text-xs font-semibold text-slate-500 leading-tight md:leading-relaxed">
                      Create a custom multiplayer practice room for your friends to join.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setLobbyConfigName(`${activeStudent.name}'s Party`);
                      setLobbyConfigGrade('mixed');
                      setLobbyConfigMaxPlayers(4);
                      setLobbyConfigPrivate(false);
                      setShowLobbyConfigModal(true);
                    }}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] md:text-xs rounded-lg uppercase transition-all tracking-wide min-h-[44px] mt-4 flex items-center justify-center"
                  >
                    Host Room
                  </button>
                </div>

                {/* CARD 3: JOIN LOBBY */}
                <div className="parchment-panel rounded-xl p-4 flex flex-col justify-between text-offwhite min-h-[195px] md:min-h-[260px] lg:min-h-[290px] shadow-md">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                      <span className="text-2xl md:text-4xl">🤝</span>
                      <h4 className="font-adventure text-sm md:text-lg font-bold text-gold-dark truncate">Join Lobby</h4>
                    </div>
                    {!rosterClass ? (
                      <form onSubmit={handleResolveCode} className="space-y-1.5">
                        <input 
                          type="text" 
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                          placeholder="Code"
                          maxLength={6}
                          className="w-full bg-parchment-light border border-gold-dark/45 rounded px-2.5 py-1 text-xs text-center font-bold font-mono tracking-wider focus:outline-none h-8"
                          required
                        />
                        {joinError && <p className="text-[8px] text-[var(--primary-subtle-text)] text-center font-bold truncate">{joinError}</p>}
                        <button type="submit" className="w-full h-11 bg-gold text-white font-bold text-[10px] md:text-xs rounded-lg uppercase tracking-wide min-h-[44px] flex items-center justify-center">Verify</button>
                      </form>
                    ) : (
                      <div className="space-y-1.5 text-[9px] md:text-xs text-center">
                        <p className="font-bold truncate">Class: {rosterClass.className}</p>
                        <button onClick={handleSelectNameAndJoin} className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg uppercase min-h-[44px] flex items-center justify-center">Join Room</button>
                      </div>
                    )}
                  </div>
                  {rosterClass && (
                    <button onClick={() => setRosterClass(null)} className="text-center text-[9px] md:text-xs text-slate-500 font-bold mt-1">Clear</button>
                  )}
                </div>

                {/* CARD 4: DAILY CHALLENGE */}
                <div className="parchment-panel rounded-xl p-4 flex flex-col justify-between text-offwhite min-h-[195px] md:min-h-[260px] lg:min-h-[290px] shadow-md">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                      <span className="text-2xl md:text-4xl">⚡</span>
                      <h4 className="font-adventure text-sm md:text-lg font-bold text-gold-dark truncate">Daily Challenge</h4>
                    </div>
                    <p className="text-[10px] md:text-xs font-semibold text-slate-500 leading-tight md:leading-relaxed">
                      Complete daily challenges to earn bonus coins and experience XP!
                    </p>
                  </div>
                  <button 
                    onClick={() => { playBeep(430, 'sine', 0.05); setActiveTab('daily_challenge'); }}
                    className="w-full h-11 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 font-bold text-[10px] md:text-xs rounded-lg uppercase transition-all tracking-wide min-h-[44px] mt-4 flex items-center justify-center"
                  >
                    Play Daily
                  </button>
                </div>

                {/* CARD 5: TREASURE HUNT */}
                <div className="parchment-panel rounded-xl p-4 flex flex-col justify-between text-offwhite min-h-[195px] md:min-h-[260px] lg:min-h-[290px] shadow-md">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 md:mb-3">
                      <span className="text-2xl md:text-4xl">👑</span>
                      <h4 className="font-adventure text-sm md:text-lg font-bold text-gold-dark truncate">Treasure Hunt</h4>
                    </div>
                    <p className="text-[10px] md:text-xs font-semibold text-slate-500 leading-tight md:leading-relaxed">
                      Join teacher lobbies or classroom events to compete for rewards.
                    </p>
                  </div>
                  <button 
                    onClick={() => { playBeep(460, 'sine', 0.05); setActiveTab('join_classroom'); }}
                    className="w-full h-11 bg-gold hover:bg-gold-light text-jungle-deep font-bold text-[10px] md:text-xs rounded-lg uppercase transition-all tracking-wide border border-gold-dark/30 shadow-sm min-h-[44px] mt-4 flex items-center justify-center"
                  >
                    Enter Hunt
                  </button>
                </div>
              </div>

              {/* LOBBY CONFIGURATION DIALOG */}
              {showLobbyConfigModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
                  <div className="parchment-panel text-slate-800 p-5 rounded-2xl w-full max-w-sm shadow-2xl relative select-text">
                    <h3 className="font-adventure text-lg font-bold text-gold-dark mb-3 uppercase tracking-wide">
                      Create Practice Lobby
                    </h3>
                    
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Lobby Name (Optional)</label>
                        <input
                          type="text"
                          placeholder={`${activeStudent.name}'s Party`}
                          value={lobbyConfigName}
                          onChange={(e) => setLobbyConfigName(e.target.value)}
                          className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Max Players</label>
                          <select
                            value={lobbyConfigMaxPlayers}
                            onChange={(e) => setLobbyConfigMaxPlayers(Number(e.target.value))}
                            className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-gold font-semibold"
                          >
                            {[2, 3, 4, 5, 6].map(num => (
                              <option key={num} value={num}>{num} Players</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Target Grade</label>
                          <select
                            value={lobbyConfigGrade}
                            onChange={(e) => setLobbyConfigGrade(e.target.value)}
                            className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-gold font-semibold"
                          >
                            <option value="mixed">Mixed Syllabus</option>
                            <option value="10">Grade 10</option>
                            <option value="11">Grade 11</option>
                            <option value="12">Grade 12</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 font-sans">Lobby Visibility</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLobbyConfigPrivate(false)}
                            className={`flex-1 py-1.5 rounded font-bold uppercase text-[10px] border transition-all ${!lobbyConfigPrivate ? 'bg-gold border-gold-dark text-white shadow-sm' : 'bg-parchment-light border-gold-dark/20 text-slate-500'}`}
                          >
                            Public
                          </button>
                          <button
                            type="button"
                            onClick={() => setLobbyConfigPrivate(true)}
                            className={`flex-1 py-1.5 rounded font-bold uppercase text-[10px] border transition-all ${lobbyConfigPrivate ? 'bg-gold border-gold-dark text-white shadow-sm' : 'bg-parchment-light border-gold-dark/20 text-slate-500'}`}
                          >
                            Private
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button
                        type="button"
                        onClick={() => setShowLobbyConfigModal(false)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 rounded text-[10px] uppercase transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLobbyConfigModal(false);
                          handleCreatePracticeRoom();
                        }}
                        className="flex-1 py-2 bg-gold hover:bg-gold-light text-white font-bold rounded text-[10px] uppercase shadow-md transition-colors border border-gold-dark/30"
                      >
                        Create Lobby
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'practice_quiz' && (
            <div className="space-y-6">
              {!quizActive && (
                <div className="max-w-lg mx-auto flex justify-start">
                  <button
                    onClick={handleGoBack}
                    className="px-4 py-2 bg-stone-850 hover:bg-stone-800 text-white font-bold rounded-full text-xs uppercase font-adventure transition-all"
                  >
                    ← Back
                  </button>
                </div>
              )}
              {!quizActive ? (
                <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] rounded-[2rem] p-8 text-white max-w-lg mx-auto space-y-6 shadow-2xl font-sans">
                  <h3 className="font-adventure text-2xl font-bold text-center text-[var(--primary-color)] uppercase tracking-wide">Practice Quiz Mode</h3>
                  <p className="text-center text-xs font-semibold text-white/50">Select a study subject and difficulty. No board coordinates, no bots, just pure CS revision!</p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Subject Topic</label>
                      <select 
                        value={quizTopic} 
                        onChange={(e) => setQuizTopic(e.target.value)}
                        className="w-full bg-[var(--primary-deep-dark)] border border-white/10 rounded-xl px-3 py-3 text-xs font-bold text-white focus:outline-none focus:border-[var(--primary-color)]"
                      >
                        <option value="Python Programming" className="bg-stone-900 text-white">Python programming</option>
                        <option value="Relational Databases" className="bg-stone-900 text-white">Relational Databases & SQL</option>
                        <option value="Boolean Logic" className="bg-stone-900 text-white">Boolean Logic & Gates</option>
                        <option value="Computer Networks" className="bg-stone-900 text-white">Computer Networking Basics</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Select Difficulty</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['easy', 'medium', 'hard'] as const).map(diff => (
                          <button
                            key={diff}
                            onClick={() => setQuizDifficulty(diff)}
                            type="button"
                            className={`py-2.5 border font-bold text-xs uppercase rounded-xl transition-all ${
                              quizDifficulty === diff 
                                ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-md' 
                                : 'bg-[var(--primary-deep-dark)] border-white/10 text-white/55 hover:bg-[var(--primary-deep-medium)]'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleStartPracticeQuiz}
                    className="w-full py-4 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-adventure font-extrabold border-b-4 border-[var(--primary-dark)] rounded-xl shadow-lg uppercase text-xs tracking-wider transition-colors"
                  >
                    Start Training Quiz
                  </button>
                </div>
              ) : (
                <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] rounded-[2rem] p-8 text-white max-w-xl mx-auto space-y-6 relative shadow-2xl font-sans">
                  <div className="flex justify-between border-b border-white/10 pb-3 text-xs text-white/50 font-bold">
                    <span>📚 Practice Quiz</span>
                    <span>Question {quizQIdx + 1} of 5</span>
                  </div>

                  <p className="text-lg font-bold leading-relaxed text-white font-sans">{quizQs[quizQIdx]?.question}</p>

                  <div className="space-y-3">
                    {quizQs[quizQIdx]?.options.map((opt, oIdx) => {
                      let style = 'bg-[var(--primary-deep-dark)] border-2 border-white/10 text-white/90 hover:bg-[var(--primary-deep-medium)] hover:border-[var(--primary-color)]';
                      if (quizChecked) {
                        if (oIdx === quizQs[quizQIdx].correctIndex) style = 'bg-emerald-950/80 border-2 border-emerald-500 text-emerald-355 font-bold';
                        else if (quizSelectedOpt === oIdx) style = 'bg-[var(--primary-deep-dark)]/80 border-2 border-red-500 text-red-355 font-bold';
                      } else if (quizSelectedOpt === oIdx) {
                        style = 'bg-[var(--primary-deep-medium)]/60 border-2 border-[var(--primary-color)] text-white font-bold';
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleQuizAnswerSelect(oIdx)}
                          className={`w-full text-left p-4 border-2 rounded-xl text-xs font-bold transition-all ${style}`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quizChecked && (
                    <div className="bg-stone-900/60 border border-white/5 p-4 rounded-xl text-xs text-white/70 leading-relaxed font-semibold">
                      <strong className="text-[#FFD700] block mb-1">Explanation:</strong>
                      {quizQs[quizQIdx]?.explanation}
                    </div>
                  )}

                  <div className="flex gap-3 pt-3">
                    {!quizChecked ? (
                      <button 
                        onClick={handleQuizCheck}
                        disabled={quizSelectedOpt === null}
                        className="flex-1 py-3.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-adventure font-extrabold rounded-xl border-b-4 border-[var(--primary-dark)] uppercase text-xs disabled:opacity-50 transition-colors"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button 
                        onClick={handleQuizNext}
                        className="flex-1 py-3.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-adventure font-extrabold rounded-xl border-b-4 border-[var(--primary-dark)] uppercase text-xs transition-colors"
                      >
                        {quizQIdx === 4 ? 'Complete Quiz' : 'Next Question'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'daily_challenge' && (
            <div className="space-y-6">
              {dailyLoading && (
                <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] p-8 text-white max-w-xl mx-auto rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-center font-sans animate-scale-in">
                  <div className="flex justify-center mb-6">
                    <Loader className="w-12 h-12 animate-spin text-[var(--primary-color)]" />
                  </div>
                  <h3 className="font-adventure text-xl font-bold text-[#FFD700] uppercase tracking-widest mb-2 animate-pulse">
                    LOADING DAILY CHALLENGE...
                  </h3>
                  <p className="text-white/60 text-xs font-semibold">
                    Fetching today's curriculum questions, please wait.
                  </p>
                </div>
              )}

              {!dailyLoading && !dailyActive && !showDailyResults && (
                <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] p-8 text-white max-w-xl mx-auto rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-center font-sans animate-scale-in">
                  <span className="text-5xl block mb-6 animate-pulse">⚠️</span>
                  <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] uppercase tracking-widest mb-2">
                    Unable to load today's challenge.
                  </h3>
                  <p className="text-white/60 text-xs font-semibold mb-8">
                    No questions could be loaded from the challenge bank.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={handleStartDailyChallenge}
                      className="w-full py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-adventure font-extrabold rounded-xl border-b-4 border-[var(--primary-dark)] uppercase tracking-wider text-xs transition-all active:scale-95 shadow-md"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => onBack()}
                      className="w-full py-3 bg-stone-900 hover:bg-stone-850 text-white/80 font-adventure font-extrabold rounded-xl border border-white/10 uppercase tracking-wider text-xs transition-all active:scale-95 shadow-md"
                    >
                      Back to Menu
                    </button>
                  </div>
                </div>
              )}

              {!dailyLoading && dailyActive && (
                <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] p-8 text-white max-w-xl mx-auto space-y-6 relative rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.6)] font-sans animate-scale-in">
                  <div className="flex justify-between border-b border-white/10 pb-3 text-xs text-white/50 font-bold">
                    <span>⚡ Daily Challenge Quiz</span>
                    <span>Question {dailyQIdx + 1} of 5</span>
                  </div>

                  <p className="text-lg font-bold leading-relaxed text-white font-sans">{dailyQs[dailyQIdx]?.question}</p>

                  <div className="space-y-3">
                    {dailyQs[dailyQIdx]?.options.map((opt, oIdx) => {
                      let style = 'bg-[var(--primary-deep-dark)] border-2 border-white/10 text-white/90 hover:bg-[var(--primary-deep-medium)] hover:border-[var(--primary-color)]';
                      if (dailyChecked) {
                        if (oIdx === dailyQs[dailyQIdx].correctIndex) style = 'bg-emerald-950/80 border-2 border-emerald-500 text-emerald-350 font-bold';
                        else if (dailySelectedOpt === oIdx) style = 'bg-[var(--primary-deep-dark)]/80 border-2 border-red-500 text-red-350 font-bold';
                      } else if (dailySelectedOpt === oIdx) {
                        style = 'bg-[var(--primary-deep-medium)]/60 border-2 border-[var(--primary-color)] text-white font-bold';
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleDailyAnswerSelect(oIdx)}
                          className={`w-full text-left p-4 border-2 rounded-xl text-xs font-bold transition-all ${style}`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </button>
                      );
                    })}
                  </div>

                  {dailyChecked && (
                    <div className="bg-stone-900/60 border border-white/5 p-4 rounded-xl text-xs text-white/70 leading-relaxed font-semibold">
                      <strong className="text-[#FFD700] block mb-1">Explanation:</strong>
                      {dailyQs[dailyQIdx]?.explanation}
                    </div>
                  )}

                  <div className="flex gap-3 pt-3">
                    {!dailyChecked ? (
                      <button 
                        onClick={handleDailyCheck}
                        disabled={dailySelectedOpt === null}
                        className="flex-1 py-3.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-adventure font-extrabold rounded-xl border-b-4 border-[var(--primary-dark)] uppercase text-xs disabled:opacity-50 transition-colors"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button 
                        onClick={handleDailyNext}
                        className="flex-1 py-3.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-adventure font-extrabold rounded-xl border-b-4 border-[var(--primary-dark)] uppercase text-xs transition-colors"
                      >
                        {dailyQIdx === 4 ? 'Finish challenge' : 'Next Question'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!dailyLoading && showDailyResults && (
                <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] p-8 text-white max-w-xl mx-auto rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-center font-sans animate-scale-in space-y-6">
                  <span className="text-5xl block mb-2">🏆</span>
                  <h3 className="font-adventure text-2xl font-bold text-[#FFD700] uppercase tracking-widest">
                    CHALLENGE COMPLETE
                  </h3>
                  
                  <div className="bg-[var(--primary-deep-dark)] border border-white/10 p-5 rounded-2xl max-w-xs mx-auto space-y-2">
                    <div className="flex justify-between font-bold text-xs text-white/60">
                      <span>Correct Answers:</span>
                      <span className="text-emerald-400">{dailyScore} / 5</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs text-white/60">
                      <span>Experience Gained:</span>
                      <span className="text-purple-400">+20 XP</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs text-white/60">
                      <span>Gold Earned:</span>
                      <span className="text-amber-400">🪙 +10 Coins</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onBack()}
                    className="w-full py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-adventure font-extrabold rounded-xl border-b-4 border-[var(--primary-dark)] uppercase tracking-wider text-xs transition-all active:scale-95 shadow-md"
                  >
                    Return to Menu
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] rounded-[1.5rem] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-white space-y-4 max-w-2xl mx-auto font-sans">
              <div className="flex items-center gap-3 border-b border-white/10 pb-2 mb-2">
                <button
                  onClick={handleGoBack}
                  className="px-3 py-1.5 rounded-lg bg-stone-850 hover:bg-stone-800 text-white font-bold text-xs uppercase font-adventure transition-all"
                >
                  ← Back
                </button>
                <h3 className="font-adventure text-xl font-bold text-[#FFD700] uppercase tracking-wide">Class Leaderboard</h3>
              </div>
              <p className="text-white/60 text-xs font-semibold">Standings of other students in: <span className="font-bold text-[var(--primary-color)] uppercase">{activeStudent.className}</span></p>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                {[
                  { name: activeStudent.name, xp: activeStudent.xp, coins: activeStudent.coins, isMe: true },
                  { name: 'Aarav Gupta', xp: 480, coins: 45 },
                  { name: 'Kabir Patel', xp: 320, coins: 30 },
                  { name: 'Diya Sharma', xp: 250, coins: 15 }
                ].sort((a,b)=>b.xp - a.xp).map((student, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl flex justify-between items-center border-2 ${
                      student.isMe ? 'bg-[var(--primary-deep-medium)]/60 border-[var(--primary-color)] text-white' : 'bg-[var(--primary-deep-dark)] border-white/5 text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-adventure font-extrabold text-sm text-[#FFD700]">#{idx+1}</span>
                      <span className="font-bold text-xs">{student.name} {student.isMe ? '(You)' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-adventure font-extrabold text-[var(--primary-color)]">
                      <span>⭐ {student.xp} XP</span>
                      <span className="text-amber-400">🪙 {student.coins} Coins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'join_classroom' && (
            <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] rounded-[1.5rem] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-white space-y-6 max-w-2xl mx-auto font-sans">
              <div className="flex items-center gap-3 border-b border-white/10 pb-2 mb-2">
                <button
                  onClick={handleGoBack}
                  className="px-3 py-1.5 rounded-lg bg-stone-850 hover:bg-stone-800 text-white font-bold text-xs uppercase font-adventure transition-all"
                >
                  ← Back
                </button>
                <h3 className="font-adventure text-xl font-bold text-[#FFD700] uppercase tracking-wide">Join Classroom</h3>
              </div>
              <p className="text-white/60 text-xs font-semibold">Enter a unique Join Code provided by your teacher to connect with your class.</p>

              <form onSubmit={handleJoinCodeSubmit} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1.5 uppercase tracking-wider">Classroom Join Code</label>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. BQ4X92"
                    className="w-full bg-[var(--primary-deep-dark)] border border-white/10 rounded-xl p-3 text-white text-sm font-mono tracking-widest font-bold focus:border-[var(--primary-color)] outline-none"
                    maxLength={10}
                    required
                  />
                </div>
                <button
                  id="classroom-join-submit-btn"
                  type="submit"
                  className="w-full py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] border-b-4 border-[var(--primary-dark)] text-white font-adventure font-extrabold rounded-xl uppercase transition-all shadow-md active:scale-95 text-xs tracking-wider"
                >
                  Request to Join
                </button>
              </form>

              {joinClassroomStatus && (
                <div className="bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-xs font-semibold">
                  {joinClassroomStatus}
                </div>
              )}
              {joinClassroomError && (
                <div className="bg-rose-950/70 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-xs font-semibold">
                  {joinClassroomError}
                </div>
              )}

              <div className="pt-6 border-t border-white/10 space-y-4">
                <h4 className="font-adventure text-md font-bold text-[#FFD700] uppercase tracking-wider">Current Classroom Connection Status</h4>
                {activeStudent.classId ? (
                  <div className="p-4 bg-[var(--primary-deep-dark)] border border-white/5 rounded-xl text-xs text-white space-y-2">
                    <div>
                      <span className="font-bold text-sm block text-[#FFD700]">Successfully Joined Class</span>
                      <span className="text-[10px] text-white/40 block">Class ID: {activeStudent.classId}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-white/80 text-[11px] pt-1">
                      <div><strong className="text-white/50">Name:</strong> {activeStudent.className}</div>
                      <div><strong className="text-white/50">Section:</strong> {activeStudent.classSection || 'A'}</div>
                      <div><strong className="text-white/50">Grade:</strong> Class {activeStudent.classGrade || activeStudent.grade || 11}</div>
                      <div><strong className="text-white/50">Subject:</strong> {activeStudent.classSubject || 'Computer Science'}</div>
                      <div><strong className="text-white/50">Teacher:</strong> {activeStudent.teacherName || 'Assigned Teacher'}</div>
                    </div>
                  </div>
                ) : activeStudent.pendingClass ? (
                  <div className="p-4 bg-[var(--primary-deep-dark)] border border-yellow-500/30 rounded-xl text-xs text-white space-y-2">
                    <span className="font-bold text-sm block text-yellow-400 animate-pulse">Pending Teacher Approval</span>
                    <p className="text-[11px] text-white/60">Waiting for teacher approval to join class:</p>
                    <div className="grid grid-cols-2 gap-2 text-white/80 text-[11px] pt-1">
                      <div><strong className="text-white/50">Name:</strong> {activeStudent.pendingClass.className}</div>
                      <div><strong className="text-white/50">Section:</strong> {activeStudent.pendingClass.classSection || 'A'}</div>
                      <div><strong className="text-white/50">Grade:</strong> Class {activeStudent.pendingClass.classGrade || 11}</div>
                      <div><strong className="text-white/50">Subject:</strong> {activeStudent.pendingClass.classSubject || 'Computer Science'}</div>
                      <div><strong className="text-white/50">Teacher:</strong> {activeStudent.pendingClass.teacherName}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[var(--primary-deep-dark)] border border-white/5 rounded-xl text-xs text-white/40 italic font-semibold">
                    Not currently enrolled in any classroom. Please enter a Join Code above to request access.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGoBack}
                      className="px-3 py-1.5 rounded-lg bg-gold/15 border border-gold/30 hover:bg-gold/25 text-gold font-bold text-xs uppercase font-adventure transition-all"
                    >
                      ← Back
                    </button>
                    <h3 className="font-adventure text-xl font-bold text-gold">Explorer Profile</h3>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProfile(!editingProfile);
                      if (!editingProfile) {
                        const nameParts = (activeStudent.name || '').split(' ');
                        setEditFirstName(nameParts[0] || '');
                        setEditLastName(nameParts.slice(1).join(' ') || '');
                        setEditEmail(activeStudent.email || '');
                        setEditSchool(activeStudent.school?.name || activeStudent.schoolName || 'ByteQuest Academy');
                        setEditAvatar(localStorage.getItem(`bytequest_student_avatar_${activeStudent.id}`) || '👾');
                        setEditProfilePic(localStorage.getItem(`bytequest_student_pic_${activeStudent.id}`) || '');
                        setEditDiff(localStorage.getItem(`bytequest_student_diff_${activeStudent.id}`) || 'medium');
                        setEditClass(activeStudent.class?.name || 'Class 11');
                        setEditSection(activeStudent.class?.section || 'B');
                        setEditCurrentPw('');
                        setEditNewPw('');
                        setProfileSaveStatus('');
                        setProfileSaveError('');
                      }
                    }}
                    className="px-3 py-1.5 bg-gold/20 border border-gold/50 text-gold text-[10px] font-bold rounded-lg hover:bg-gold/30 transition-colors"
                  >
                    {editingProfile ? 'Cancel' : '✏️ Edit Profile'}
                  </button>
                </div>

                {!editingProfile ? (
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gold-light pt-2">
                    <div className="col-span-2 flex items-center gap-4 border-b border-jungle-light pb-4 mb-2">
                      <div className="w-16 h-16 rounded-full bg-jungle-deep border border-gold/45 flex items-center justify-center text-3xl overflow-hidden">
                        {localStorage.getItem(`bytequest_student_pic_${activeStudent.id}`) ? (
                          <img src={localStorage.getItem(`bytequest_student_pic_${activeStudent.id}`)!} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                          localStorage.getItem(`bytequest_student_avatar_${activeStudent.id}`) || '👾'
                        )}
                      </div>
                      <div>
                        <span className="text-xl font-adventure text-gold block">{activeStudent.name}</span>
                        <span className="text-[10px] text-offwhite/50">Level {activeStudent.level} Explorer</span>
                      </div>
                    </div>
                    <div>Student Name: <span className="text-white font-bold">{activeStudent.name}</span></div>
                    <div>Roster Class: <span className="text-white font-bold">{activeStudent.class?.name || activeStudent.className || '—'}</span></div>
                    <div>Section: <span className="text-white font-bold">{activeStudent.class?.section || '—'}</span></div>
                    <div>Email: <span className="text-white font-bold">{activeStudent.email}</span></div>
                    <div>School: <span className="text-white font-bold">{activeStudent.school?.name || activeStudent.schoolName || 'ByteQuest Academy'}</span></div>
                    <div>Preferred Difficulty: <span className="text-white font-bold capitalize">{localStorage.getItem(`bytequest_student_diff_${activeStudent.id}`) || 'medium'}</span></div>
                    <div>XP: <span className="text-gold font-bold">⭐ {activeStudent.xp}</span></div>
                    <div>Coins: <span className="text-gold font-bold">🪙 {activeStudent.coins}</span></div>
                    <div>Level: <span className="text-gold font-bold">🛡️ {activeStudent.level}</span></div>
                    <div>Matches Played: <span className="text-gold font-bold">⚔️ {activeStudent.matchesPlayed || 0}</span></div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">First Name</label>
                        <input
                          type="text"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="First name"
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Last Name</label>
                        <input
                          type="text"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="Last name"
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Email</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email address"
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">School</label>
                        <input
                          type="text"
                          value={editSchool}
                          onChange={(e) => setEditSchool(e.target.value)}
                          placeholder="School name"
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Profile Photo URL</label>
                        <input
                          type="text"
                          value={editProfilePic}
                          onChange={(e) => setEditProfilePic(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Avatar Emoji</label>
                        <select
                          value={editAvatar}
                          onChange={(e) => setEditAvatar(e.target.value)}
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold font-sans"
                        >
                          <option value="👾">👾 Alien Beast</option>
                          <option value="🤖">🤖 Tech Golem</option>
                          <option value="🐱">🐱 Nyan Explorer</option>
                          <option value="🦁">🦁 Jungle Lion</option>
                          <option value="🧙">🧙 Code Wizard</option>
                          <option value="🦊">🦊 Stealth Fox</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Class</label>
                        <select
                          value={editClass}
                          onChange={(e) => setEditClass(e.target.value)}
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                        >
                          <option value="Class 10">Class 10</option>
                          <option value="Class 11">Class 11</option>
                          <option value="Class 12">Class 12</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Section</label>
                        <select
                          value={editSection}
                          onChange={(e) => setEditSection(e.target.value)}
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                        >
                          <option value="A">Section A</option>
                          <option value="B">Section B</option>
                          <option value="C">Section C</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Preferred Difficulty</label>
                        <select
                          value={editDiff}
                          onChange={(e) => setEditDiff(e.target.value)}
                          className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-jungle-light pt-3">
                      <p className="text-[10px] font-bold text-gold-light uppercase mb-2">Change Password (optional)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-jungle-light mb-1 font-sans">Current Password</label>
                          <input
                            type="password"
                            value={editCurrentPw}
                            onChange={(e) => setEditCurrentPw(e.target.value)}
                            placeholder="Current password"
                            className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-jungle-light mb-1 font-sans">New Password</label>
                          <input
                            type="password"
                            value={editNewPw}
                            onChange={(e) => setEditNewPw(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                          />
                        </div>
                      </div>
                    </div>
                    {profileSaveError && (
                      <div className="bg-rose-950/50 text-rose-300 text-xs p-2.5 rounded-lg border border-rose-500/40 font-semibold">
                        {profileSaveError}
                      </div>
                    )}
                    {profileSaveStatus && (
                      <div className="bg-emerald-950/50 text-emerald-300 text-xs p-2.5 rounded-lg border border-emerald-500/40 font-semibold">
                        {profileSaveStatus}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      Save Changes
                    </button>
                  </form>
                )}
              </div>

              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl space-y-4">
                <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2">Homework Assignments</h3>
                {pendingAssignments.length === 0 ? (
                  <p className="text-offwhite/40 italic py-6 text-center text-xs">No pending assignments allocated to your class yet.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingAssignments.map((assign: any) => (
                      <div key={assign.id} className="p-4 bg-jungle-deep/40 border border-jungle-light/20 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <h4 className="font-bold text-white mb-0.5">{assign.title}</h4>
                          <p className="text-gold-light text-[10px]">Topic: {assign.topic} | Difficulty: {assign.difficulty.toUpperCase()}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setQuizTopic(assign.topic);
                            setQuizDifficulty(assign.difficulty.toLowerCase() as any);
                            setActiveTab('practice_quiz');
                          }}
                          className="px-3 py-1.5 bg-gold text-jungle-deep font-bold rounded hover:bg-gold-light transition-colors"
                        >
                          Solve Quiz
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ALWAYS VISIBLE SIGN OUT IN PROFILE TAB */}
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 border border-rose-850/40 rounded-xl text-xs font-bold transition-all min-h-[44px] shadow-md uppercase tracking-wider font-adventure mt-4"
              >
                <span>🚪 Sign Out</span>
              </button>
            </div>
          )}


          {activeTab === 'settings' && (
            <div className="parchment-panel rounded-2xl p-8 text-slate-800 max-w-md mx-auto space-y-4">
              <div className="flex items-center gap-3 border-b border-gold-dark/25 pb-2 mb-2">
                <button
                  onClick={handleGoBack}
                  className="px-3 py-1.5 rounded-lg bg-[var(--primary-subtle-bg)] border border-[var(--primary-subtle-border)] hover:bg-[var(--primary-subtle-hover)] text-[var(--primary-dark)] font-bold text-xs uppercase font-adventure transition-all"
                >
                  ← Back
                </button>
                <h3 className="font-adventure text-2xl font-bold text-gold-dark">Audio & Themes</h3>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gold-dark/10">
                <span className="text-xs font-bold text-slate-500">Sound Effects</span>
                <button 
                  onClick={() => setAudioOn(!audioOn)}
                  className="p-2 rounded-lg bg-parchment-light border border-gold-dark/30 hover:bg-gold/15"
                >
                  {audioOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>

              <div className="space-y-2 text-left pt-2">
                <span className="text-xs font-bold text-slate-500 block">Interface Theme</span>
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
                        playBeep(440, 'sine', 0.05);
                        setTheme(t.id);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 text-[10px] font-extrabold font-adventure transition-all ${
                        theme === t.id
                          ? 'bg-gold-dark border-gold-dark text-white shadow-inner scale-[1.02]'
                          : 'bg-parchment-light hover:bg-gold/15 border-gold-dark/30 text-slate-700'
                      }`}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col relative select-none">
            {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="fixed top-2 right-2 z-[9999] flex items-center gap-1.5 bg-rose-900/90 border border-rose-500 text-rose-200 text-[10px] px-3 py-1.5 rounded-full shadow-lg font-bold">
          <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse"></span>
          Reconnecting...
        </div>
      )}
      {isConnected && (gameState === 'playing' || gameState === 'victory') && (
        <div className="fixed top-2 right-2 z-[9999] flex items-center gap-1.5 bg-emerald-900/80 border border-emerald-600/50 text-emerald-300 text-[10px] px-3 py-1.5 rounded-full font-bold">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          Live
        </div>
      )}

      {showRetryToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-2.5 bg-indigo-900 border border-indigo-400 text-indigo-100 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2">
            <span>📖</span>
            <span>Same question queued for your next turn!</span>
          </div>
        </div>
      )}

      {scorePopup && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-6 py-3 bg-indigo-600 border border-indigo-400 text-white rounded-full shadow-2xl font-bold text-sm">
            {scorePopup}
          </div>
        </div>
      )}


      {/* LOBBY CONNECTING STATE: when lobby gameState is set but socket room not yet established */}
      {gameState === 'lobby' && !syncState && (
        <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full font-sans animate-scale-in">
          <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] text-white rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-center">
            {lobbyTimeoutError ? (
              <>
                <div className="text-6xl mb-6">⚠️</div>
                <h2 className="font-adventure text-2xl md:text-3xl font-extrabold text-[var(--primary-color)] uppercase tracking-widest mb-3">Connection Timeout</h2>
                <p className="text-white/70 text-sm font-semibold mb-8 max-w-md mx-auto leading-relaxed">
                  Unable to connect to the ByteQuest multiplayer server. Please verify your internet connection or the status of the server.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleLobbyRetry}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-stone-950 font-adventure font-extrabold rounded-xl text-xs uppercase shadow-md active:scale-95 transition-all"
                  >
                    Retry Connection
                  </button>
                  <button
                    onClick={() => { onBack(); }}
                    className="px-6 py-3 bg-[var(--primary-deep-medium)] hover:bg-[var(--primary-deep)] text-white/70 hover:text-white font-adventure font-bold rounded-xl border border-white/15 text-xs uppercase tracking-widest transition-all"
                  >
                    Return to Menu
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-6 animate-pulse">⚔️</div>
                <h2 className="font-adventure text-2xl md:text-3xl font-extrabold text-[var(--primary-color)] uppercase tracking-widest mb-3">Setting Up Lobby...</h2>
                <p className="text-white/60 text-sm font-semibold mb-8">Connecting to the ByteQuest multiplayer network.</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[var(--primary-color)] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2.5 h-2.5 bg-[var(--primary-color)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2.5 h-2.5 bg-[var(--primary-color)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
                <button
                  onClick={() => { onBack(); }}
                  className="mt-10 px-6 py-3 bg-[var(--primary-deep-medium)] hover:bg-[var(--primary-deep)] text-white/70 hover:text-white font-adventure font-bold rounded-xl border border-white/15 text-xs uppercase tracking-widest transition-all"
                >
                  ← Cancel &amp; Return to Menu
                </button>
              </>
            )}
          </div>
        </main>
      )}

      {gameState === 'lobby' && syncState && (
        <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full font-sans animate-scale-in">
          <div className="bg-gradient-to-b from-[var(--primary-deep-medium)] to-[var(--primary-deep-dark)] border-3 border-[var(--primary-color)] text-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
            
            {/* Room Success Banner for Host */}
            {(syncState.roomCode.startsWith('BQ') || !syncState.classId) && (
              <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-xl mb-6 text-emerald-250 text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-4 select-text">
                <div>
                  <span className="font-adventure text-sm text-[#FFD700] block mb-0.5">🎉 Room Created Successfully!</span>
                  Share this code with your friends so they can join your adventure lobby.
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(syncState.roomCode);
                      alert("Room code copied to clipboard!");
                    }}
                    className="px-3 py-1.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white rounded font-bold uppercase text-[9px]"
                  >
                    Copy Code
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Join my ByteQuest Lobby!',
                          text: `Join my ByteQuest lobby using code: ${syncState.roomCode}`,
                          url: window.location.href
                        }).catch(console.error);
                      } else {
                        alert(`Share this code: ${syncState.roomCode}`);
                      }
                    }}
                    className="px-3 py-1.5 bg-[var(--primary-color)] hover:bg-red-550 text-white rounded font-bold uppercase text-[9px]"
                  >
                    Share
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-6">
              <div>
                <span className="text-[10px] block font-bold text-white/50 uppercase font-sans">
                  {syncState.roomCode.startsWith('BQ') ? (
                    `${lobbyConfigPrivate ? '🔒 Private' : '🌐 Public'} Lobby • Grade ${lobbyConfigGrade.toUpperCase()}`
                  ) : (
                    'Multiplayer Lobby'
                  )}
                </span>
                <h3 className="font-adventure text-2xl md:text-3xl font-bold text-[var(--primary-color)] uppercase tracking-wide">
                  {syncState.roomCode.startsWith('BQ') && lobbyConfigName ? lobbyConfigName : `Room Code: ${syncState.roomCode}`}
                </h3>
                {syncState.roomCode.startsWith('BQ') && (
                  <p className="text-[10px] text-white/60 font-bold mt-1">
                    Room Code: <span className="font-mono text-xs font-extrabold bg-[var(--primary-deep-dark)] border border-[var(--primary-color)] px-1.5 py-0.5 rounded text-white select-all">{syncState.roomCode}</span>
                    <span className="ml-2">• Capacity: {syncState.teams.length} / {lobbyConfigMaxPlayers} Teams</span>
                  </p>
                )}
              </div>
              <span className="px-3 py-1 bg-amber-950/60 border border-amber-500/30 rounded-full font-bold text-[10px] text-amber-300 animate-pulse font-sans shrink-0">Waiting for Players</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="font-adventure text-lg font-bold text-[#FFD700] mb-3">Enrolled Explorers</h4>
                <div className="space-y-3 text-xs">
                  {syncState.teams.map((t: any) => (
                    <div key={t.id} className="p-3 bg-[var(--primary-deep-dark)] border border-white/10 rounded-xl flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full ${t.color}`}></span>
                        <span>{t.name}</span>
                      </div>
                      <span className="text-[9px] text-white/65 font-bold">
                        {t.members.length} {t.members.length === 1 ? 'player' : 'players'} connected
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--primary-deep-dark)] border border-white/5 rounded-xl p-5 text-xs text-white/70 leading-relaxed font-semibold">
                <h4 className="font-adventure text-[#FFD700] text-sm font-bold mb-2 uppercase">Ludo Map Game Rules</h4>
                <ul className="list-disc pl-4 space-y-1 font-semibold font-sans font-medium text-white/80">
                  <li>Multiple players can share the same tile safely.</li>
                  <li>Incorrect answers queue the question for retry and prevent forward movement.</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              {(syncState.roomCode.startsWith('BQ') || !syncState.classId) && (
                <button 
                  onClick={handleStartPracticeGame}
                  disabled={syncState.teams.length < 2}
                  className="flex-1 py-3.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] border-b-4 border-[var(--primary-dark)] disabled:bg-gray-500 disabled:opacity-50 text-white font-adventure font-extrabold rounded-lg shadow-md transition-all active:scale-95 text-xs uppercase"
                >
                  {syncState.teams.length < 2 ? 'Need 2+ Players to Start' : 'Start Room'}
                </button>
              )}
              <button 
                onClick={() => {
                  if (socket) socket.emit('room:leave', { roomCode: syncState.roomCode });
                  onBack();
                }}
                className="px-6 py-3.5 bg-stone-800 border border-white/10 hover:bg-stone-750 text-white font-adventure font-extrabold rounded-lg text-xs uppercase transition-colors"
              >
                Leave Lobby
              </button>
            </div>
          </div>
        </main>
      )}

      {(gameState === 'playing' || gameState === 'victory') && syncState && (
        <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col justify-between relative">
          {activeStudent && (
            <div className="sticky top-14 md:top-[60px] z-30 pcb-card-panel border-3 border-[#D4AF37] px-4 py-3 flex items-center justify-between gap-4 mb-4 text-white select-none animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👤</span>
                <div>
                  <span className="text-[#FFD700] font-adventure text-sm font-extrabold block leading-none">{activeStudent.name}</span>
                  <span className="text-[9px] text-amber-200/70 font-bold uppercase tracking-wider">Level {activeStudent.level} Explorer</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">XP</span>
                <div className="bg-stone-950 border border-[#D4AF37]/30 rounded-full h-3.5 w-24 md:w-40 p-0.5 overflow-hidden flex items-center relative shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-[#D4AF37] to-[#FFD700] h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_#FFD700]"
                    style={{ width: `${Math.max(15, Math.min(100, (activeStudent.xp % 100)))}%` }}
                  ></div>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold font-mono text-white">
                    {activeStudent.xp}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-[#523B0B] border-2 border-[#D4AF37] px-3 py-1.5 rounded-full shadow-md">
                <span className="text-base">🪙</span>
                <span className="font-adventure text-sm font-extrabold text-[#FFD700] tracking-wider font-mono">
                  {activeStudent.coins}
                </span>
              </div>

              {/* Exit Game button — always visible in playing state */}
              <button
                onClick={handleGoBack}
                className="px-3 py-1.5 bg-[var(--primary-deep)] hover:bg-[var(--primary-deep-medium)] text-white/80 hover:text-white font-adventure font-bold rounded-xl border border-[#D4AF37]/30 text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-md"
                title="Exit Game"
              >
                ← Exit
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 w-full items-start">
            
            <div className="lg:col-span-3 pcb-card-panel border-3 border-[#D4AF37] p-3 md:p-5 relative w-full flex flex-col gap-3">
              <div className="relative w-full board-bg border-2 border-[#D4AF37]/50 rounded-2xl overflow-visible shadow-inner" style={{ paddingBottom: isMobile ? (windowWidth < 420 ? '300%' : '135%') : '72%' }}>
                <div className="absolute inset-3">
                  {/* Dark Fantasy Tech map details & circuit lines */}
                  <div className="absolute inset-0 bg-slate-950/20 pointer-events-none rounded-xl"></div>
                  
                  {/* Floating Sparkles / Particle Effects */}
                  <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ left: '15%', top: '25%', animationDuration: '3s' }}></div>
                    <div className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" style={{ left: '75%', top: '15%', animationDuration: '4s' }}></div>
                    <div className="absolute w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ left: '80%', top: '65%', animationDuration: '5s' }}></div>
                    <div className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ left: '25%', top: '75%', animationDuration: '3.5s' }}></div>
                    <div className="absolute w-1 h-1 bg-emerald-400 rounded-full animate-ping" style={{ left: '50%', top: '45%', animationDuration: '4.5s' }}></div>
                  </div>

                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.06),transparent_70%)] pointer-events-none rounded-xl"></div>
                  
                  {/* Single Winding Board-game Road Path */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="glowingPathGradOnline" x1="0%" y1="0%" x2="100%" y2="100%">
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
                    const activeTeam = syncState.teams[syncState.activeTeamIdx];
                    const isDestination = activeTeam && activeTeam.position === tIdx;
                    const isCompleted = syncState.teams.some((te: any) => te.position > tIdx);

                    const hexClass = getTileHexClass(tIdx);
                    const symbol = getTileSymbol(tIdx);

                    return (
                      <div 
                        key={tIdx} 
                        className={`stone-plinth ${hexClass} ${isDestination ? 'stone-plinth-destination' : ''} ${isCompleted ? 'stone-plinth-completed' : ''} ${collisionTileIndex === tIdx ? 'collision-flash' : ''}`} 
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

                  {/* Active Player Glow Ring — follows display position during animation */}
                  {syncState.teams[syncState.activeTeamIdx] && (() => {
                    const activeT = syncState.teams[syncState.activeTeamIdx];
                    const displayPos = displayPositions[activeT.id] ?? activeT.position;
                    const activeCoord = TILE_COORDS[Math.min(17, Math.max(0, displayPos))];
                    return (
                      <div 
                        className="active-glow-ring" 
                        style={{ left: `${activeCoord.x}%`, top: `${activeCoord.y}%` }}
                      />
                    );
                  })()}

                  {/* Characters standees — use displayPositions for smooth tile-by-tile movement */}
                  {syncState.teams.map((t: any, idx: number) => {
                    const displayPos = Math.min(17, Math.max(0, displayPositions[t.id] ?? t.position));
                    const coord = TILE_COORDS[displayPos];
                    // Group by display position for offset calculation
                    const teamsOnSameTile = syncState.teams.filter((te: any) => {
                      const teDisplayPos = Math.min(17, Math.max(0, displayPositions[te.id] ?? te.position));
                      return teDisplayPos === displayPos;
                    });
                    const tIndexOnTile = teamsOnSameTile.findIndex((te: any) => te.id === t.id);
                    
                    // Max 3 players fanned. For 4th player, render an overflow badge once. For 5th+, render nothing.
                    if (tIndexOnTile > 3) return null;
                    
                    const offset = getTokenOffset(tIndexOnTile, Math.min(4, teamsOnSameTile.length));
                    const isActive = syncState.activeTeamIdx === idx;
                    
                    return (
                      <div 
                        key={t.id} 
                        className="avatar-standee" 
                        style={{ 
                          left: `${coord.x}%`, 
                          top: `${coord.y}%`,
                          transform: `translate(-50%, -70%) translate(${offset.x}px, ${offset.y}px)`
                        }}
                      >
                        <div className={isActive ? 'active-token-bounce' : ''}>
                          {tIndexOnTile === 3 ? (
                            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-slate-850 border border-slate-600 text-white flex items-center justify-center font-bold text-[8px] sm:text-[10px] shadow-md select-none">
                              +{teamsOnSameTile.length - 3}
                            </div>
                          ) : (
                            <>
                              <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs border-2 border-white shadow-md text-white ${t.color || 'bg-blue-600'} ${isActive ? 'ring-2 ring-[#FFD700]' : ''}`}>
                                👤
                              </div>
                              {teamsOnSameTile.length === 1 && (
                                <span className="text-[5px] sm:text-[7px] font-sans font-bold text-white bg-slate-950/80 border border-slate-800 px-1 py-0.5 rounded-md block truncate max-w-[44px] mt-0.5 leading-none text-center shadow-md select-none">
                                  {t.name}
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
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 p-2 rounded-xl bg-slate-950/40 border border-slate-800 text-white select-none text-[8px] sm:text-[10px] w-full mt-2">
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
                const phase = getOnlineTurnPhase();
                const isMyTurnNow = phase === 'READY_TO_ROLL';
                return (
                  <div className={`flex md:hidden p-3 pcb-card-panel flex-col items-center justify-center gap-1.5 text-center w-full max-w-[280px] mx-auto text-white select-none transition-all ${isMyTurnNow ? 'border-3 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)]' : 'border-3 border-[#D4AF37]'}`}>
                    {/* Dynamic status text */}
                    <div className="w-full">
                      {renderDiceStatusArea(phase, getActivePlayerName(), localRollResult, true)}
                      {activeQuestion && (
                        <div className="mt-1 flex items-center justify-center gap-1.5 font-sans">
                          <span className="text-[8px] text-amber-200/70 font-bold uppercase tracking-wider">⏱</span>
                          <span className={`text-[10px] font-bold font-mono ${getTimerColorClass(timerRemaining, true)}`}>{timerRemaining}s</span>
                        </div>
                      )}
                    </div>

                    {/* D6 Cube Die */}
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <button
                        onClick={handleRollClick}
                        disabled={!isMyTurnNow || diceRolling || activeQuestion !== null || isMovingOnline}
                        className={`relative w-16 h-16 rounded-full hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center ${isMyTurnNow ? 'animate-pulse bg-[var(--primary-deep)] shadow-[0_0_20px_rgba(255,215,0,0.85)] border-2 border-[#FFD700]' : 'bg-[var(--primary-deep-dark)] border-2 border-[#D4AF37]/40'}`}
                        title={isMyTurnNow ? 'Your Turn — Roll Dice!' : 'Not your turn'}
                      >
                        <svg viewBox="0 0 100 100" className={`w-14 h-14 ${diceRolling ? 'dice-spin-shake' : ''}`} style={{ filter: isMyTurnNow ? 'drop-shadow(0 0 8px rgba(255,215,0,0.8))' : 'drop-shadow(0 2px 4px rgba(255,215,0,0.25))' }}>
                          {/* Top face */}
                          <polygon points="50,8 90,30 50,52 10,30" fill="var(--primary-deep)" stroke="#D4AF37" strokeWidth="2.5"/>
                          {/* Left face */}
                          <polygon points="10,30 50,52 50,92 10,70" fill="var(--primary-deep-dark)" stroke="#D4AF37" strokeWidth="2.5"/>
                          {/* Right face */}
                          <polygon points="90,30 50,52 50,92 90,70" fill="var(--primary-deep-dark)" stroke="#D4AF37" strokeWidth="2.5"/>
                          {/* Top face pips */}
                          <circle cx="38" cy="26" r="3.5" fill="#FFD700"/>
                          <circle cx="50" cy="34" r="3.5" fill="#FFD700"/>
                          <circle cx="62" cy="26" r="3.5" fill="#FFD700"/>
                        </svg>
                      </button>

                      {localRollResult !== null && !diceRolling && (
                        <div className="absolute inset-0 bg-[var(--primary-deep)]/95 flex items-center justify-center animate-scale-in pointer-events-none rounded-xl border-2 border-[#D4AF37] shadow-lg">
                          <span className="font-adventure text-3xl font-extrabold text-[#FFD700]">
                            {localRollResult}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}
            </div>

            <div className="flex flex-col gap-6 font-sans">
              {/* DESKTOP TURN PANEL - dynamic phase-aware status */}
              {(() => {
                const phase = getOnlineTurnPhase();
                const isMyTurnNow = phase === 'READY_TO_ROLL';
                return (
                  <div className={`hidden md:flex p-6 pcb-card-panel flex-col items-center justify-center text-center text-white select-none transition-all ${isMyTurnNow ? 'border-3 border-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.25)]' : 'border-3 border-[#D4AF37]'}`}>
                    <span className="text-[10px] block font-bold text-amber-300 uppercase tracking-wider mb-2 font-adventure">Current Turn</span>
                    <div className="mb-2">
                      <span className="font-adventure text-lg font-extrabold text-[#FFD700] block uppercase tracking-wide truncate max-w-[140px]">
                        {getActivePlayerName()}
                      </span>
                    </div>

                    {/* Dynamic status area */}
                    <div className="mb-3 border-t border-b border-[#D4AF37]/20 py-2 w-full">
                      {renderDiceStatusArea(phase, getActivePlayerName(), localRollResult, false)}
                      {activeQuestion && (
                        <div className="flex items-center justify-center gap-1.5 mt-1 font-sans">
                          <span className="text-[10px] text-amber-200/70 font-bold uppercase tracking-wider">⏱</span>
                          <span className={`text-lg font-bold font-mono tracking-tight ${getTimerColorClass(timerRemaining, true)}`}>{timerRemaining}s</span>
                        </div>
                      )}
                    </div>

                    {/* D6 Cube Die — Desktop */}
                    <div className="relative w-28 h-28 flex items-center justify-center mb-2">
                      <button
                        onClick={handleRollClick}
                        disabled={!isMyTurnNow || diceRolling || activeQuestion !== null || isMovingOnline}
                        className={`relative w-24 h-24 rounded-full hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center ${isMyTurnNow ? 'animate-pulse bg-[var(--primary-deep)] shadow-[0_0_30px_rgba(255,215,0,0.95)] border-3 border-[#FFD700]' : 'bg-[var(--primary-deep-dark)] border-2 border-[#D4AF37]/45'}`}
                        title={isMyTurnNow ? 'Your Turn — Click to Roll!' : 'Not your turn'}
                      >
                        <svg viewBox="0 0 100 100" className={`w-20 h-20 ${diceRolling ? 'dice-spin-shake' : 'hover:drop-shadow-md'}`} style={{ filter: isMyTurnNow ? 'drop-shadow(0 0 12px rgba(255,215,0,0.9))' : 'drop-shadow(0 3px 6px rgba(255,215,0,0.25))' }}>
                          {/* Top face */}
                          <polygon points="50,8 90,30 50,52 10,30" fill="var(--primary-deep)" stroke="#D4AF37" strokeWidth="2"/>
                          {/* Left face */}
                          <polygon points="10,30 50,52 50,92 10,70" fill="var(--primary-deep-dark)" stroke="#D4AF37" strokeWidth="2"/>
                          {/* Right face */}
                          <polygon points="90,30 50,52 50,92 90,70" fill="var(--primary-deep-dark)" stroke="#D4AF37" strokeWidth="2"/>
                          {/* Top face pips */}
                          <circle cx="38" cy="25" r="4" fill="#FFD700"/>
                          <circle cx="50" cy="33" r="4" fill="#FFD700"/>
                          <circle cx="62" cy="25" r="4" fill="#FFD700"/>
                          {/* Left face pip */}
                          <circle cx="28" cy="60" r="3.5" fill="#FFD700"/>
                          {/* Right face pips */}
                          <circle cx="72" cy="58" r="3.5" fill="#FFD700"/>
                          <circle cx="72" cy="72" r="3.5" fill="#FFD700"/>
                        </svg>
                      </button>

                      {localRollResult !== null && !diceRolling && (
                        <div className="absolute inset-0 bg-[var(--primary-deep)]/95 flex items-center justify-center animate-scale-in pointer-events-none rounded-2xl border-3 border-[#D4AF37] shadow-lg">
                          <div className="text-center">
                            <span className="block text-[8px] text-[#FFD700] uppercase font-extrabold tracking-widest leading-none mb-0.5 font-adventure">ROLLED</span>
                            <span className="font-adventure text-5xl font-extrabold text-[#FFD700]">
                              {localRollResult}
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

              {/* Roster leaderboard / Opponent Solving Handoff */}
              <div className="flex flex-col gap-6 w-full">
                {activeQuestion && !checkIsMyTurn() ? (
                  <div className="bg-[var(--primary-deep-medium)] border-3 border-[#D4AF37] p-5 rounded-3xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] text-white space-y-4 select-text">
                    <div className="flex justify-between items-center border-b border-[#D4AF37]/35 pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-amber-350 uppercase tracking-widest block font-sans">Explorer Solving...</span>
                        <span className="font-adventure text-lg font-bold text-white">👤 {getActivePlayerName()}</span>
                      </div>
                      {!quizResult && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full border bg-[var(--primary-deep)] border-[#D4AF37] text-[#FFD700] animate-pulse">
                          ⏰ {timerRemaining}s
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider block mb-1">Question</span>
                      <p className="text-white text-xs font-semibold leading-relaxed font-sans">{activeQuestion.question}</p>
                    </div>

                    <div className="space-y-1.5 font-sans">
                      {activeQuestion.options?.map((opt: string, oi: number) => {
                        let chipStyle = 'bg-[var(--primary-deep-dark)] border-white/10 text-white/75';
                        if (quizResult) {
                          if (oi === activeQuestion.correctIndex) chipStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                          else if (oi === quizResult.answerIndex) chipStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 font-bold';
                        }
                        return (
                          <div key={oi} className={`w-full text-left px-3 py-2 rounded-xl border text-[10px] font-semibold ${chipStyle}`}>
                            {String.fromCharCode(65 + oi)}. {opt}
                          </div>
                        );
                      })}
                    </div>

                    {quizResult && (
                      <div className={`p-2 rounded-xl text-[10px] font-bold text-center border ${
                        quizResult.isCorrect ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-rose-950/80 border-rose-500 text-rose-300'
                      }`}>
                        {quizResult.isCorrect ? `✓ Correct` : `✗ Wrong`}
                      </div>
                    )}

                    {quizResult && activeQuestion.explanation && (
                      <div className="bg-[var(--primary-deep-dark)] text-white/80 p-3 rounded-xl text-[10px] border border-white/5 leading-relaxed font-semibold">
                        <p className="font-bold text-[#FFD700] mb-1 font-sans uppercase tracking-wider">Explanation:</p>
                        {activeQuestion.explanation}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pcb-card-panel border-3 border-[#D4AF37] p-4 text-white">
                    <button 
                      onClick={() => setIsLeaderboardExpanded(!isLeaderboardExpanded)}
                      className="w-full flex justify-between items-center font-adventure text-sm font-extrabold text-[#FFD700] border-b border-[#D4AF37]/35 pb-2 uppercase tracking-wider"
                    >
                      <span>📊 Standings</span>
                      <span>{isLeaderboardExpanded ? '▲ Collapse' : '▼ Expand'}</span>
                    </button>
                    
                    {isLeaderboardExpanded && (
                      <div className="space-y-3 text-xs mt-3 animate-fade-in">
                        {syncState.teams.slice().sort((a: any, b: any) => {
                          const rA = a.finishedRank || (a.finished ? 1 : 99);
                          const rB = b.finishedRank || (b.finished ? 1 : 99);
                          if (rA !== rB) return rA - rB;
                          return b.position - a.position || b.xp - a.xp;
                        }).map((p: any, idx: number) => (
                          <div key={p.id} className={`p-3 bg-[var(--primary-deep-dark)] border-2 rounded-2xl shadow-md text-white ${p.finished ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-[#D4AF37]/30'}`}>
                            <div className="flex justify-between items-center font-bold mb-2">
                              <span className="text-[#FFD700] text-xs flex items-center gap-1.5">
                                <span className="font-adventure text-[#FFD700]">
                                  {p.finished ? `🏆 #${p.finishedRank}` : `#${idx+1}`}
                                </span>
                                <span>👤</span>
                                <span className={`truncate max-w-[90px] ${p.finished ? 'text-emerald-300' : 'text-amber-100'}`}>{p.name} {p.finished && '🏁'}</span>
                              </span>
                              {p.streak >= 3 && <span className="text-rose-400 animate-pulse text-[10px]">🔥 {p.streak}</span>}
                            </div>
                            <div className="grid grid-cols-3 gap-1 bg-[var(--primary-deep-medium)] border border-[#D4AF37]/35 p-1 rounded-xl text-center font-mono">
                              <div className="border-r border-[#D4AF37]/20"><span className="text-[7px] block text-amber-200/50 uppercase leading-none">XP</span><span className="font-bold text-xs text-white">{p.xp}</span></div>
                              <div className="border-r border-[#D4AF37]/20"><span className="text-[7px] block text-[#FFD700]/50 uppercase leading-none">Gold</span><span className="font-bold text-xs text-white">{p.coins}</span></div>
                              <div><span className="text-[7px] block text-[#FFD700]/50 uppercase leading-none">Tile</span><span className="font-bold text-xs text-[#FFD700]">{p.position + 1}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

        </main>
      )}

      {gameState === 'playing' && activeQuestion && syncState && checkIsMyTurn() && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto select-text animate-fade-in">
          <div className="parchment-scroll max-w-xl w-full p-6 text-[#2D0B0B] relative shadow-2xl my-8">
            
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#C49A45]/30 text-xs text-stone-500 font-sans font-bold">
              <span>Topic: {activeQuestion.topic}</span>
              {!quizResult && <span className="font-bold text-amber-800">⏱ {timerRemaining}s</span>}
            </div>

            <p className="text-lg font-bold mb-6 leading-relaxed text-[#2D0B0B] font-sans">{activeQuestion.question}</p>

            <div className="space-y-3 mb-6">
              {activeQuestion.options?.map((opt: string, oIdx: number) => {
                const isSelected = selectedOption === oIdx;
                let style = 'bg-[#FFFDF6] border-[#C49A45]/45 hover:bg-[#F2EBD9] hover:border-[#C49A45] text-[#2D0B0B]';
                if (quizResult) {
                  if (oIdx === activeQuestion.correctIndex) style = 'bg-emerald-100 border-emerald-600 text-emerald-950 font-bold';
                  else if (isSelected) style = 'bg-rose-100 border-rose-600 text-rose-950 font-bold';
                } else if (isSelected) {
                  style = 'border-amber-700 bg-[#F2EBD9] text-[#2D0B0B] ring-2 ring-amber-700/35';
                }
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSubmitAnswer(oIdx)}
                    disabled={quizResult !== null || !checkIsMyTurn()}
                    className={`w-full text-left p-4 rounded-xl border-2 font-bold text-xs transition-all shadow-sm active:translate-y-0.5 ${style}`}
                  >
                    {String.fromCharCode(65 + oIdx)}. {opt}
                  </button>
                );
              })}
            </div>

            {quizResult && activeQuestion.explanation && (
              <div className="bg-[#FFFDF6] border border-[#C49A45]/40 p-4 rounded-xl text-xs text-stone-700">
                <p className="font-adventure text-amber-800 font-bold mb-1 uppercase tracking-wider">Explanation:</p>
                {activeQuestion.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'victory' && syncState && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-text animate-fade-in font-serif">
          <div className="bg-[var(--primary-deep-medium)] border-4 border-[#D4AF37] max-w-xl w-full p-8 text-center rounded-[2rem] relative shadow-[0_0_60px_rgba(255,215,0,0.4)] animate-scale-in flex flex-col items-center text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,215,0,0.15),transparent_70%)] pointer-events-none"></div>
            
            <span className="text-7xl block mb-4 animate-bounce">🏆</span>
            <h2 className="font-adventure text-4xl font-extrabold text-[#FFD700] mb-2 drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)] uppercase tracking-widest">Victory!</h2>
            <p className="text-amber-200/70 font-sans text-xs uppercase tracking-widest font-bold mb-6">Adventure Completed</p>
            
            {multiplayerLevelUp && (
              <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 border border-yellow-300 px-6 py-2 rounded-2xl font-adventure text-sm font-bold mb-6 animate-pulse shadow-md">
                🎉 LEVEL UP! You reached a new Explorer level! 🎉
              </div>
            )}

            {syncState.teams.length > 0 && (() => {
              const sorted = syncState.teams.slice().sort((a: any, b: any) => {
                const rA = a.finishedRank || 999;
                const rB = b.finishedRank || 999;
                if (rA !== rB) return rA - rB;
                return b.position - a.position || b.xp - a.xp;
              });
              const winner = sorted[0];
              return (
                <div className="bg-[var(--primary-deep-dark)] border border-[#D4AF37]/50 rounded-3xl p-6 w-full max-w-sm mb-6 shadow-md text-left font-sans">
                  <h4 className="text-xs font-extrabold text-[#FFD700] uppercase tracking-wider mb-3 text-center">Champion: 👤 {winner.name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-[var(--primary-deep-medium)] border border-[#D4AF37]/35 p-3 rounded-2xl">
                      <span className="text-[10px] block text-amber-200/50 uppercase font-bold">XP Gained</span>
                      <span className="text-lg font-bold text-white">+{winner.xp} XP</span>
                    </div>
                    <div className="bg-[var(--primary-deep-medium)] border border-[#D4AF37]/35 p-3 rounded-2xl">
                      <span className="text-[10px] block text-amber-200/50 uppercase font-bold">Coins Earned</span>
                      <span className="text-lg font-bold text-white">+{winner.coins} Gold</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="w-full max-w-md max-h-48 overflow-y-auto scrollbar-none mb-8 space-y-2 font-sans">
              {syncState.teams.slice().sort((a: any, b: any) => {
                const rA = a.finishedRank || 999;
                const rB = b.finishedRank || 999;
                if (rA !== rB) return rA - rB;
                return b.position - a.position || b.xp - a.xp;
              }).map((p: any, idx: number) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-[var(--primary-deep-dark)] border border-[#D4AF37]/30 rounded-xl text-xs text-white">
                  <span className="font-bold">#{idx+1} 👤 {p.name} {p.finished && '🏁'}</span>
                  <span className="font-semibold text-amber-200/80">{p.xp} XP | {p.coins} Coins</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-2 font-sans w-full max-w-xs">
              <button 
                onClick={() => {
                  setLobbyConfigName('');
                  setLobbyConfigGrade('mixed');
                  setLobbyConfigMaxPlayers(4);
                  setLobbyConfigPrivate(false);
                  setShowLobbyConfigModal(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-stone-950 border border-yellow-300 font-adventure font-extrabold rounded-xl text-xs uppercase shadow-md active:scale-95 transition-all"
              >
                Play Again
              </button>
              <button 
                onClick={() => { onBack(); }}
                className="w-full py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-adventure font-extrabold rounded-xl text-xs uppercase shadow-md active:scale-95 transition-all border-b-4 border-[var(--primary-dark)]"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
