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
import { Tile, BOARD_TILES, TILE_COORDS, SAFE_TILES, PRESET_COLORS, PRESET_AVATARS } from '../config';
import { questionBank, Question } from '../questions';
import confetti from 'canvas-confetti';


interface StudentGameProps {
  onBack: () => void;
  socket: any;
  onStartSoloPractice: () => void;
  onResumeLocalPractice: (savedState: any) => void;
}

export default function StudentGame({ onBack, socket, onStartSoloPractice, onResumeLocalPractice }: StudentGameProps) {
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

  // New Auth Overhaul State
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'wizard'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupGrade, setSignupGrade] = useState('10');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  
  // Wizard variables
  const [schools, setSchools] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [wSchoolId, setWSchoolId] = useState('');
  const [wTeacherId, setWTeacherId] = useState('');
  const [wClassId, setWClassId] = useState('');

  // Dashboard Nav States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'continue' | 'new_adventure' | 'practice_quiz' | 'daily_challenge' | 'leaderboard' | 'profile' | 'settings' | 'join_classroom'>('dashboard');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [joinClassroomStatus, setJoinClassroomStatus] = useState<string>('');
  const [joinClassroomError, setJoinClassroomError] = useState<string>('');

  // Active Game State controls
  const [gameState, setGameState] = useState<'dashboard' | 'lobby' | 'playing' | 'victory'>('dashboard');
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  
  // Roster/Lobby Sync
  const [rosterClass, setRosterClass] = useState<any>(null);
  const [myTeam, setMyTeam] = useState<any>(null);
  const [syncState, setSyncState] = useState<any>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [scorePopup, setScorePopup] = useState<string | null>(null);

  // Synced Quiz State
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(20);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Audio Config
  const [audioOn, setAudioOn] = useState<boolean>(true);
  const [diceRolling, setDiceRolling] = useState<boolean>(false);
  const [localRollResult, setLocalRollResult] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [hasPendingRetry, setHasPendingRetry] = useState<boolean>(false);
  const [showRetryToast, setShowRetryToast] = useState<boolean>(false);

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

  // API Config
  const baseApi = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
  const STUDENT_API_BASE = `${baseApi}/api/v1/student`;
  const TEACHER_API_BASE = `${baseApi}/api/v1/teacher`;

  // Restore Student Session on Mount
  useEffect(() => {
    const cachedStudentId = localStorage.getItem('bytequest_student_id');
    if (cachedStudentId) {
      loadStudentProfile(cachedStudentId);
    }
  }, []);

  const loadStudentProfile = async (studentId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${STUDENT_API_BASE}/profile/${studentId}`);
      const data = await res.json();
      if (res.ok) {
        setActiveStudent(data.student);
        localStorage.setItem('bytequest_student_id', studentId);
        setGameState('dashboard');
      } else {
        localStorage.removeItem('bytequest_student_id');
        setActiveStudent(null);
      }
    } catch (e) {
      console.error('Failed to load profile', e);
      localStorage.removeItem('bytequest_student_id');
      setActiveStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const res = await fetch(`${STUDENT_API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        loadStudentProfile(data.student.id);
      } else {
        setAuthError(data.error || 'Login failed.');
      }
    } catch (err) {
      setAuthError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const res = await fetch(`${STUDENT_API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          grade: Number(signupGrade),
          firstName: signupFirstName,
          lastName: signupLastName
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('bytequest_student_id', data.student.id);
        setActiveStudent(data.student);
        setAuthMode('wizard');
        fetchSchools();
      } else {
        setAuthError(data.error || 'Signup failed.');
      }
    } catch (err) {
      setAuthError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await fetch(`${STUDENT_API_BASE}/schools`);
      const data = await res.json();
      if (res.ok) setSchools(data.schools || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSchoolSelect = async (schoolId: string) => {
    setWSchoolId(schoolId);
    setWTeacherId('');
    setWClassId('');
    setTeachers([]);
    setClasses([]);
    if (!schoolId) return;
    try {
      const res = await fetch(`${STUDENT_API_BASE}/teachers?schoolId=${schoolId}`);
      const data = await res.json();
      if (res.ok) setTeachers(data.teachers || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTeacherSelect = async (teacherId: string) => {
    setWTeacherId(teacherId);
    setWClassId('');
    setClasses([]);
    if (!teacherId) return;
    try {
      const res = await fetch(`${STUDENT_API_BASE}/classes?teacherId=${teacherId}`);
      const data = await res.json();
      if (res.ok) setClasses(data.classes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wClassId || !activeStudent) return;
    setLoading(true);
    try {
      const res = await fetch(`${STUDENT_API_BASE}/join-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeStudent.id,
          classId: wClassId,
          studentName: activeStudent.name
        })
      });
      if (res.ok) {
        loadStudentProfile(activeStudent.id);
      }
    } catch (err) {
      console.error(err);
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
        setJoinClassroomError(data.error || 'Failed to submit join request.');
      }
    } catch (err: any) {
      setJoinClassroomError(err.message || 'An error occurred.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bytequest_student_id');
    setActiveStudent(null);
    setAuthMode('login');
    setGameState('dashboard');
  };




  // Socket Listener Wiring
  useEffect(() => {
    if (socket && activeStudent) {
      // Auto-reconnect: on (re)connect, if we're in a game, rejoin
      const handleConnect = () => {
        setIsConnected(true);
        if (syncState && syncState.roomCode && syncState.status === 'PLAYING') {
          socket.emit('student:reconnect', { roomCode: syncState.roomCode, studentId: activeStudent.id });
        }
      };
      const handleDisconnect = () => setIsConnected(false);

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      socket.on('room:updated', (data: any) => {
        setSyncState(data);
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
        setJoinError(data.message);
        setGameState('dashboard');
      });

      socket.on('error', (data: any) => {
        setJoinError(data.message || 'Connection error occurred');
        setGameState('dashboard');
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
    };
  }, [socket, activeStudent, syncState]);

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

  const handleSelectNameAndJoin = () => {
    if (!activeStudent || !socket) return;
    if (roomCode.startsWith('BQ')) {
      socket.emit('student:join_practice', { roomCode, studentId: activeStudent.id, studentName: activeStudent.name });
    } else {
      socket.emit('student:join', { roomCode, studentId: activeStudent.id });
    }
    setGameState('lobby');
  };

  const handleCreatePracticeRoom = () => {
    if (!activeStudent || !socket) return;
    socket.emit('student:create_practice', { studentId: activeStudent.id, studentName: activeStudent.name });
    setGameState('lobby');
  };

  const handleStartPracticeGame = () => {
    if (socket && syncState) {
      socket.emit('student:start_practice', { roomCode: syncState.roomCode });
    }
  };

  const handleRollClick = () => {
    if (socket && syncState && !diceRolling && !activeQuestion) {
      socket.emit('student:roll', { roomCode: syncState.roomCode, studentId: activeStudent.id });
    }
  };

  const handleSubmitAnswer = (oIdx: number) => {
    if (quizResult || !activeQuestion || !socket) return;
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
      return;
    }
    const shuffled = [...questionBank].sort(() => 0.5 - Math.random()).slice(0, 5);
    setDailyQs(shuffled);
    setDailyQIdx(0);
    setDailyScore(0);
    setDailySelectedOpt(null);
    setDailyChecked(false);
    setDailyActive(true);
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
        });
      }
      setDailyPlayedToday(true);
      alert(`Daily Challenge completed! Gained +20 XP and +10 Coins!`);
      setDailyActive(false);
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
    return (
      <main className="max-w-md mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full min-h-[85vh] select-text">
        <div className="parchment-panel rounded-2xl p-8 text-jungle-deep shadow-2xl relative flex flex-col justify-between">
          <div>
            <div className="flex justify-center mb-6">
              <span className="text-5xl animate-bounce-slow">👑</span>
            </div>
            
            {authMode === 'login' && (
              <>
                <h3 className="font-adventure text-3xl font-bold text-center text-gold-dark mb-1">Explorer Sign In</h3>
                <p className="text-center text-xs font-semibold text-jungle-light mb-6">Enter your student credentials to continue</p>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">Email Address</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. student@bytequest.com"
                      className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-semibold text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-semibold text-sm"
                      required
                    />
                  </div>
                  {authError && (
                    <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-lg font-semibold text-center border border-red-200">
                      {authError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                    Sign In
                  </button>
                </form>
                <div className="mt-6 text-center text-xs font-semibold text-jungle-light">
                  New explorer?{' '}
                  <button type="button" onClick={() => { setAuthError(''); setAuthMode('signup'); }} className="text-gold-dark hover:underline font-bold">
                    Create an Account
                  </button>
                </div>
              </>
            )}

            {authMode === 'signup' && (
              <>
                <h3 className="font-adventure text-3xl font-bold text-center text-gold-dark mb-1">New Explorer Profile</h3>
                <p className="text-center text-xs font-semibold text-jungle-light mb-6">Create your account to start the quest</p>
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">First Name</label>
                      <input
                        type="text"
                        value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)}
                        placeholder="Aarav"
                        className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-semibold text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">Last Name</label>
                      <input
                        type="text"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        placeholder="Sharma"
                        className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-semibold text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">Grade</label>
                    <select
                      value={signupGrade}
                      onChange={(e) => setSignupGrade(e.target.value)}
                      className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-bold text-sm"
                    >
                      <option value="10">Grade 10</option>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">Email Address</label>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="e.g. explorer@student.com"
                      className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-semibold text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">Password</label>
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-semibold text-sm"
                      required
                    />
                  </div>
                  {authError && (
                    <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-lg font-semibold text-center border border-red-200">
                      {authError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                    Create Profile
                  </button>
                </form>
                <div className="mt-6 text-center text-xs font-semibold text-jungle-light">
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setAuthError(''); setAuthMode('login'); }} className="text-gold-dark hover:underline font-bold">
                    Sign In
                  </button>
                </div>
              </>
            )}

            {authMode === 'wizard' && (
              <>
                <h3 className="font-adventure text-3xl font-bold text-center text-gold-dark mb-1">Select Your Class</h3>
                <p className="text-center text-xs font-semibold text-jungle-light mb-6">Choose your school and class section to enroll</p>
                <form onSubmit={handleEnrollSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">1. Choose School</label>
                    <select
                      value={wSchoolId}
                      onChange={(e) => handleSchoolSelect(e.target.value)}
                      className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-bold text-sm"
                      required
                    >
                      <option value="">Select School...</option>
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.district})</option>
                      ))}
                    </select>
                  </div>
                  
                  {wSchoolId && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">2. Choose Teacher</label>
                      <select
                        value={wTeacherId}
                        onChange={(e) => handleTeacherSelect(e.target.value)}
                        className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-bold text-sm"
                        required
                      >
                        <option value="">Select Teacher...</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {wTeacherId && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">3. Choose Class Section</label>
                      <select
                        value={wClassId}
                        onChange={(e) => setWClassId(e.target.value)}
                        className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-bold text-sm"
                        required
                      >
                        <option value="">Select Section...</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !wClassId}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                    Request Enrollment
                  </button>

                  <button
                    type="button"
                    onClick={() => { setGameState('dashboard'); }}
                    className="w-full py-2 bg-parchment-dark text-jungle-deep font-bold rounded-lg text-xs"
                  >
                    Skip & Play Offline
                  </button>
                </form>
              </>
            )}

          </div>

          <button onClick={onBack} className="mt-8 text-center text-xs text-jungle-light font-bold hover:text-jungle-deep">
            ← Back to Main Menu
          </button>
        </div>
      </main>
    );
  }

  if (gameState === 'dashboard') {
    const pendingAssignments = activeStudent.assignments ? activeStudent.assignments.filter((a: any) => !a.isCompleted) : [];

    return (
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full px-4 py-8 gap-8 select-text">
        <aside className="w-full md:w-64 bg-jungle-medium border border-jungle-light rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-jungle-light pb-4">
              <Compass className="text-gold w-6 h-6" />
              <span className="font-adventure text-lg font-bold text-gold">Student Portal</span>
            </div>

            <nav className="flex flex-col gap-2">
              <button 
                onClick={() => { playBeep(350, 'sine', 0.05); setActiveTab('dashboard'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'}`}
              >
                Dashboard
              </button>
              <button 
                disabled={!roomCode}
                onClick={() => { playBeep(370, 'sine', 0.05); setActiveTab('continue'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${activeTab === 'continue' ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'}`}
              >
                Continue Adventure
              </button>
              <button 
                onClick={() => { playBeep(390, 'sine', 0.05); setActiveTab('new_adventure'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'new_adventure' ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'}`}
              >
                New Adventure
              </button>
              <button 
                onClick={() => { playBeep(410, 'sine', 0.05); setActiveTab('practice_quiz'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'practice_quiz' ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'}`}
              >
                Practice Quiz
              </button>
              <button 
                onClick={() => { playBeep(430, 'sine', 0.05); setActiveTab('daily_challenge'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'daily_challenge' ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'}`}
              >
                Daily Challenge
              </button>
              <button 
                onClick={() => { playBeep(450, 'sine', 0.05); setActiveTab('leaderboard'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'}`}
              >
                Leaderboard
              </button>
              <button 
                onClick={() => { playBeep(460, 'sine', 0.05); setActiveTab('join_classroom'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'join_classroom' ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'}`}
              >
                Join Classroom
              </button>
              <button 
                onClick={() => { playBeep(470, 'sine', 0.05); setActiveTab('profile'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'}`}
              >
                Profile
              </button>
              <button 
                onClick={() => { playBeep(490, 'sine', 0.05); setActiveTab('settings'); }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'}`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-jungle-light space-y-2">
            <div className="flex items-center gap-2 px-2 text-offwhite/70 text-[10px] font-bold uppercase">
              <User className="w-3.5 h-3.5 text-gold" />
              <span>{activeStudent.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between text-left px-4 py-2 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition-colors"
            >
              <span>Sign Out</span>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        <section className="flex-1 min-h-[50vh]">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
                <h2 className="font-adventure text-3xl font-bold text-gold mb-2">Welcome Back, Explorer!</h2>
                <p className="text-gold-light text-sm">You are logged into class roster: <span className="font-bold text-white">{activeStudent.className}</span>. Ready to study?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-jungle-deep border border-jungle-light/35 p-5 rounded-2xl text-center">
                  <span className="text-3xl block mb-1">⭐</span>
                  <span className="text-[10px] block text-offwhite/50 font-bold uppercase">Experience XP</span>
                  <span className="font-adventure text-2xl font-bold text-gold">{activeStudent.xp}</span>
                </div>
                <div className="bg-jungle-deep border border-jungle-light/35 p-5 rounded-2xl text-center">
                  <span className="text-3xl block mb-1">🪙</span>
                  <span className="text-[10px] block text-offwhite/50 font-bold uppercase">Treasure Coins</span>
                  <span className="font-adventure text-2xl font-bold text-gold">{activeStudent.coins}</span>
                </div>
                <div className="bg-jungle-deep border border-jungle-light/35 p-5 rounded-2xl text-center">
                  <span className="text-3xl block mb-1">🛡️</span>
                  <span className="text-[10px] block text-offwhite/50 font-bold uppercase">Explorer Level</span>
                  <span className="font-adventure text-2xl font-bold text-gold">{activeStudent.level}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button onClick={() => setActiveTab('new_adventure')} className="parchment-panel rounded-2xl p-6 text-center hover:scale-105 transition-all text-jungle-deep">
                  <span className="text-4xl block mb-2">🗺️</span>
                  <h3 className="font-adventure text-xl font-bold text-gold-dark mb-1">Start Adventure</h3>
                  <p className="text-[10px] text-jungle-light">Solo offline or classroom lobbies</p>
                </button>
                <button onClick={() => setActiveTab('daily_challenge')} className="parchment-panel rounded-2xl p-6 text-center hover:scale-105 transition-all text-jungle-deep">
                  <span className="text-4xl block mb-2">⚡</span>
                  <h3 className="font-adventure text-xl font-bold text-gold-dark mb-1">Daily Challenge</h3>
                  <p className="text-[10px] text-jungle-light">Reset at midnight, earn coins</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'continue' && (
            <div className="space-y-6 max-w-xl mx-auto">
              {/* Option A: Reconnect Live Match */}
              {roomCode && (
                <div className="parchment-panel rounded-2xl p-8 text-jungle-deep text-center space-y-4 shadow-xl">
                  <span className="text-5xl block">⏳</span>
                  <h3 className="font-adventure text-2xl font-bold text-gold-dark">Active Multiplayer Lobby</h3>
                  <p className="text-xs font-semibold text-jungle-light">You have a pending or active multiplayer lobby code: <span className="font-mono text-lg font-bold text-jungle-deep">{roomCode}</span></p>
                  <button 
                    onClick={handleSelectNameAndJoin}
                    className="px-8 py-3 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg border-2 border-gold-dark shadow-md text-xs uppercase"
                  >
                    Reconnect & Enter Lobby
                  </button>
                </div>
              )}

              {/* Option B: Local/Offline Saved Adventure */}
              <div className="parchment-panel rounded-2xl p-8 text-jungle-deep text-center space-y-4 shadow-xl">
                <span className="text-5xl block">🎲</span>
                <h3 className="font-adventure text-2xl font-bold text-gold-dark font-adventure">Offline Saved Adventure</h3>
                {localStorage.getItem('bytequest_local_adventure') ? (
                  <>
                    <p className="text-xs font-semibold text-jungle-light leading-relaxed">
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
            <div className="space-y-6">
              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
                <h3 className="font-adventure text-2xl font-bold text-gold mb-2">Explorer Launchpad</h3>
                <p className="text-gold-light text-xs">Launch a solo training game or create/join custom multiplayer lobbies</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="parchment-panel rounded-2xl p-6 flex flex-col justify-between text-jungle-deep h-80">
                  <div>
                    <span className="text-4xl block mb-2">🤖</span>
                    <h4 className="font-adventure text-lg font-bold text-gold-dark mb-2">Solo Sandbox</h4>
                    <p className="text-[10px] font-semibold text-jungle-light leading-relaxed">
                      Fight compilation bots in a completely local, offline practice match. Zero socket dependency.
                    </p>
                  </div>
                  <button 
                    onClick={onStartSoloPractice}
                    className="w-full py-2 bg-jungle-medium text-offwhite font-bold text-xs rounded-lg uppercase mt-4"
                  >
                    Start Offline
                  </button>
                </div>

                <div className="parchment-panel rounded-2xl p-6 flex flex-col justify-between text-jungle-deep h-80">
                  <div>
                    <span className="text-4xl block mb-2">🤝</span>
                    <h4 className="font-adventure text-lg font-bold text-gold-dark mb-2">Join Lobby</h4>
                    <p className="text-[10px] font-semibold text-jungle-light leading-relaxed mb-4">
                      Enter a 5-digit room code to join your classroom matches or a friend's practice room.
                    </p>

                    {!rosterClass ? (
                      <form onSubmit={handleResolveCode} className="space-y-2">
                        <input 
                          type="text" 
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                          placeholder="Room Code"
                          maxLength={6}
                          className="w-full bg-parchment-light border border-gold-dark/45 rounded px-2.5 py-1.5 text-xs text-center font-bold font-mono tracking-wider"
                        />
                        {joinError && <p className="text-[9px] text-red-700 text-center font-bold">{joinError}</p>}
                        <button type="submit" className="w-full py-1.5 bg-gold text-jungle-deep font-bold text-[10px] rounded uppercase">Verify Code</button>
                      </form>
                    ) : (
                      <div className="space-y-2 text-[10px]">
                        <p className="text-center font-bold">Room Class: {rosterClass.className}</p>
                        <button onClick={handleSelectNameAndJoin} className="w-full py-2 bg-indigo-600 text-white font-bold rounded uppercase">Join Room</button>
                      </div>
                    )}
                  </div>
                  {rosterClass && (
                    <button onClick={() => setRosterClass(null)} className="text-center text-[10px] text-jungle-light font-bold">Clear Code</button>
                  )}
                </div>

                <div className="parchment-panel rounded-2xl p-6 flex flex-col justify-between text-jungle-deep h-80">
                  <div>
                    <span className="text-4xl block mb-2">🔑</span>
                    <h4 className="font-adventure text-lg font-bold text-gold-dark mb-2">Create Room</h4>
                    <p className="text-[10px] font-semibold text-jungle-light leading-relaxed">
                      Launch a custom multiplayer practice room! Share your room code so other students can join.
                    </p>
                  </div>
                  <button 
                    onClick={handleCreatePracticeRoom}
                    className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg uppercase mt-4"
                  >
                    Host Practice
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'practice_quiz' && (
            <div className="space-y-6">
              {!quizActive ? (
                <div className="parchment-panel rounded-2xl p-8 text-jungle-deep max-w-lg mx-auto space-y-4">
                  <h3 className="font-adventure text-2xl font-bold text-center text-gold-dark">Practice Quiz Mode</h3>
                  <p className="text-center text-xs font-semibold text-jungle-light">Select a study subject and difficulty. No board coordinates, no bots, just pure CS revision!</p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-jungle-light uppercase mb-0.5">Subject Topic</label>
                      <select 
                        value={quizTopic} 
                        onChange={(e) => setQuizTopic(e.target.value)}
                        className="w-full bg-parchment-light border border-gold-dark/45 rounded-lg px-3 py-2 text-xs font-bold"
                      >
                        <option value="Python Programming">Python programming</option>
                        <option value="Relational Databases">Relational Databases & SQL</option>
                        <option value="Boolean Logic">Boolean Logic & Gates</option>
                        <option value="Computer Networks">Computer Networking Basics</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-jungle-light uppercase mb-0.5">Select Difficulty</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['easy', 'medium', 'hard'] as const).map(diff => (
                          <button
                            key={diff}
                            onClick={() => setQuizDifficulty(diff)}
                            type="button"
                            className={`py-2 border font-bold text-xs uppercase rounded-lg ${
                              quizDifficulty === diff ? 'bg-gold border-gold text-jungle-deep' : 'bg-parchment-light border-gold-dark/30 text-jungle-light'
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
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md uppercase text-xs tracking-wider"
                  >
                    Start Training Quiz
                  </button>
                </div>
              ) : (
                <div className="parchment-panel rounded-2xl p-8 text-jungle-deep max-w-xl mx-auto space-y-6 relative">
                  <div className="flex justify-between border-b border-gold-dark/20 pb-2 text-xs">
                    <span>Topic: {quizTopic} ({quizDifficulty})</span>
                    <span>Question {quizQIdx + 1} of 5</span>
                  </div>

                  <p className="text-lg font-bold leading-relaxed">{quizQs[quizQIdx]?.question}</p>

                  <div className="space-y-3">
                    {quizQs[quizQIdx]?.options.map((opt, oIdx) => {
                      let style = 'bg-parchment-light border-gold-dark/35';
                      if (quizChecked) {
                        if (oIdx === quizQs[quizQIdx].correctIndex) style = 'bg-emerald-100 border-emerald-500 text-emerald-950';
                        else if (quizSelectedOpt === oIdx) style = 'bg-rose-100 border-rose-500 text-rose-950';
                      } else if (quizSelectedOpt === oIdx) {
                        style = 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500';
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleQuizAnswerSelect(oIdx)}
                          className={`w-full text-left p-3.5 border rounded-xl text-xs font-semibold ${style}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {quizChecked && (
                    <div className="bg-jungle-deep text-offwhite p-3.5 rounded-lg text-xs">
                      {quizQs[quizQIdx]?.explanation}
                    </div>
                  )}

                  <div className="flex gap-3 pt-3">
                    {!quizChecked ? (
                      <button 
                        onClick={handleQuizCheck}
                        disabled={quizSelectedOpt === null}
                        className="flex-1 py-3 bg-gold text-jungle-deep font-bold rounded-lg uppercase text-xs"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button 
                        onClick={handleQuizNext}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg uppercase text-xs"
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
              {!dailyActive ? (
                <div className="parchment-panel rounded-2xl p-8 text-jungle-deep max-w-lg mx-auto space-y-4 text-center">
                  <span className="text-6xl block">⚡</span>
                  <h3 className="font-adventure text-2xl font-bold text-gold-dark">CS Daily Challenge</h3>
                  <p className="text-xs font-semibold text-jungle-light">Complete one mixed curriculum quiz of 5 questions per day to unlock +20 XP and +10 Coins!</p>
                  
                  {dailyPlayedToday ? (
                    <div className="bg-amber-50 text-amber-800 text-xs p-3.5 rounded-xl border border-amber-300 font-bold">
                      ✔ You have completed today's daily challenge. Check back tomorrow!
                    </div>
                  ) : (
                    <button 
                      onClick={handleStartDailyChallenge}
                      className="px-8 py-3 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg border-2 border-gold-dark text-xs uppercase"
                    >
                      Start Challenge
                    </button>
                  )}
                </div>
              ) : (
                <div className="parchment-panel rounded-2xl p-8 text-jungle-deep max-w-xl mx-auto space-y-6 relative">
                  <div className="flex justify-between border-b border-gold-dark/20 pb-2 text-xs">
                    <span>⚡ Daily Challenge Quiz</span>
                    <span>Question {dailyQIdx + 1} of 5</span>
                  </div>

                  <p className="text-lg font-bold leading-relaxed">{dailyQs[dailyQIdx]?.question}</p>

                  <div className="space-y-3">
                    {dailyQs[dailyQIdx]?.options.map((opt, oIdx) => {
                      let style = 'bg-parchment-light border-gold-dark/35';
                      if (dailyChecked) {
                        if (oIdx === dailyQs[dailyQIdx].correctIndex) style = 'bg-emerald-100 border-emerald-500 text-emerald-950';
                        else if (dailySelectedOpt === oIdx) style = 'bg-rose-100 border-rose-500 text-rose-950';
                      } else if (dailySelectedOpt === oIdx) {
                        style = 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500';
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleDailyAnswerSelect(oIdx)}
                          className={`w-full text-left p-3.5 border rounded-xl text-xs font-semibold ${style}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {dailyChecked && (
                    <div className="bg-jungle-deep text-offwhite p-3.5 rounded-lg text-xs">
                      {dailyQs[dailyQIdx]?.explanation}
                    </div>
                  )}

                  <div className="flex gap-3 pt-3">
                    {!dailyChecked ? (
                      <button 
                        onClick={handleDailyCheck}
                        disabled={dailySelectedOpt === null}
                        className="flex-1 py-3 bg-gold text-jungle-deep font-bold rounded-lg uppercase text-xs"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button 
                        onClick={handleDailyNext}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg uppercase text-xs"
                      >
                        {dailyQIdx === 4 ? 'Finish challenge' : 'Next Question'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl space-y-4">
              <h3 className="font-adventure text-xl font-bold text-gold border-b border-jungle-light pb-2">Class Leaderboard</h3>
              <p className="text-gold-light text-xs">Standings of other students in: <span className="font-bold text-white">{activeStudent.className}</span></p>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                {[
                  { name: activeStudent.name, xp: activeStudent.xp, coins: activeStudent.coins, isMe: true },
                  { name: 'Aarav Gupta', xp: 480, coins: 45 },
                  { name: 'Kabir Patel', xp: 320, coins: 30 },
                  { name: 'Diya Sharma', xp: 250, coins: 15 }
                ].sort((a,b)=>b.xp - a.xp).map((student, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl flex justify-between items-center border ${
                      student.isMe ? 'bg-gold border-gold text-jungle-deep' : 'bg-jungle-deep/50 border-jungle-light/20 text-offwhite'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-mono">#{idx+1}</span>
                      <span className="font-bold">{student.name} {student.isMe ? '(You)' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span>⭐ {student.xp} XP</span>
                      <span>🪙 {student.coins} Coins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'join_classroom' && (
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl space-y-6">
              <h3 className="font-adventure text-xl font-bold text-gold border-b border-jungle-light pb-2">Join Classroom</h3>
              <p className="text-gold-light text-xs">Enter a unique Join Code provided by your teacher to connect with your class.</p>

              <form onSubmit={handleJoinCodeSubmit} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-gold-light mb-1.5 uppercase">Classroom Join Code</label>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. BQ4X92"
                    className="w-full bg-jungle-deep border border-jungle-light/40 rounded-xl p-3 text-offwhite text-sm font-mono tracking-widest font-bold focus:border-gold outline-none"
                    maxLength={10}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-xl uppercase transition-all shadow-md"
                >
                  Request to Join
                </button>
              </form>

              {joinClassroomStatus && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-xs font-semibold">
                  {joinClassroomStatus}
                </div>
              )}
              {joinClassroomError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-xs font-semibold">
                  {joinClassroomError}
                </div>
              )}

              <div className="pt-6 border-t border-jungle-light/25 space-y-4">
                <h4 className="font-adventure text-md font-bold text-gold">Current Classroom Connection Status</h4>
                {activeStudent.classId ? (
                  <div className="p-4 bg-jungle-deep/50 border border-jungle-light/35 rounded-xl text-xs text-white space-y-2">
                    <div>
                      <span className="font-bold text-sm block text-gold">Successfully Joined Class</span>
                      <span className="text-[10px] text-offwhite/60 block">Class ID: {activeStudent.classId}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-offwhite text-[11px] pt-1">
                      <div><strong className="text-gold-light">Name:</strong> {activeStudent.className}</div>
                      <div><strong className="text-gold-light">Section:</strong> {activeStudent.classSection || 'A'}</div>
                      <div><strong className="text-gold-light">Grade:</strong> Class {activeStudent.classGrade || activeStudent.grade || 11}</div>
                      <div><strong className="text-gold-light">Subject:</strong> {activeStudent.classSubject || 'Computer Science'}</div>
                      <div><strong className="text-gold-light">Teacher:</strong> {activeStudent.teacherName || 'Assigned Teacher'}</div>
                    </div>
                  </div>
                ) : activeStudent.pendingClass ? (
                  <div className="p-4 bg-jungle-deep/50 border border-yellow-500/40 rounded-xl text-xs text-white space-y-2">
                    <span className="font-bold text-sm block text-yellow-400 animate-pulse">Pending Teacher Approval</span>
                    <p className="text-[11px] text-offwhite/85">Waiting for teacher approval to join class:</p>
                    <div className="grid grid-cols-2 gap-2 text-offwhite text-[11px] pt-1">
                      <div><strong className="text-gold-light">Name:</strong> {activeStudent.pendingClass.className}</div>
                      <div><strong className="text-gold-light">Section:</strong> {activeStudent.pendingClass.classSection || 'A'}</div>
                      <div><strong className="text-gold-light">Grade:</strong> Class {activeStudent.pendingClass.classGrade || 11}</div>
                      <div><strong className="text-gold-light">Subject:</strong> {activeStudent.pendingClass.classSubject || 'Computer Science'}</div>
                      <div><strong className="text-gold-light">Teacher:</strong> {activeStudent.pendingClass.teacherName}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-jungle-deep/50 border border-jungle-light/20 rounded-xl text-xs text-offwhite/50 italic">
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
                  <h3 className="font-adventure text-xl font-bold text-gold">Explorer Profile</h3>
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
            </div>
          )}


          {activeTab === 'settings' && (
            <div className="parchment-panel rounded-2xl p-8 text-jungle-deep max-w-md mx-auto space-y-4">
              <h3 className="font-adventure text-2xl font-bold text-gold-dark border-b border-gold-dark/25 pb-2">Audio & Themes</h3>
              
              <div className="flex justify-between items-center py-2 border-b border-gold-dark/10">
                <span className="text-xs font-bold text-jungle-light">Sound Effects</span>
                <button 
                  onClick={() => setAudioOn(!audioOn)}
                  className="p-2 rounded-lg bg-parchment-light border border-gold-dark/30 hover:bg-gold/15"
                >
                  {audioOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-bold text-jungle-light">Interface Theme</span>
                <span className="text-xs font-extrabold text-jungle-deep font-adventure">Jungle Wood (Default)</span>
              </div>
            </div>
          )}
        </section>
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
      {isConnected && gameState === 'playing' && (
        <div className="fixed top-2 right-2 z-[9999] flex items-center gap-1.5 bg-emerald-900/80 border border-emerald-600/50 text-emerald-300 text-[10px] px-3 py-1.5 rounded-full font-bold">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          Live
        </div>
      )}

      {/* Spaced Repetition Retry Toast */}
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


      {gameState === 'lobby' && syncState && (
        <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full">
          <div className="parchment-panel rounded-2xl p-8 text-jungle-deep shadow-2xl">
            
            {/* Room Success Banner for Host */}
            {(syncState.roomCode.startsWith('BQ') || !syncState.classId) && (
              <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-xl mb-6 text-emerald-200 text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-4 select-text">
                <div>
                  <span className="font-adventure text-sm text-gold block mb-0.5">🎉 Room Created Successfully!</span>
                  Share this code with your friends so they can join your adventure lobby.
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(syncState.roomCode);
                      alert("Room code copied to clipboard!");
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold uppercase text-[9px]"
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
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold uppercase text-[9px]"
                  >
                    Share
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center border-b border-gold-dark/25 pb-3 mb-6">
              <div>
                <span className="text-[10px] block font-bold text-jungle-light uppercase font-sans">Multiplayer Lobby</span>
                <h3 className="font-adventure text-3xl font-bold">Room Code: {syncState.roomCode}</h3>
              </div>
              <span className="px-3 py-1 bg-amber-100 border border-amber-500 rounded-full font-bold text-xs text-amber-800 animate-pulse font-sans">Waiting for Players</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="font-adventure text-lg font-bold text-gold-dark mb-3">Enrolled Explorers</h4>
                <div className="space-y-3 text-xs">
                  {syncState.teams.map((t: any) => (
                    <div key={t.id} className="p-3 bg-jungle-deep/5 border border-gold-dark/20 rounded-xl flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full ${t.color}`}></span>
                        <span>{t.name}</span>
                      </div>
                      <span className="text-[9px] text-jungle-light font-bold">
                        {t.members.length} {t.members.length === 1 ? 'player' : 'players'} connected
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-parchment-light border border-gold-dark/20 rounded-xl p-5 text-xs text-jungle-light leading-relaxed">
                <h4 className="font-adventure text-gold-dark text-sm font-bold mb-2 uppercase">Ludo Map Game Rules</h4>
                <ul className="list-disc pl-4 space-y-1 font-semibold font-sans">
                  <li>Multiple players can share the same tile safely.</li>
                  <li>Incorrect answers queue the question for retry and prevent forward movement.</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              {(syncState.roomCode.startsWith('BQ') || !syncState.classId) && (
                <button 
                  onClick={handleStartPracticeGame}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md transition-colors text-xs uppercase"
                >
                  Start Room
                </button>
              )}
              <button 
                onClick={() => {
                  if (socket) socket.emit('room:leave', { roomCode: syncState.roomCode });
                  setGameState('dashboard');
                }}
                className="px-6 py-3.5 bg-parchment-dark text-jungle-deep font-bold border border-gold-dark/30 rounded-lg text-xs uppercase"
              >
                Leave Lobby
              </button>
            </div>
          </div>
        </main>
      )}

      {gameState === 'playing' && syncState && (
        <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col justify-between relative">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full items-start">
            
            <div className="lg:col-span-3 bg-jungle-medium border border-jungle-light p-4 rounded-3xl relative shadow-2xl overflow-hidden aspect-[4/3] flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#1a3d30,transparent_70%)]"></div>
              
              <div className="relative w-[90%] h-[90%] border border-gold/15 rounded-2xl bg-jungle-deep/45">
                
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path 
                    d={`M ${TILE_COORDS.map(coord => `${coord.x}%,${coord.y}%`).join(' L ')}`}
                    fill="none"
                    className="map-connector"
                  />
                </svg>

                {BOARD_TILES.map((tile, tIdx) => {
                  const coord = TILE_COORDS[tIdx];
                  const isSafe = SAFE_TILES.includes(tIdx);
                  
                  let tileSymbol = '📜';
                  let tileColor = 'bg-[#E5D6B3] border-gold-dark text-jungle-deep';
                  
                  if (tile.type === 'start') {
                    tileSymbol = '⛺';
                    tileColor = 'bg-teal-700 border-teal-500 text-white';
                  } else if (tile.type === 'finish') {
                    tileSymbol = '👑';
                    tileColor = 'bg-amber-600 border-amber-400 text-white animate-pulse';
                  } else if (tile.type === 'trap') {
                    tileSymbol = '🕸️';
                    tileColor = 'bg-rose-900 border-rose-600 text-rose-100';
                  } else if (tile.type === 'treasure') {
                    tileSymbol = '🎁';
                    tileColor = 'bg-amber-700 border-gold text-gold-glow';
                  } else if (tile.type === 'boss') {
                    tileSymbol = '🐉';
                    tileColor = 'bg-indigo-950 border-indigo-500 text-indigo-200';
                  }

                  return (
                    <div 
                      key={tIdx}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 sm:w-14 h-10 sm:h-14 rounded-full border-2 flex items-center justify-center text-sm sm:text-xl font-bold transition-all shadow-md group ${tileColor} ${
                        isSafe ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#F3EAD3]' : ''
                      }`}
                      style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                    >
                      <span>{tileSymbol}</span>
                      {isSafe && (
                        <div className="absolute -top-1 -left-1 bg-emerald-600 text-white p-0.5 rounded-full border border-white">
                          <Shield className="w-2 h-2" />
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 text-[8px] w-4 h-4 bg-jungle-deep text-gold rounded-full flex items-center justify-center border border-gold/40">
                        {tIdx}
                      </span>
                    </div>
                  );
                })}

                {syncState.teams.map((t: any, idx: number) => {
                  const coord = TILE_COORDS[t.position];
                  const teamsOnSameTile = syncState.teams.filter((te: any) => te.position === t.position);
                  const tIndexOnTile = teamsOnSameTile.findIndex((te: any) => te.id === t.id);
                  const offsetX = (tIndexOnTile - (teamsOnSameTile.length - 1) / 2) * 16;
                  const offsetY = tIndexOnTile * 6;

                  return (
                    <div
                      key={t.id}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 sm:w-10 h-8 sm:h-10 rounded-full border-2 flex items-center justify-center text-xs font-extrabold shadow-lg transition-all duration-500 z-20 ${t.color} ${
                        syncState.activeTeamIdx === idx ? 'ring-4 ring-gold animate-bounce-slow' : ''
                      }`}
                      style={{ 
                        left: `calc(${coord.x}% + ${offsetX}px)`, 
                        top: `calc(${coord.y}% - 14px + ${offsetY}px)`
                      }}
                      title={t.name}
                    >
                      <span className="relative">
                        🏁
                        {syncState.activeTeamIdx === idx && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl">
                <span className="text-[10px] block font-bold text-gold-light uppercase tracking-wider mb-2">Turn Information</span>
                <div className="mb-4">
                  <span className="font-adventure text-lg font-bold text-white block">
                    {getActivePlayerName()}
                  </span>
                  <span className="text-[10px] bg-gold/15 text-gold px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">
                    Active Turn
                  </span>
                </div>

                <button
                  onClick={handleRollClick}
                  disabled={!checkIsMyTurn() || diceRolling || activeQuestion !== null}
                  className={`relative w-20 h-20 bg-gold border-2 border-gold-dark hover:scale-105 active:scale-95 transition-all text-jungle-deep rounded-2xl flex flex-col items-center justify-center shadow-lg font-bold disabled:opacity-50 disabled:pointer-events-none ${
                    diceRolling ? 'animate-dice-roll' : ''
                  }`}
                >
                  <Dices className="w-10 h-10 mb-1" />
                  <span className="text-[10px] font-sans">
                    {diceRolling ? 'Spinning...' : 'ROLL'}
                  </span>
                </button>

                {localRollResult !== null && (
                  <div className="mt-3 font-adventure text-gold text-lg font-bold">
                    Rolled: {localRollResult} 🎲
                  </div>
                )}
              </div>


              {/* Roster leaderboard / Opponent Solving Handoff */}
              <div className="flex flex-col gap-6">
                {activeQuestion && !checkIsMyTurn() ? (
                  <div className="bg-jungle-medium border border-indigo-500/50 p-6 rounded-2xl shadow-2xl space-y-4 select-text">
                    <div className="flex justify-between items-center border-b border-jungle-light pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block font-sans">Bot Thinking...</span>
                        <span className="font-adventure text-lg font-bold text-white">🤖 {getActivePlayerName()}</span>
                      </div>
                      {!quizResult && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border bg-jungle-deep border-jungle-light text-gold`}>
                          ⏰ {timerRemaining}s
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <span className="text-[9px] font-bold text-gold-light uppercase tracking-wider block mb-1">Question</span>
                      <p className="text-white text-xs font-semibold leading-relaxed font-sans">{activeQuestion.question}</p>
                    </div>

                    <div className="space-y-1.5">
                      {activeQuestion.options?.map((opt: string, oi: number) => {
                        let chipStyle = 'bg-jungle-deep/60 border-jungle-light/30 text-offwhite/70';
                        if (quizResult) {
                          if (oi === activeQuestion.correctIndex) chipStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
                          else if (oi === quizResult.answerIndex) chipStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
                        }
                        return (
                          <div key={oi} className={`w-full text-left px-3 py-2 rounded-lg border text-[10px] font-semibold ${chipStyle}`}>
                            {String.fromCharCode(65 + oi)}. {opt}
                          </div>
                        );
                      })}
                    </div>

                    {quizResult && (
                      <div className={`p-2 rounded-lg text-[10px] font-bold text-center border ${
                        quizResult.isCorrect ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-rose-950/80 border-rose-500 text-rose-300'
                      }`}>
                        {quizResult.isCorrect ? `✓ Correct` : `✗ Wrong`}
                      </div>
                    )}

                    {quizResult && activeQuestion.explanation && (
                      <div className="bg-jungle-deep/80 text-offwhite p-3 rounded-lg text-[10px] border border-jungle-light/20">
                        <p className="font-bold text-gold mb-1 font-sans">Explanation:</p>
                        {activeQuestion.explanation}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
                    <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2 mb-4">Leaderboard</h3>
                    <div className="space-y-3 text-xs">
                      {syncState.teams.slice().sort((a:any, b:any)=>b.position - a.position || b.xp - a.xp).map((p: any, idx: number) => (
                        <div key={p.id} className="p-3 bg-jungle-deep/50 border border-jungle-light/40 rounded-xl">
                          <div className="flex justify-between font-bold mb-1.5">
                            <span>#{idx+1} {p.name}</span>
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

          </div>

        </main>
      )}

      {gameState === 'playing' && activeQuestion && syncState && checkIsMyTurn() && (
        <div className="fixed inset-0 bg-black/15 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="parchment-panel rounded-2xl max-w-2xl w-full p-6 text-jungle-deep shadow-2xl relative my-8">
            
            <div className="flex justify-between items-start gap-4 border-b border-gold-dark/20 pb-3 mb-4 font-sans">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    activeQuestion.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' :
                    activeQuestion.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' :
                    'bg-indigo-100 text-indigo-800'
                  }`}>
                    {activeQuestion.difficulty} Question
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-jungle-light mt-1">Topic: {activeQuestion.topic}</h4>
              </div>

              {!quizResult && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm border-2 ${
                  timerRemaining <= 5 
                    ? 'bg-rose-100 text-rose-700 border-rose-400 animate-pulse' 
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span>{timerRemaining}s</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <p className="text-lg sm:text-xl font-medium text-jungle-deep leading-relaxed">
                {activeQuestion.question}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {activeQuestion.options.map((option: string, optionIdx: number) => {
                const isSelected = selectedOption === optionIdx;
                const isCorrect = optionIdx === activeQuestion.correctIndex;
                
                let buttonStyle = 'bg-parchment-light border-gold-dark/35 text-jungle-deep hover:bg-gold/10';
                
                if (quizResult) {
                  if (isCorrect) {
                    buttonStyle = 'bg-emerald-100 border-emerald-500 text-emerald-950';
                  } else if (isSelected) {
                    buttonStyle = 'bg-rose-100 border-rose-500 text-rose-950';
                  }
                } else if (isSelected) {
                  buttonStyle = 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500';
                }

                return (
                  <button
                    key={optionIdx}
                    onClick={() => handleSubmitAnswer(optionIdx)}
                    disabled={quizResult !== null || !checkIsMyTurn()}
                    className={`w-full text-left p-4 rounded-xl border font-semibold text-xs transition-all flex items-center justify-between ${buttonStyle}`}
                  >
                    <span>{option}</span>
                    {quizResult && isCorrect && <span className="text-emerald-700 font-bold">✔ Correct</span>}
                    {quizResult && isSelected && !isCorrect && <span className="text-rose-700 font-bold">✘ Incorrect</span>}
                  </button>
                );
              })}
            </div>

            {quizResult && (
              <div className="bg-jungle-deep text-offwhite p-4 rounded-xl border border-gold/40 animate-pulse-slow">
                <p className="font-adventure text-gold font-bold mb-1">Explanation:</p>
                <p className="text-sm text-offwhite/85 leading-relaxed">
                  {activeQuestion.explanation}
                </p>
              </div>
            )}

            {!checkIsMyTurn() && !quizResult && (
              <div className="absolute inset-0 bg-black/10 rounded-2xl flex items-center justify-center backdrop-blur-[1.5px]">
                <div className="bg-jungle-deep text-gold font-bold px-5 py-4 rounded-lg border border-gold shadow-xl flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce"></span>
                  <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                  <span>{getActivePlayerName()} is solving question...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'victory' && syncState && (
        <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full">
          <div className="parchment-panel rounded-2xl p-8 text-jungle-deep shadow-2xl text-center space-y-6">
            <span className="text-8xl block">🏆</span>
            <h2 className="font-adventure text-4xl font-extrabold text-gold-dark mb-4">Adventure Completed!</h2>
            <p className="text-sm font-semibold text-jungle-light">All explorers finished the map. Standings compiled successfully.</p>

            <div className="bg-jungle-deep text-offwhite border border-jungle-light p-6 rounded-2xl max-w-lg mx-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-jungle-light/30 text-gold font-bold uppercase">
                    <th className="py-2">Explorer</th>
                    <th className="py-2 text-center">XP</th>
                    <th className="py-2 text-center">Gold</th>
                  </tr>
                </thead>
                <tbody>
                  {syncState.teams.map((t: any, idx: number) => (
                    <tr key={t.id} className="border-b border-jungle-light/10">
                      <td className="py-2.5 font-bold">#{idx+1} {t.name}</td>
                      <td className="py-2.5 text-center text-gold font-bold">{t.xp}</td>
                      <td className="py-2.5 text-center text-gold font-bold">{t.coins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button 
              onClick={() => setGameState('dashboard')}
              className="px-8 py-3.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg border border-gold-dark shadow-md"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      )}


    </div>
  );
}
