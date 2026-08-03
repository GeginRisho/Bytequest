import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  Users, 
  Play, 
  Award, 
  BarChart2, 
  BookOpen, 
  Key, 
  Search, 
  FileText, 
  ChevronRight,
  Shield,
  Clock,
  Compass,
  AlertCircle
} from 'lucide-react';
interface DbQuestion {
  id: string;
  teacherId: string;
  grade: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface DbClass {
  id: string;
  teacherId: string;
  name: string;
  grade: number;
}

interface DbStudent {
  id: string;
  classId: string;
  name: string;
}

interface DbTeam {
  id: string;
  classId: string;
  name: string;
  color: string;
}

interface TeacherDashboardProps {
  onBack: () => void;
  socket: any;
}

export default function TeacherDashboard({ onBack, socket }: TeacherDashboardProps) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('teacher@bytequest.com');
  const [password, setPassword] = useState<string>('password123');
  const [authError, setAuthError] = useState<string>('');
  const [teacherInfo, setTeacherInfo] = useState<any>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'questions' | 'classes' | 'monitor' | 'reports'>('questions');

  // Backend API Base URL
  const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000/api/v1/teacher`;

  // Question bank state
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionSearch, setQuestionSearch] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [isEditingQuestion, setIsEditingQuestion] = useState<any | null>(null); // null = not editing/creating
  const [csvText, setCsvText] = useState<string>('');
  const [showCsvImport, setShowCsvImport] = useState<boolean>(false);
  const [csvStatus, setCsvStatus] = useState<string>('');

  // Class Management State
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassGrade, setNewClassGrade] = useState<number>(11);
  const [rosterClassId, setRosterClassId] = useState<string>('');
  const [rosterNamesText, setRosterNamesText] = useState<string>('');
  const [activeClassDetails, setActiveClassDetails] = useState<any | null>(null);

  // Live session state
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [liveMonitorState, setLiveMonitorState] = useState<any | null>(null);
  const [sessionReport, setSessionReport] = useState<any | null>(null);

  // Past Reports
  const [pastReports, setPastReports] = useState<any[]>([]);

  // Load Initial Data on authentication
  useEffect(() => {
    if (isAuthenticated && teacherInfo) {
      fetchQuestions();
      fetchClasses();
      fetchReports();
    }
  }, [isAuthenticated, teacherInfo]);

  // Handle socket live updates when session is active
  useEffect(() => {
    if (socket) {
      socket.on('room:updated', (data: any) => {
        if (activeSession && data.roomCode === activeSession.roomCode) {
          setLiveMonitorState(data);
          
          // Gather connected members count
          const connected: any[] = [];
          data.teams.forEach((t: any) => {
            t.members.forEach((m: any) => {
              if (m.socketId) connected.push(m);
            });
          });
          setLobbyPlayers(connected);
        }
      });

      socket.on('game:victory', (data: any) => {
        // Fetch session report once finish is crossed
        if (activeSession) {
          setTimeout(() => {
            fetchSessionReport(activeSession.id);
          }, 1500);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('room:updated');
        socket.off('game:victory');
      }
    };
  }, [socket, activeSession]);

  // ==========================================
  // API FETCH CALLS
  // ==========================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Login failed');
        return;
      }
      setTeacherInfo(data.teacher);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError('Unable to connect to the backend server. Please verify the backend is running.');
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${API_BASE}/questions?teacherId=${teacherInfo.id}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE}/classes?teacherId=${teacherInfo.id}`);
      const data = await res.json();
      setClasses(data.classes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports?teacherId=${teacherInfo.id}`);
      const data = await res.json();
      setPastReports(data.reports || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // QUESTION MANAGER OPERATIONS
  // ==========================================

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !isEditingQuestion.id;
    const url = isNew ? `${API_BASE}/questions` : `${API_BASE}/questions/${isEditingQuestion.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...isEditingQuestion,
          teacherId: teacherInfo.id
        })
      });
      if (res.ok) {
        setIsEditingQuestion(null);
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCsvImport = async () => {
    setCsvStatus('Importing...');
    try {
      const res = await fetch(`${API_BASE}/questions/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, teacherId: teacherInfo.id })
      });
      const data = await res.json();
      if (res.ok) {
        setCsvStatus(`Success! Imported ${data.questions?.length || 0} questions.`);
        setCsvText('');
        fetchQuestions();
        setTimeout(() => {
          setShowCsvImport(false);
          setCsvStatus('');
        }, 2000);
      } else {
        setCsvStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setCsvStatus(`Error: Connection failed.`);
    }
  };

  // ==========================================
  // ROSTER & TEAM SCHEDULER OPERATIONS
  // ==========================================

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacherInfo.id,
          name: newClassName,
          grade: newClassGrade
        })
      });
      if (res.ok) {
        setNewClassName('');
        fetchClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosterNamesText.trim()) return;
    const names = rosterNamesText.split('\n').map(n => n.trim()).filter(n => n.length > 0);

    try {
      const res = await fetch(`${API_BASE}/classes/${rosterClassId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names })
      });
      if (res.ok) {
        setRosterNamesText('');
        setRosterClassId('');
        fetchClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetupTeams = async (classId: string) => {
    // Generate 3 simple teams for the class and evenly distribute students
    const cls = classes.find(c => c.id === classId);
    if (!cls || cls.students.length === 0) {
      alert('Roster is empty. Please add students first.');
      return;
    }

    const teamNames = ['Team Crimson', 'Team Cobalt', 'Team Jade'];
    const teamColors = [
      'bg-red-500 text-white border-red-300',
      'bg-blue-600 text-white border-blue-400',
      'bg-emerald-600 text-white border-emerald-300'
    ];

    const teamConfigs = teamNames.map((name, i) => ({
      name,
      color: teamColors[i],
      studentIds: [] as string[]
    }));

    // Distribute
    cls.students.forEach((student: any, index: number) => {
      const teamIdx = index % teamConfigs.length;
      teamConfigs[teamIdx].studentIds.push(student.id);
    });

    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: teamConfigs })
      });
      if (res.ok) {
        alert('Roster grouped into 3 balanced teams!');
        fetchClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // GAME MATCH SESSION CONTROLS
  // ==========================================

  const handleLaunchSession = async (classId: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(data.session);
        setLobbyPlayers([]);
        setLiveMonitorState(null);
        setSessionReport(null);
        setActiveTab('monitor');

        // Connect socket room channel
        if (socket) {
          socket.emit('teacher:join', { roomCode: data.session.roomCode });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerStartMatch = () => {
    if (socket && activeSession) {
      socket.emit('teacher:start_game', { roomCode: activeSession.roomCode });
    }
  };

  const fetchSessionReport = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/report`);
      const data = await res.json();
      if (res.ok) {
        setSessionReport(data);
        fetchReports(); // Refresh past list
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // RENDERING HELPERS
  // ==========================================

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(questionSearch.toLowerCase()) || 
                          q.topic.toLowerCase().includes(questionSearch.toLowerCase());
    const matchesGrade = gradeFilter === 'all' ? true : q.grade === Number(gradeFilter);
    return matchesSearch && matchesGrade;
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 flex flex-col justify-center min-h-[85vh]">
        <div className="parchment-panel rounded-2xl p-8 text-jungle-deep shadow-2xl relative">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Compass className="w-8 h-8 text-gold-dark animate-spin-slow" />
            <h2 className="font-adventure text-3xl font-bold tracking-wide">Teacher Portal</h2>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-jungle-light mb-1">Teacher Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-semibold text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase text-jungle-light mb-1">Access Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-parchment-light border border-gold-dark/40 rounded-lg px-3 py-2 text-jungle-deep focus:outline-none focus:border-gold font-semibold text-sm"
                required
              />
            </div>

            {authError && (
              <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-lg font-semibold flex gap-1.5 items-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="pt-2">
              <button 
                type="submit"
                className="w-full py-3 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg shadow-md transition-colors"
              >
                Log In
              </button>
            </div>
          </form>

          <button 
            onClick={onBack}
            className="w-full mt-3 py-2 text-center text-xs text-jungle-light font-bold hover:text-jungle-deep transition-colors"
          >
            ← Return to Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      
      {/* Dashboard Top Header */}
      <div className="bg-jungle-medium border border-jungle-light rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs text-gold-glow font-bold uppercase tracking-widest">Workspace</span>
          <h2 className="font-adventure text-3xl font-bold text-gold">{teacherInfo.name}</h2>
          <p className="text-xs text-offwhite/75">{teacherInfo.email}</p>
        </div>

        <div className="flex gap-2">
          {['questions', 'classes', 'monitor', 'reports'].map((tab: any) => {
            let label = tab.charAt(0).toUpperCase() + tab.slice(1);
            if (tab === 'monitor') label = 'Live Game Room';
            if (tab === 'reports') label = 'Session Reports';

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border rounded-xl font-bold text-xs transition-all uppercase tracking-wide ${
                  activeTab === tab 
                    ? 'bg-gold border-gold text-jungle-deep' 
                    : 'bg-jungle-deep border-jungle-light text-offwhite hover:border-gold/40'
                }`}
              >
                {label}
              </button>
            );
          })}
          
          <button 
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-rose-500/40 text-rose-300 bg-jungle-deep hover:bg-rose-950/20 text-xs font-bold uppercase"
          >
            Exit Dashboard
          </button>
        </div>
      </div>

      {/* -------------------- TAB CONTENT PANELS -------------------- */}

      {/* T1: QUESTION BANK MANAGER */}
      {activeTab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Question Editor panel */}
          <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl h-fit">
            <h3 className="font-adventure text-xl font-bold text-gold border-b border-jungle-light pb-2 mb-4">
              {isEditingQuestion ? (isEditingQuestion.id ? 'Edit Question' : 'Add Question') : 'Select Action'}
            </h3>

            {isEditingQuestion ? (
              <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Grade</label>
                    <select 
                      value={isEditingQuestion.grade}
                      onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, grade: Number(e.target.value) })}
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold"
                    >
                      <option value={10}>Grade 10</option>
                      <option value={11}>Grade 11</option>
                      <option value={12}>Grade 12</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Difficulty</label>
                    <select 
                      value={isEditingQuestion.difficulty}
                      onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, difficulty: e.target.value })}
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Topic</label>
                  <input 
                    type="text" 
                    value={isEditingQuestion.topic}
                    onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, topic: e.target.value })}
                    className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold"
                    placeholder="e.g. Python Loops"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Question Text</label>
                  <textarea 
                    value={isEditingQuestion.question}
                    onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, question: e.target.value })}
                    className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold h-20"
                    placeholder="Type the question query..."
                    required
                  />
                </div>

                {/* Option 4 inputs */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-bold text-gold-light">Multiple Choices</label>
                  {Array.from({ length: 4 }).map((_, oIdx) => (
                    <div key={oIdx} className="flex gap-2 items-center">
                      <span className="text-[10px] font-bold text-offwhite/50">[{oIdx}]</span>
                      <input 
                        type="text"
                        value={isEditingQuestion.options[oIdx] || ''}
                        onChange={(e) => {
                          const updatedOps = [...isEditingQuestion.options];
                          updatedOps[oIdx] = e.target.value;
                          setIsEditingQuestion({ ...isEditingQuestion, options: updatedOps });
                        }}
                        className="flex-1 bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold"
                        placeholder={`Option ${oIdx}`}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Correct Option Index (0-3)</label>
                  <select 
                    value={isEditingQuestion.correctIndex}
                    onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, correctIndex: Number(e.target.value) })}
                    className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold"
                  >
                    <option value={0}>Option 0</option>
                    <option value={1}>Option 1</option>
                    <option value={2}>Option 2</option>
                    <option value={3}>Option 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Explanation Hint</label>
                  <input 
                    type="text" 
                    value={isEditingQuestion.explanation}
                    onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, explanation: e.target.value })}
                    className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold"
                    placeholder="One-line explanation..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg shadow"
                  >
                    Save Changes
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsEditingQuestion(null)}
                    className="px-4 py-2 bg-jungle-deep border border-jungle-light font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => setIsEditingQuestion({
                    grade: 11,
                    topic: '',
                    difficulty: 'medium',
                    question: '',
                    options: ['', '', '', ''],
                    correctIndex: 0,
                    explanation: ''
                  })}
                  className="w-full py-3 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 uppercase text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Single Question</span>
                </button>

                <button
                  onClick={() => setShowCsvImport(!showCsvImport)}
                  className="w-full py-3 bg-jungle-deep hover:bg-jungle-light border border-gold/45 text-gold-light font-bold rounded-lg flex items-center justify-center gap-1.5 uppercase text-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Bulk Import Questions</span>
                </button>

                {showCsvImport && (
                  <div className="bg-jungle-deep p-4 rounded-xl border border-jungle-light space-y-3 mt-2 text-xs">
                    <label className="block font-bold text-gold-light uppercase tracking-wider text-[10px]">
                      Paste CSV (Semicolon ; Separator)
                    </label>
                    <p className="text-[10px] text-offwhite/50 italic leading-relaxed">
                      Format: grade;topic;difficulty;question;opt0;opt1;opt2;opt3;correctIdx;explanation
                    </p>
                    <textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder="11;Functions;easy;Which def is correct?;def f();f();def;fn;0;def declares functions."
                      className="w-full bg-jungle-medium border border-jungle-light rounded-lg px-2 py-1.5 focus:outline-none focus:border-gold h-28 font-mono text-[10px]"
                    />
                    <button
                      onClick={handleCsvImport}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg shadow-sm"
                    >
                      Process CSV Text
                    </button>
                    {csvStatus && (
                      <p className="text-[10px] text-gold-glow text-center font-semibold mt-1">{csvStatus}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Question table listing */}
          <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl lg:col-span-2">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-2 border-b border-jungle-light/60">
              <h3 className="font-adventure text-xl font-bold text-gold">Question Bank ({filteredQuestions.length})</h3>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="bg-jungle-deep border border-jungle-light text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold"
                >
                  <option value="all">All Grades</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>

                <div className="relative flex-1 sm:flex-none">
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search query..."
                    className="w-full bg-jungle-deep border border-jungle-light text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-gold"
                  />
                  <Search className="w-3.5 h-3.5 text-offwhite/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredQuestions.map((q) => (
                <div key={q.id} className="p-4 bg-jungle-deep/60 rounded-xl border border-jungle-light/45 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-gold/10 text-gold-glow px-2 py-0.5 rounded-full">Grade {q.grade}</span>
                      <span className="text-[10px] font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-wider">{q.difficulty}</span>
                      <span className="text-[10px] font-semibold text-offwhite/60">Topic: {q.topic}</span>
                    </div>
                    <p className="text-sm font-semibold leading-relaxed text-offwhite/90">{q.question}</p>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-offwhite/50 pt-1 font-sans">
                      {q.options.map((opt: string, oIdx: number) => (
                        <div key={oIdx} className={oIdx === q.correctIndex ? 'text-emerald-400 font-bold' : ''}>
                          [{oIdx}] {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button 
                      onClick={() => setIsEditingQuestion(q)}
                      className="p-1.5 bg-jungle-medium text-gold hover:bg-gold/15 border border-gold/30 rounded-lg"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 bg-jungle-medium text-rose-400 hover:bg-rose-950/20 border border-rose-500/30 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredQuestions.length === 0 && (
                <p className="text-center text-xs text-offwhite/40 italic py-10">No matching questions found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* T2: CLASSES & TEAMS SETUP */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Class register panel */}
          <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl h-fit">
            <h3 className="font-adventure text-xl font-bold text-gold border-b border-jungle-light pb-2 mb-4">
              Register New Class
            </h3>
            
            <form onSubmit={handleCreateClass} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Classroom Name</label>
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Grade 11 - Section B"
                  className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Syllabus Grade Level</label>
                <select
                  value={newClassGrade}
                  onChange={(e) => setNewClassGrade(Number(e.target.value))}
                  className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold font-bold"
                >
                  <option value={10}>Grade 10 Basics</option>
                  <option value={11}>Grade 11 Intermediate</option>
                  <option value={12}>Grade 12 Advanced</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg uppercase tracking-wider text-[11px]"
              >
                Create Classroom
              </button>
            </form>

            {/* Add students roster */}
            {classes.length > 0 && (
              <div className="mt-8 border-t border-jungle-light/60 pt-6">
                <h4 className="font-adventure text-lg font-bold text-gold mb-3">Add Student Roster</h4>
                
                <form onSubmit={handleAddStudents} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Target Class</label>
                    <select
                      value={rosterClassId}
                      onChange={(e) => setRosterClassId(e.target.value)}
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold"
                      required
                    >
                      <option value="">Select class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} (Grade {c.grade})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gold-light mb-1">Student Names (One per line)</label>
                    <textarea
                      value={rosterNamesText}
                      onChange={(e) => setRosterNamesText(e.target.value)}
                      placeholder="Student 1&#10;Student 2&#10;Student 3"
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold h-28"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg uppercase tracking-wider text-[11px]"
                  >
                    Submit Roster
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Classes layout grid */}
          <div className="lg:col-span-2 space-y-6">
            {classes.map(cls => (
              <div key={cls.id} className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-jungle-light/60 pb-3 mb-4">
                  <div>
                    <h4 className="font-adventure text-2xl font-bold text-gold">{cls.name}</h4>
                    <span className="text-[10px] font-bold uppercase bg-gold/15 text-gold-glow px-2 py-0.5 rounded-full">
                      Grade {cls.grade} Syllabus Map
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSetupTeams(cls.id)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg shadow-sm"
                    >
                      Auto-Group Teams
                    </button>
                    <button
                      onClick={() => handleLaunchSession(cls.id)}
                      className="px-3.5 py-2 bg-gold hover:bg-gold-light text-jungle-deep text-xs font-bold rounded-lg shadow-sm"
                    >
                      Start Game Room
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Roster list */}
                  <div className="bg-jungle-deep/50 p-4 rounded-xl border border-jungle-light/45 md:col-span-1">
                    <h5 className="font-adventure text-sm font-bold text-gold mb-2 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Roster ({cls.students.length})</span>
                    </h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs pr-1 font-semibold">
                      {cls.students.map((s: any) => (
                        <div key={s.id} className="p-1.5 bg-jungle-medium/60 rounded border border-jungle-light/20 flex justify-between">
                          <span>{s.name}</span>
                          <span className="text-[9px] text-offwhite/40 font-mono">#{s.id.slice(-3)}</span>
                        </div>
                      ))}
                      {cls.students.length === 0 && (
                        <p className="text-offwhite/40 italic text-center py-6">Roster empty.</p>
                      )}
                    </div>
                  </div>

                  {/* Team layouts */}
                  <div className="bg-jungle-deep/50 p-4 rounded-xl border border-jungle-light/45 md:col-span-2">
                    <h5 className="font-adventure text-sm font-bold text-gold mb-2 flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      <span>Assigned Teams ({cls.teams.length})</span>
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {cls.teams.map((team: any) => (
                        <div key={team.id} className="bg-jungle-medium/70 p-3 rounded-lg border border-jungle-light/30">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color.includes('bg-red') ? '#EF4444' : team.color.includes('bg-blue') ? '#2563EB' : '#10B981' }} />
                            <span className="font-bold text-xs truncate" title={team.name}>{team.name}</span>
                          </div>
                          
                          <div className="space-y-1 text-[10px] font-semibold text-offwhite/85">
                            {team.members.map((m: any) => (
                              <div key={m.id} className="truncate">
                                • {m.name}
                              </div>
                            ))}
                            {team.members.length === 0 && (
                              <span className="text-offwhite/45 italic">No players.</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {classes.length === 0 && (
              <p className="text-center text-xs text-offwhite/40 italic py-10">No classes registered yet.</p>
            )}
          </div>
        </div>
      )}

      {/* T3: LIVE SESSIONS MONITOR */}
      {activeTab === 'monitor' && (
        <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
          
          {!activeSession ? (
            <div className="text-center py-16 max-w-sm mx-auto">
              <Compass className="w-16 h-16 text-gold/30 mx-auto mb-3 animate-spin-slow" />
              <h4 className="font-adventure text-2xl font-bold text-gold mb-2">No Active Room</h4>
              <p className="text-xs text-offwhite/70 mb-6 leading-relaxed">
                Go to the **Classes** tab to configure student teams and launch a live game room for your class.
              </p>
            </div>
          ) : (
            <div>
              {/* Lobby Mode */}
              {liveMonitorState?.status === 'LOBBY' && (
                <div className="max-w-2xl mx-auto text-center py-10">
                  <span className="text-xs text-gold-glow uppercase tracking-widest font-bold">Lobby Code</span>
                  <h3 className="font-adventure text-6xl font-extrabold text-gold tracking-wider my-3 animate-pulse">
                    {activeSession.roomCode}
                  </h3>
                  
                  <div className="w-16 h-1 bg-gold mx-auto mb-6 rounded-full"></div>
                  
                  <p className="text-base text-offwhite/85 mb-8 leading-relaxed">
                    Ask students to open the application, select **"Student Competition"**, and enter the Room Code above to join their team.
                  </p>

                  <div className="bg-jungle-deep p-6 rounded-xl border border-jungle-light mb-8">
                    <h4 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light/30 pb-2 mb-4">
                      Connected Students ({lobbyPlayers.length})
                    </h4>
                    
                    <div className="flex flex-wrap gap-2 justify-center">
                      {lobbyPlayers.map((player: any) => (
                        <span 
                          key={player.id}
                          className="px-3.5 py-1.5 rounded-full bg-jungle-medium border border-jungle-light text-xs font-bold"
                        >
                          🟢 {player.name}
                        </span>
                      ))}
                      {lobbyPlayers.length === 0 && (
                        <p className="text-xs text-offwhite/45 italic py-4">Waiting for students to join...</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleTriggerStartMatch}
                    disabled={lobbyPlayers.length === 0}
                    className="px-12 py-4 bg-gold hover:bg-gold-light text-jungle-deep disabled:opacity-50 disabled:pointer-events-none rounded-full font-bold text-lg shadow-xl"
                  >
                    Start Game Match
                  </button>
                </div>
              )}

              {/* Playing Mode */}
              {liveMonitorState?.status === 'PLAYING' && (
                <div>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-jungle-light pb-4 mb-6">
                    <div>
                      <span className="text-xs text-gold-glow uppercase tracking-wider font-bold">Live Standings</span>
                      <h3 className="font-adventure text-3xl font-bold text-gold">Competition Room: {activeSession.roomCode}</h3>
                    </div>
                    
                    {liveMonitorState?.activeQuestion && (
                      <div className="bg-amber-950 border border-gold/40 text-gold-glow rounded-xl px-4 py-2 text-center text-xs animate-pulse">
                        <span className="block font-bold">Active Question Dispatched</span>
                        <span className="text-[10px]">Timer: {liveMonitorState.timerRemaining}s</span>
                      </div>
                    )}
                  </div>

                  {/* Standings tracker cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {liveMonitorState.teams.map((t: any, idx: number) => {
                      const isActive = liveMonitorState.activeTeamIdx === idx;
                      const activeTeammate = t.members[t.activeMemberIdx];

                      return (
                        <div 
                          key={t.id}
                          className={`p-5 rounded-2xl border-2 transition-all ${
                            isActive 
                              ? 'bg-jungle-deep border-gold shadow-lg shadow-gold/20 scale-105' 
                              : 'bg-jungle-deep/50 border-jungle-light/45'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.color.includes('bg-red') ? '#EF4444' : t.color.includes('bg-blue') ? '#2563EB' : '#10B981' }} />
                              <h4 className="font-adventure text-lg font-bold text-gold truncate max-w-[130px]">{t.name}</h4>
                            </div>
                            
                            <span className="text-xs font-bold font-mono bg-jungle-medium px-2 py-0.5 rounded border border-jungle-light text-offwhite">
                              Tile: {t.position}/17
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-center text-xs bg-jungle-medium/40 p-3 rounded-xl mb-4 font-semibold">
                            <div>
                              <span className="text-[10px] text-offwhite/45 block">XP Points</span>
                              <span className="text-base text-gold font-bold">{t.xp}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-offwhite/45 block">Coins Collected</span>
                              <span className="text-base text-gold font-bold">{t.coins}</span>
                            </div>
                          </div>

                          <div className="text-xs font-semibold">
                            <span className="text-[10px] text-gold-light uppercase tracking-wider block mb-0.5">Next Player up</span>
                            <div className="p-2 bg-jungle-deep/80 rounded border border-jungle-light/40 flex justify-between">
                              <span>👤 {activeTeammate ? activeTeammate.name : 'Roster Empty'}</span>
                              <span className="text-[10px] text-emerald-400 font-mono">
                                {activeTeammate && activeTeammate.socketId ? '🟢 Online' : '🔴 Offline'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Horizontal visual progress board */}
                  <div className="bg-jungle-deep p-6 rounded-2xl border border-jungle-light">
                    <h4 className="font-adventure text-lg font-bold text-gold mb-4 border-b border-jungle-light/20 pb-2">
                      Live Trail Position Tracking
                    </h4>

                    <div className="relative h-12 bg-jungle-medium rounded-xl border border-jungle-light flex items-center justify-between px-4">
                      {/* Scale checkpoints */}
                      {Array.from({ length: 18 }).map((_, step) => (
                        <div key={step} className="flex flex-col items-center justify-center relative w-full h-full">
                          {/* Safe tiles symbols */}
                          {[0, 4, 10, 15].includes(step) ? (
                            <span className="text-[9px]" title="Safe checkpoint">🛡️</span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-offwhite/20" />
                          )}
                          <span className="text-[8px] text-offwhite/40 absolute -bottom-4 font-mono">{step}</span>

                          {/* Render matching team tokens */}
                          <div className="absolute top-1 flex gap-0.5">
                            {liveMonitorState.teams
                              .filter((t: any) => t.position === step)
                              .map((t: any) => (
                                <div 
                                  key={t.id} 
                                  className="w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center text-[7px] font-bold"
                                  style={{ backgroundColor: t.color.includes('bg-red') ? '#EF4444' : t.color.includes('bg-blue') ? '#2563EB' : '#10B981' }}
                                  title={t.name}
                                >
                                  {t.name.charAt(5)}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Victory Report screen */}
              {sessionReport && (
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-6">
                    <span className="text-5xl block animate-bounce">🏆</span>
                    <h3 className="font-adventure text-3xl font-bold text-gold">Session Finished</h3>
                    <p className="text-xs text-gold-light mt-1">Room Code: {activeSession.roomCode} · Class: {sessionReport.className}</p>
                  </div>

                  <div className="bg-jungle-deep p-6 rounded-2xl border border-jungle-light mb-6 overflow-x-auto">
                    <h4 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light/30 pb-2 mb-4">
                      Final Team Standings
                    </h4>

                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-jungle-light text-gold-light uppercase tracking-wider">
                          <th className="py-2.5 px-2">Rank</th>
                          <th className="py-2.5 px-2">Team</th>
                          <th className="py-2.5 px-2 text-center">XP</th>
                          <th className="py-2.5 px-2 text-center">Coins</th>
                          <th className="py-2.5 px-2 text-center">Accuracy %</th>
                          <th className="py-2.5 px-2 text-center">Final Position</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-jungle-light/20 font-semibold">
                        {sessionReport.results.map((res: any, idx: number) => {
                          const matchingTeam = liveMonitorState?.teams.find((t: any) => t.id === res.teamId);
                          return (
                            <tr key={idx} className="hover:bg-jungle-medium/30 transition-colors">
                              <td className="py-3 px-2 font-bold text-gold">#{idx + 1}</td>
                              <td className="py-3 px-2 font-bold flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: matchingTeam?.color.includes('bg-red') ? '#EF4444' : matchingTeam?.color.includes('bg-blue') ? '#2563EB' : '#10B981' }} />
                                <span>{matchingTeam ? matchingTeam.name : 'Unknown Team'}</span>
                              </td>
                              <td className="py-3 px-2 text-center text-gold">{res.xp}</td>
                              <td className="py-3 px-2 text-center text-gold">{res.coins}</td>
                              <td className="py-3 px-2 text-center text-emerald-400">{res.accuracy.toFixed(0)}%</td>
                              <td className="py-3 px-2 text-center text-offwhite/90">{res.position}/17</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Post-game closing button */}
                  <button
                    onClick={() => {
                      setActiveSession(null);
                      setLiveMonitorState(null);
                      setSessionReport(null);
                      setActiveTab('questions');
                    }}
                    className="w-full py-3.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-xl uppercase tracking-wider text-xs border border-gold-dark"
                  >
                    Finish Session
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* T4: PAST REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
          <h3 className="font-adventure text-2xl font-bold text-gold border-b border-jungle-light/60 pb-3 mb-6">
            Past Competition History Reports
          </h3>
          
          <div className="space-y-4">
            {pastReports.map((rep, rIdx) => (
              <div key={rIdx} className="bg-jungle-deep p-4 rounded-xl border border-jungle-light flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-adventure text-lg font-bold text-gold">Room Code: {rep.session.roomCode}</h4>
                  <p className="text-xs text-offwhite/60">Classroom: {rep.className} · Played: {new Date(rep.session.startedAt).toLocaleString()}</p>
                </div>
                
                <div className="flex gap-3 text-xs font-semibold">
                  {rep.results.slice(0, 3).map((res: any, idx: number) => (
                    <div key={idx} className="bg-jungle-medium/70 px-3 py-1.5 rounded-lg border border-jungle-light/30">
                      <span className="text-gold-light font-bold">Rank #{idx + 1}: </span>
                      <span className="text-emerald-400">{res.accuracy.toFixed(0)}% Acc</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {pastReports.length === 0 && (
              <p className="text-center text-xs text-offwhite/40 italic py-10">No completed sessions recorded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
