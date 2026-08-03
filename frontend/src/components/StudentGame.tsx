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
  RotateCcw
} from 'lucide-react';
import { Tile, BOARD_TILES, TILE_COORDS, SAFE_TILES } from '../config';

interface StudentGameProps {
  onBack: () => void;
  socket: any;
}

export default function StudentGame({ onBack, socket }: StudentGameProps) {
  // Game state controls
  const [gameState, setGameState] = useState<'join' | 'lobby' | 'playing' | 'victory'>('join');
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  
  // resolved roster data
  const [rosterClass, setRosterClass] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [myTeam, setMyTeam] = useState<any>(null);

  // Active Live Session State synced via Socket
  const [syncState, setSyncState] = useState<any>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [scorePopup, setScorePopup] = useState<string | null>(null);

  // Synced Quiz State
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(20);
  const [quizResult, setQuizResult] = useState<any>(null);

  // local audio configuration
  const [audioOn, setAudioOn] = useState<boolean>(true);

  // Dice visual
  const [diceRolling, setDiceRolling] = useState<boolean>(false);
  const [localRollResult, setLocalRollResult] = useState<number | null>(null);

  const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api/v1/teacher`;

  // ==========================================
  // SOCKET MESSAGE LISTENER
  // ==========================================

  useEffect(() => {
    if (socket) {
      socket.on('room:updated', (data: any) => {
        setSyncState(data);
        if (data.status === 'PLAYING') {
          setGameState('playing');
        } else if (data.status === 'LOBBY') {
          setGameState('lobby');
        }

        // Find my team
        if (selectedStudentId) {
          const matchedTeam = data.teams.find((t: any) => 
            t.members.some((m: any) => m.id === selectedStudentId)
          );
          setMyTeam(matchedTeam);
        }
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
        
        // Show correct/incorrect indicator beep
        if (data.isCorrect) {
          playBeep(523, 'sine', 0.2, 0.1); // C5
          setTimeout(() => playBeep(659, 'sine', 0.3, 0.1), 120); // E5
          setScorePopup(`✨ CORRECT! Moved ${data.steps} tiles.`);
        } else {
          playBeep(220, 'sawtooth', 0.4, 0.1); // A3
          setScorePopup(`❌ INCORRECT! Halved move: ${data.steps} tiles.`);
        }

        if (data.captureText) {
          setLogMessages(prev => [data.captureText, ...prev.slice(0, 8)]);
          playBeep(180, 'square', 0.5, 0.12);
        }

        // Close quiz modal automatically
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
        setGameState('victory');
        setSyncState((prev: any) => ({ ...prev, teams: data.teams, status: 'FINISHED' }));
      });
    }

    return () => {
      if (socket) {
        socket.off('room:updated');
        socket.off('game:dice_rolled');
        socket.off('game:question_pushed');
        socket.off('game:answer_result');
        socket.off('game:log');
        socket.off('game:victory');
      }
    };
  }, [socket, selectedStudentId]);

  // Sync timer countdown locally
  useEffect(() => {
    let interval: any = null;
    if (activeQuestion && !quizResult) {
      interval = setInterval(() => {
        setTimerRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeQuestion, quizResult]);

  // ==========================================
  // ACTION EMITTERS
  // ==========================================

  const handleResolveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!roomCode.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/sessions/code/${roomCode}`);
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || 'Room Code not found');
        return;
      }
      setRosterClass(data);
    } catch (err) {
      setJoinError('Server connection failed. Verify the backend is online.');
    }
  };

  const handleSelectNameAndJoin = () => {
    if (!selectedStudentId) return;
    
    // Connect via socket
    if (socket) {
      socket.emit('student:join', { roomCode, studentId: selectedStudentId });
      setGameState('lobby');
    }
  };

  const handleRollClick = () => {
    if (socket && syncState && !diceRolling && !activeQuestion) {
      socket.emit('student:roll', { roomCode, studentId: selectedStudentId });
    }
  };

  const handleSubmitAnswer = (oIdx: number) => {
    if (quizResult || !activeQuestion || !socket) return;
    setSelectedOption(oIdx);
    
    const timeSpent = 20 - timerRemaining;
    socket.emit('student:answer', {
      roomCode,
      studentId: selectedStudentId,
      answerIndex: oIdx,
      timeSpent
    });
  };

  // ==========================================
  // AUDIO SYNTHESIZER
  // ==========================================

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

  // ==========================================
  // ACTIVE TURN ASSESSOR
  // ==========================================

  const checkIsMyTurn = (): boolean => {
    if (!syncState || syncState.status !== 'PLAYING') return false;
    
    const activeTeam = syncState.teams[syncState.activeTeamIdx];
    if (!activeTeam) return false;

    const activeTeammate = activeTeam.members[activeTeam.activeMemberIdx];
    if (!activeTeammate) return false;

    return activeTeammate.id === selectedStudentId;
  };

  const getActivePlayerName = (): string => {
    if (!syncState) return '';
    const activeTeam = syncState.teams[syncState.activeTeamIdx];
    const activeTeammate = activeTeam?.members[activeTeam.activeMemberIdx];
    return activeTeammate ? activeTeammate.name : '';
  };

  const getActiveTeamName = (): string => {
    if (!syncState) return '';
    const activeTeam = syncState.teams[syncState.activeTeamIdx];
    return activeTeam ? activeTeam.name : '';
  };

  // ==========================================
  // VIEW RENDERS
  // ==========================================

  return (
    <div className="min-h-[85vh] flex flex-col relative select-none">
      
      {/* HUD alerts banner */}
      {scorePopup && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-6 py-3 bg-indigo-600 border border-indigo-400 text-white rounded-full shadow-2xl font-bold text-sm">
            {scorePopup}
          </div>
        </div>
      )}

      {/* S1: CODE VERIFICATION & STUDENT SELECT */}
      {gameState === 'join' && (
        <main className="max-w-md mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full">
          <div className="parchment-panel rounded-2xl p-8 text-jungle-deep shadow-2xl relative">
            <h3 className="font-adventure text-3xl font-bold text-center text-gold-dark mb-2">Class Competition</h3>
            <p className="text-center text-xs font-semibold text-jungle-light mb-6">Enter details to connect to your live classroom session</p>

            {!rosterClass ? (
              <form onSubmit={handleResolveCode} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">Enter Room Code</label>
                  <input 
                    type="text" 
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 59204"
                    maxLength={6}
                    className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-4 py-3 text-jungle-deep focus:outline-none focus:border-gold font-bold text-center text-xl tracking-widest uppercase"
                    required
                  />
                </div>

                {joinError && (
                  <div className="bg-red-50 text-red-700 text-xs p-2 rounded-lg font-semibold text-center border border-red-200">
                    {joinError}
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg shadow-md transition-colors"
                >
                  Verify Room Code
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="bg-jungle-deep/10 p-3 rounded-lg border border-gold-dark/30 text-center">
                  <span className="text-[10px] block font-bold text-jungle-light">Room Classroom:</span>
                  <span className="font-adventure text-lg font-bold">{rosterClass.className}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-jungle-light mb-1">Select Your Name</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-bold text-sm"
                  >
                    <option value="">Choose name from roster...</option>
                    {rosterClass.students.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-offwhite/40 mt-1 italic">
                    Note: Names mapped to specific teams assigned by the teacher.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleSelectNameAndJoin}
                    disabled={!selectedStudentId}
                    className="flex-1 py-3.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-md transition-colors"
                  >
                    Join Lobby
                  </button>
                  <button 
                    onClick={() => setRosterClass(null)}
                    className="px-4 py-3.5 bg-parchment-dark text-jungle-deep font-bold rounded-lg border border-gold-dark/30"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={onBack}
              className="w-full mt-4 py-2 text-center text-xs text-jungle-light font-bold hover:text-jungle-deep transition-colors"
            >
              ← Back to Area Selection
            </button>
          </div>
        </main>
      )}

      {/* S2: TEAM LOBBY VIEW */}
      {gameState === 'lobby' && (
        <main className="max-w-md mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full">
          <div className="parchment-panel rounded-2xl p-8 text-jungle-deep shadow-2xl text-center">
            <span className="text-4xl block mb-2 animate-pulse">⛺</span>
            <span className="text-[10px] uppercase font-bold text-jungle-light tracking-widest block">Lobby Connected</span>
            <h3 className="font-adventure text-3xl font-bold my-2 text-gold-dark">Waiting for Teacher</h3>
            <p className="text-xs font-semibold text-jungle-light mb-6">
              Match starts when the teacher begins the session.
            </p>

            {myTeam && (
              <div className="bg-jungle-deep text-offwhite p-5 rounded-xl border border-gold-dark mb-6 text-left">
                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-offwhite/25">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: myTeam.color.includes('bg-red') ? '#EF4444' : myTeam.color.includes('bg-blue') ? '#2563EB' : '#10B981' }} />
                  <span className="font-adventure text-lg font-bold text-gold">{myTeam.name}</span>
                </div>

                <h4 className="text-[10px] uppercase font-bold text-gold-light mb-2">My Teammates Status</h4>
                <div className="space-y-1.5 text-xs font-semibold">
                  {myTeam.members.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-1 bg-jungle-medium/35 rounded px-2">
                      <span>{m.name}</span>
                      <span className={`text-[10px] font-bold ${m.socketId ? 'text-emerald-400' : 'text-offwhite/40'}`}>
                        {m.socketId ? '🟢 Online' : '🕒 Joined'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-jungle-light font-bold flex justify-center gap-1.5 items-center">
              <Activity className="w-4 h-4 text-gold-dark animate-spin-slow" />
              <span>Verifying team alignment...</span>
            </div>
          </div>
        </main>
      )}

      {/* S3: RUNNING GAME BOARD PLAY */}
      {gameState === 'playing' && syncState && (
        <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full">
          {/* Map layout */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            <div className="bg-jungle-medium border border-jungle-light p-4 rounded-2xl overflow-x-auto relative shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gold font-adventure text-lg font-bold tracking-wide">
                  Classroom Competition Board (Every move asks a question!)
                </span>
                <span className="text-xs font-bold bg-jungle-deep px-3 py-1.5 border border-jungle-light rounded-full text-gold-light flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-gold-glow animate-pulse" />
                  <span>Safe Tiles: 0, 4, 10, 15</span>
                </span>
              </div>

              {/* Map background grid canvas */}
              <div className="relative min-w-[700px] h-[550px] bg-parchment rounded-xl shadow-inner border-4 border-gold-dark/40 overflow-hidden select-none" style={{ backgroundImage: "radial-gradient(#dfd4b7 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
                
                {/* SVG path connector lines behind tokens */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path 
                    d={`M ${TILE_COORDS.map(c => `${c.x}%, ${c.y}%`).join(' L ')}`}
                    fill="none"
                    className="map-connector"
                  />
                </svg>

                {/* Draw Board Tiles */}
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
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl font-bold transition-all shadow-md group ${tileColor} ${
                        isSafe ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#F3EAD3]' : ''
                      }`}
                      style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                    >
                      <span>{tileSymbol}</span>
                      
                      {/* Shield symbol overlay on Safe Tiles */}
                      {isSafe && (
                        <div className="absolute -top-1.5 -left-1.5 bg-emerald-600 text-white p-0.5 rounded-full border border-white">
                          <Shield className="w-2.5 h-2.5" />
                        </div>
                      )}

                      {/* Small node index number */}
                      <span className="absolute -bottom-1 -right-1 text-[9px] w-4.5 h-4.5 bg-jungle-deep text-gold rounded-full flex items-center justify-center border border-gold/40">
                        {tIdx}
                      </span>
                    </div>
                  );
                })}

                {/* Shared Team tokens absolute with CSS transition */}
                {syncState.teams.map((t: any, idx: number) => {
                  const coord = TILE_COORDS[t.position];
                  const teamsOnSameTile = syncState.teams.filter((te: any) => te.position === t.position);
                  const tIndexOnTile = teamsOnSameTile.findIndex((te: any) => te.id === t.id);
                  const offsetX = (tIndexOnTile - (teamsOnSameTile.length - 1) / 2) * 16;
                  const offsetY = tIndexOnTile * 6;

                  return (
                    <div
                      key={t.id}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-extrabold shadow-lg transition-all duration-300 z-20 ${t.color} ${
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
                          <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold"></span>
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Turn HUD Panel */}
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl border-2 ${syncState.teams[syncState.activeTeamIdx]?.color}`}>
                  🏁
                </div>
                <div>
                  <span className="text-xs text-gold-light font-bold uppercase tracking-wider block">Active Turn Team</span>
                  <span className="text-2xl font-adventure font-bold text-gold">
                    {getActiveTeamName()}
                  </span>
                  
                  <div className="flex gap-2 items-center text-xs text-offwhite/80 mt-1">
                    <span>Rolling:</span>
                    <strong className="text-gold-glow">👤 {getActivePlayerName()}</strong>
                    {checkIsMyTurn() && <span className="px-2 py-0.5 rounded-full bg-emerald-900 border border-emerald-500 text-[10px] text-emerald-200 animate-pulse font-bold">YOUR TURN</span>}
                  </div>
                </div>
              </div>

              {/* Rolling / Action Controls */}
              <div className="flex items-center gap-4">
                {syncState.currentRoll !== null && !diceRolling && (
                  <div className="bg-jungle-deep/80 px-4 py-2 border border-gold/30 rounded-xl text-center">
                    <span className="text-[10px] text-gold-light block uppercase tracking-wider">Rolled</span>
                    <span className="font-adventure font-bold text-2xl text-gold">🎲 {syncState.currentRoll}</span>
                  </div>
                )}

                {checkIsMyTurn() ? (
                  <button
                    onClick={handleRollClick}
                    disabled={diceRolling || activeQuestion !== null}
                    className="px-8 py-4 bg-gold hover:bg-gold-light text-jungle-deep rounded-xl font-bold text-lg shadow-lg flex items-center gap-2 transition-all active:scale-95 animate-pulse"
                  >
                    <Dices className="w-6 h-6" />
                    <span>{diceRolling ? 'Rolling...' : 'Roll Dice'}</span>
                  </button>
                ) : (
                  <div className="px-6 py-4 bg-jungle-deep/70 rounded-xl border border-jungle-light/45 text-xs font-semibold text-offwhite/60 italic text-center">
                    Waiting for {getActivePlayerName()} to roll...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Leaderboard & Sync Logs sidebar */}
          <div className="flex flex-col gap-6">
            
            {/* Live Standings */}
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
              <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>Classroom Standings</span>
              </h3>

              <div className="space-y-3.5">
                {syncState.teams
                  .slice()
                  .sort((a: any, b: any) => b.position - a.position || b.xp - a.xp)
                  .map((t: any, idx: number) => {
                    const isMyTeam = t.members.some((m: any) => m.id === selectedStudentId);
                    const isActive = syncState.activeTeamIdx === syncState.teams.findIndex((team: any) => team.id === t.id);

                    return (
                      <div 
                        key={t.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isActive 
                            ? 'bg-jungle-deep border-gold ring-1 ring-gold shadow-lg' 
                            : 'bg-jungle-deep/50 border-jungle-light/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gold-light font-bold">#{idx + 1}</span>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color.includes('bg-red') ? '#EF4444' : t.color.includes('bg-blue') ? '#2563EB' : '#10B981' }} />
                            <span className="font-bold text-sm truncate max-w-[120px]" title={t.name}>
                              {t.name}
                            </span>
                            {isMyTeam && <span className="text-[9px] bg-emerald-900 border border-emerald-500 px-1 rounded text-emerald-200">MINE</span>}
                          </div>

                          {t.streak >= 3 && (
                            <span className="flex items-center text-rose-500 font-extrabold text-xs animate-pulse gap-0.5">
                              <Flame className="w-3.5 h-3.5 fill-rose-500" />
                              <span>{t.streak}</span>
                            </span>
                          )}
                        </div>

                        {/* Team members list */}
                        <div className="text-[10px] text-offwhite/50 mb-2 truncate">
                          Teammates: {t.members.map((m: any) => m.name.split(' ')[0]).join(', ')}
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-center bg-jungle-medium/40 p-2 rounded-lg text-xs font-semibold">
                          <div>
                            <span className="text-[9px] text-offwhite/45 block">XP</span>
                            <span className="text-gold font-bold">{t.xp}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-offwhite/45 block">Coins</span>
                            <span className="text-gold font-bold">{t.coins}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-offwhite/45 block">Tile</span>
                            <span className="text-offwhite font-bold">{t.position}/17</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Sync classroom logs */}
            <div className="bg-jungle-medium border border-jungle-light p-4 rounded-2xl flex-1 flex flex-col min-h-[180px]">
              <h4 className="font-adventure text-gold font-bold mb-2 pb-1 border-b border-jungle-light/40">Expedition Logs</h4>
              <div className="space-y-1.5 text-[10px] font-medium text-offwhite/75 overflow-y-auto max-h-[220px] flex-1">
                {logMessages.map((msg, mIdx) => (
                  <div key={mIdx} className="p-1 bg-jungle-deep/50 rounded border border-jungle-light/20 leading-relaxed">
                    {msg}
                  </div>
                ))}
                {logMessages.length === 0 && (
                  <p className="text-offwhite/40 italic py-10 text-center">No logs generated yet.</p>
                )}
              </div>
            </div>

          </div>
        </main>
      )}

      {/* S4: THE SYNCHRONIZED QUESTION MODAL */}
      {gameState === 'playing' && activeQuestion && syncState && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="parchment-panel rounded-2xl max-w-2xl w-full p-6 text-jungle-deep shadow-2xl relative my-8">
            
            <div className="flex justify-between items-start gap-4 border-b border-gold-dark/20 pb-3 mb-4 font-sans">
              <div>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  activeQuestion.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' :
                  activeQuestion.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' :
                  'bg-indigo-100 text-indigo-800'
                }`}>
                  {activeQuestion.difficulty} Question
                </span>
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
              {activeQuestion.options.map((option: string, oIdx: number) => {
                const isSelected = selectedOption === oIdx;
                const isCorrect = oIdx === activeQuestion.correctIndex;
                
                let optionStyle = 'bg-parchment-light border-gold-dark/40 hover:bg-parchment-dark text-jungle-deep';
                
                if (quizResult) {
                  if (isCorrect) {
                    optionStyle = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold';
                  } else if (isSelected) {
                    optionStyle = 'bg-rose-100 border-rose-500 text-rose-950';
                  } else {
                    optionStyle = 'bg-parchment-light/40 border-gold-dark/10 text-jungle-deep/50 pointer-events-none';
                  }
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSubmitAnswer(oIdx)}
                    disabled={!checkIsMyTurn() || quizResult !== null}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between text-sm sm:text-base font-semibold ${optionStyle} ${
                      checkIsMyTurn() && !quizResult ? 'hover:scale-[1.01] active:scale-[0.99]' : ''
                    }`}
                  >
                    <span>{option}</span>
                    {quizResult && isCorrect && <span className="text-emerald-700 font-bold">✔ Correct</span>}
                    {quizResult && isSelected && !isCorrect && <span className="text-rose-700 font-bold">✘ Incorrect</span>}
                  </button>
                );
              })}
            </div>

            {/* Explanation card */}
            {quizResult && (
              <div className="bg-jungle-deep text-offwhite p-4 rounded-xl border border-gold/40 animate-pulse-slow">
                <p className="font-adventure text-gold font-bold mb-1">Explanation:</p>
                <p className="text-sm text-offwhite/85 leading-relaxed">
                  {activeQuestion.explanation}
                </p>
              </div>
            )}

            {/* Turn action overlay blocking non-active players */}
            {!checkIsMyTurn() && !quizResult && (
              <div className="absolute inset-0 bg-black/10 rounded-2xl flex items-center justify-center backdrop-blur-[1.5px]">
                <div className="bg-jungle-deep text-gold font-bold px-5 py-4 rounded-lg border border-gold shadow-xl flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce"></span>
                  <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-2.5 h-2.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                  <span>{getActivePlayerName()} is solving question code...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* S5: VICTORY DASHBOARD */}
      {gameState === 'victory' && syncState && (
        <main className="max-w-3xl mx-auto px-6 py-12 text-center flex-1 flex flex-col justify-center w-full">
          <span className="text-7xl block mb-2 animate-bounce">🏆</span>
          <h2 className="font-adventure text-4xl sm:text-5xl font-extrabold text-gold tracking-wider mb-2">
            Quest Completed!
          </h2>
          <p className="text-gold-light text-lg mb-8">
            Classroom expedition results have been recorded in the database.
          </p>

          <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl w-full mb-8 overflow-x-auto shadow-lg">
            <h3 className="font-adventure text-xl font-bold text-gold border-b border-jungle-light pb-2 mb-4">
              Final Standings Leaderboard
            </h3>
            
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-jungle-light/60 text-gold-light uppercase tracking-wider">
                  <th className="py-3 px-2">Rank</th>
                  <th className="py-3 px-2">Team</th>
                  <th className="py-3 px-2 text-center">XP Points</th>
                  <th className="py-3 px-2 text-center">Coins Collected</th>
                  <th className="py-3 px-2 text-center">Final Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jungle-light/30 font-semibold">
                {syncState.teams
                  .slice()
                  .sort((a: any, b: any) => b.position - a.position || b.xp - a.xp)
                  .map((t: any, idx: number) => {
                    const isMyTeam = t.members.some((m: any) => m.id === selectedStudentId);
                    return (
                      <tr key={t.id} className={`hover:bg-jungle-deep/30 transition-colors ${isMyTeam ? 'bg-emerald-950/20' : ''}`}>
                        <td className="py-4 px-2 font-bold text-gold">#{idx + 1}</td>
                        <td className="py-4 px-2 font-bold flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.color.includes('bg-red') ? '#EF4444' : t.color.includes('bg-blue') ? '#2563EB' : '#10B981' }} />
                          <span>{t.name}</span>
                          {isMyTeam && <span className="text-[9px] bg-emerald-900 border border-emerald-500 px-1.5 rounded text-emerald-200">MINE</span>}
                        </td>
                        <td className="py-4 px-2 text-center font-bold text-gold">{t.xp}</td>
                        <td className="py-4 px-2 text-center font-bold text-gold">{t.coins}</td>
                        <td className="py-4 px-2 text-center text-offwhite/90">{t.position}/17</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => {
              setGameState('join');
              setRoomCode('');
              setRosterClass(null);
              setSelectedStudentId('');
              setMyTeam(null);
              setSyncState(null);
              setLogMessages([]);
            }}
            className="flex items-center gap-2 px-10 py-4 bg-gold hover:bg-gold-light text-jungle-deep rounded-full font-bold text-lg shadow-xl hover:shadow-gold/30 hover:scale-105 active:scale-95 transition-all border border-gold-dark mx-auto"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Join Another Session</span>
          </button>
        </main>
      )}

      {/* Footer copyright */}
      <footer className="py-8 text-center text-xs text-offwhite/40 font-medium mt-auto">
        ByteQuest Classroom Hub &copy; 2026. Synchronized via Socket.io.
      </footer>
    </div>
  );
}
