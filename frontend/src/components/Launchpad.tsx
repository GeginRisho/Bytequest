import React, { useState } from "react";
import { Compass, Volume2, VolumeX, Settings, X } from "lucide-react";

interface LaunchpadProps {
  activeStudent: any;
  launchpadError?: string | null;
  onClearError?: () => void;
  onPlayOffline: () => void;
  onPlayOnline: () => void;
  onJoinLobby: (code: string) => void;
  onDailyChallenge: () => void;
  onJoinClassroom: (code: string) => void;
  onOpenSettings: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
  audioOn: boolean;
  setAudioOn: (on: boolean) => void;
}

export default function Launchpad({
  activeStudent,
  launchpadError,
  onClearError,
  onPlayOffline,
  onPlayOnline,
  onJoinLobby,
  onDailyChallenge,
  onJoinClassroom,
  onOpenSettings,
  onSignIn,
  onSignUp,
  onSignOut,
  audioOn,
  setAudioOn
}: LaunchpadProps) {
  const [lobbyCode, setLobbyCode] = useState("");
  const [classCode, setClassCode] = useState("");
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  const handleJoinLobbySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lobbyCode.trim()) {
      onJoinLobby(lobbyCode.trim().toUpperCase());
    }
  };

  const handleJoinClassroomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (classCode.trim()) {
      onJoinClassroom(classCode.trim().toUpperCase());
    }
  };

  return (
    <div className="relative w-full min-h-screen game-launchpad-bg flex flex-col items-center justify-between py-10 px-4 select-none overflow-hidden font-sans">
      <div className="game-light-beam animate-pulse-slow pointer-events-none" />
      {Array.from({ length: 15 }).map((_, idx) => {
        const size = Math.random() * 5 + 3;
        const left = Math.random() * 100;
        const delay = Math.random() * 12;
        const duration = Math.random() * 8 + 12;
        return (
          <div key={idx} className="game-particle pointer-events-none"
            style={{ width: `${size}px`, height: `${size}px`, left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
          />
        );
      })}

      <div className="w-full max-w-4xl flex items-center justify-between z-10 gap-4">
        {activeStudent ? (
          <div onClick={() => setShowProfilePanel(true)}
            className="flex items-center gap-3 bg-black/60 border border-[#7A0C0C]/40 hover:border-white/30 px-3 py-2 rounded-2xl cursor-pointer select-none transition-all active:scale-98 shadow-[0_5px_15px_rgba(0,0,0,0.6)] backdrop-blur-sm max-w-[280px]">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B0000] to-[#3B0F0F] border border-white/20 flex items-center justify-center text-xl shadow-inner">
                {localStorage.getItem(`bytequest_student_avatar_${activeStudent.id}`) || "👾"}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 font-adventure text-[7px] font-extrabold px-1 py-0.5 rounded border border-stone-950 shadow">
                L{activeStudent.level}
              </div>
            </div>
            <div className="leading-tight flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-adventure text-[9px] font-extrabold text-white block truncate uppercase tracking-wide">{activeStudent.name}</span>
                <span className="text-amber-400 text-[9px] font-extrabold flex items-center shrink-0">🪙 {activeStudent.coins}</span>
              </div>
              <div className="w-24 sm:w-28 h-1.5 bg-stone-950 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (activeStudent.xp / 1000) * 100)}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-white/40 bg-black/30 px-3 py-2 rounded-2xl border border-white/5 backdrop-blur-sm">
            <Compass className="w-4 h-4 animate-spin-slow text-[#7A0C0C]" />
            <span className="font-adventure text-[9px] tracking-widest uppercase font-bold text-white/50">BYTEQUEST 2.0</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={() => setAudioOn(!audioOn)}
            className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/30 text-white/70 hover:text-white transition-all active:scale-95 shadow-lg backdrop-blur-sm h-[38px] w-[38px] flex items-center justify-center"
            title="Toggle Mute">
            {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
          <button onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/30 text-white/70 hover:text-white transition-all active:scale-95 shadow-lg backdrop-blur-sm h-[38px] w-[38px] flex items-center justify-center"
            title="System Settings">
            <Settings className="w-4 h-4" />
          </button>
          {!activeStudent && (
            <div className="flex gap-1.5 ml-1">
              <button id="launchpad-signin-btn" onClick={onSignIn}
                className="px-3 py-2 bg-gradient-to-b from-[#8B0000] to-[#5A0F0F] border border-white/20 text-white font-adventure text-[9px] uppercase font-extrabold tracking-widest rounded-xl transition-all hover:brightness-115 active:scale-95 shadow-md">
                Sign In
              </button>
              <button id="launchpad-signup-btn" onClick={onSignUp}
                className="px-3 py-2 bg-stone-900 border border-white/10 text-white/80 hover:text-white font-adventure text-[9px] uppercase font-extrabold tracking-widest rounded-xl transition-all hover:brightness-110 active:scale-95 shadow-md">
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full flex flex-col items-center justify-center my-auto z-10 space-y-9">
        <div className="text-center space-y-1">
          <h1 className="text-5xl sm:text-6xl font-black game-menu-title tracking-widest drop-shadow-[0_5px_8px_rgba(0,0,0,0.9)] animate-pulse-slow">
            BYTEQUEST
          </h1>
          <p className="text-amber-200/50 font-adventure text-[9px] tracking-widest uppercase mb-2">Computer Science Arena</p>
          {launchpadError && (
            <div className="mt-4 inline-block bg-[#7A0C0C]/90 border-2 border-[#D32F2F] text-[#FFD700] px-4 py-2 rounded-xl text-xs font-adventure font-extrabold uppercase tracking-wider animate-bounce shadow-lg max-w-[280px] text-center drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
              ⚠️ {launchpadError}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-[20px] w-full max-w-sm px-4">
          <div className="flex flex-col items-center w-full">
            <button id="launchpad-play-online-btn" onClick={onPlayOnline} className="game-menu-btn">
              <span className="text-xl shrink-0">⚔️</span>
              <span>PLAY ONLINE</span>
            </button>
          </div>
          <div className="flex flex-col items-center w-full">
            <button id="launchpad-play-offline-btn" onClick={onPlayOffline} className="game-menu-btn">
              <span className="text-xl shrink-0">🎮</span>
              <span>PLAY OFFLINE</span>
            </button>
          </div>
          <div className="flex flex-col items-center w-full space-y-1.5">
            <button id="launchpad-join-lobby-btn"
              onClick={() => { const el = document.getElementById("lobbyCodeInput"); if (el) (el as HTMLInputElement).focus(); }}
              className="game-menu-btn">
              <span className="text-xl shrink-0">🔑</span>
              <span>JOIN LOBBY</span>
            </button>
            <form onSubmit={handleJoinLobbySubmit} className="w-full flex justify-center">
              <input id="lobbyCodeInput" type="text" value={lobbyCode}
                onChange={(e) => {
                  setLobbyCode(e.target.value.toUpperCase());
                  if (onClearError) onClearError();
                }}
                placeholder="ENTER ROOM CODE" className="game-menu-input uppercase text-center" maxLength={6} />
            </form>
          </div>
          <div className="flex flex-col items-center w-full">
            <button id="launchpad-daily-challenge-btn" onClick={onDailyChallenge} className="game-menu-btn">
              <span className="text-xl shrink-0">⚡</span>
              <span>DAILY CHALLENGE</span>
            </button>
          </div>
          <div className="flex flex-col items-center w-full space-y-1.5">
            <button id="launchpad-classroom-btn"
              onClick={() => { const el = document.getElementById("classCodeInput"); if (el) (el as HTMLInputElement).focus(); }}
              className="game-menu-btn">
              <span className="text-xl shrink-0">🎓</span>
              <span>CLASSROOM</span>
            </button>
            <form onSubmit={handleJoinClassroomSubmit} className="w-full flex justify-center">
              <input id="classCodeInput" type="text" value={classCode}
                onChange={(e) => {
                  setClassCode(e.target.value.toUpperCase());
                  if (onClearError) onClearError();
                }}
                placeholder="ENTER CLASS CODE" className="game-menu-input uppercase text-center" maxLength={10} />
            </form>
          </div>
        </div>
      </div>

      <div className="z-10 text-center select-none opacity-30 mt-6">
        <span className="font-adventure text-[8px] tracking-widest text-white/50 uppercase">Class 10, 11 &amp; 12 CS Game Engine</span>
      </div>

      {showProfilePanel && activeStudent && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#3B0F0F] to-[#1A0505] border-3 border-[#D32F2F] text-white p-6 sm:p-8 rounded-[2.5rem] w-full max-w-sm shadow-[0_0_50px_rgba(122,12,12,0.6)] animate-scale-in flex flex-col items-center font-sans overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowProfilePanel(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-adventure text-lg font-extrabold text-[#D32F2F] uppercase tracking-widest mb-4">Player Profile</h2>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8B0000] to-[#5A0F0F] border-2 border-white/20 flex items-center justify-center text-4xl shadow-inner mb-3 relative shrink-0">
              {localStorage.getItem(`bytequest_student_avatar_${activeStudent.id}`) || "👾"}
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-stone-950 font-adventure text-[9px] font-extrabold px-2 py-0.5 rounded-lg border border-stone-950 shadow">
                LEVEL {activeStudent.level}
              </div>
            </div>
            <div className="text-center mb-5 min-w-0 w-full">
              <span className="font-adventure text-base font-extrabold block text-white leading-tight uppercase tracking-wider truncate px-2">{activeStudent.name}</span>
              {activeStudent.email && <span className="text-[9px] font-semibold text-white/50 block tracking-wide lowercase mt-0.5 truncate px-2">{activeStudent.email}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full mb-5 text-center">
              <div className="bg-[#2A0F0F] border border-white/10 p-3 rounded-2xl flex flex-col justify-between">
                <span className="text-[8px] block text-white/40 uppercase font-bold tracking-wider mb-1">XP Progress</span>
                <span className="text-[11px] font-extrabold text-emerald-400 block">{activeStudent.xp} / 1000</span>
                <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (activeStudent.xp / 1000) * 100)}%` }} />
                </div>
              </div>
              <div className="bg-[#2A0F0F] border border-white/10 p-3 rounded-2xl flex flex-col justify-center items-center">
                <span className="text-[8px] block text-white/40 uppercase font-bold tracking-wider mb-1">Gold Reserves</span>
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">🪙 {activeStudent.coins}</span>
              </div>
            </div>
            <div className="w-full bg-[#2A0F0F] border border-white/10 rounded-2xl p-4 mb-5 text-xs space-y-2 font-sans">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
                <span className="font-adventure text-[9px] font-extrabold text-[#D32F2F] uppercase tracking-wider">Campaign Stats</span>
              </div>
              <div className="flex justify-between font-semibold text-white/80">
                <span className="text-white/40">Games Played</span><span>{activeStudent.gamesPlayed ?? activeStudent.matchesPlayed ?? 0}</span>
              </div>
              <div className="flex justify-between font-semibold text-white/80">
                <span className="text-white/40">Games Won</span><span>{activeStudent.gamesWon ?? 0}</span>
              </div>
              <div className="flex justify-between font-semibold text-white/80">
                <span className="text-white/40">Questions Answered</span><span>{activeStudent.questionsAnswered ?? 0}</span>
              </div>
              <div className="flex justify-between font-semibold text-white/80">
                <span className="text-white/40">Correct Answers</span><span className="text-emerald-400">{activeStudent.correctAnswers ?? 0}</span>
              </div>
              <div className="flex justify-between font-semibold text-white/80 pt-0.5 border-t border-white/5 mt-1">
                <span className="text-white/40">Total XP</span><span className="text-purple-400">⭐ {activeStudent.xp} XP</span>
              </div>
            </div>
            <button onClick={() => { setShowProfilePanel(false); onSignOut(); }}
              className="w-full py-3 mb-3 bg-[#3B0F0F] hover:bg-[#5A1A1A] text-rose-400 hover:text-rose-300 font-adventure font-extrabold rounded-xl border border-rose-900/40 uppercase tracking-wider text-xs transition-all active:scale-95 shadow-md">
              🚪 Sign Out
            </button>
            <button onClick={() => setShowProfilePanel(false)}
              className="w-full py-3 bg-[#D32F2F] hover:bg-[#B91C1C] text-white font-adventure font-extrabold rounded-xl border-b-4 border-[#991B1B] uppercase tracking-wider text-xs transition-all active:scale-95 shadow-md">
              Close Panel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
