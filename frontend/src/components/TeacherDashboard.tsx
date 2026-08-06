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
  AlertCircle,
  Check,
  X,
  UserCheck,
  Lock,
  RotateCcw,
  Settings as SettingsIcon,
  User,
  ListOrdered,
  Copy
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
  isArchived?: boolean;
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

  // Active Tab: Redesigned exact navigation items
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classes' | 'students' | 'questions' | 'leaderboard' | 'reports' | 'settings' | 'profile' | 'requests'>('dashboard');

  // Backend API Base URL
  const baseApi = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
  const API_BASE = `${baseApi}/api/v1/teacher`;

  // Question bank state
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionSearch, setQuestionSearch] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [isEditingQuestion, setIsEditingQuestion] = useState<any | null>(null); 
  const [csvText, setCsvText] = useState<string>('');
  const [showCsvImport, setShowCsvImport] = useState<boolean>(false);
  const [csvStatus, setCsvStatus] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null);

  // Classroom Management
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassSection, setNewClassSection] = useState<string>('A');
  const [newClassGrade, setNewClassGrade] = useState<number>(11);
  const [newClassSubject, setNewClassSubject] = useState<string>('Computer Science');
  const [activeClassDetails, setActiveClassDetails] = useState<any | null>(null);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Students roster additions
  const [rosterClassId, setRosterClassId] = useState<string>('');
  const [rosterNamesText, setRosterNamesText] = useState<string>('');

  // Students Management
  const [selectedStudentClassId, setSelectedStudentClassId] = useState<string>('');
  const [rosterStudents, setRosterStudents] = useState<any[]>([]);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any | null>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  // Live session state
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [liveMonitorState, setLiveMonitorState] = useState<any | null>(null);
  const [sessionReport, setSessionReport] = useState<any | null>(null);

  // Past Reports
  const [pastReports, setPastReports] = useState<any[]>([]);

  // Settings state
  const [themeMode, setThemeMode] = useState<string>('Dark Forest');

  // Teacher Profile Edit State
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [profileFirstName, setProfileFirstName] = useState<string>('');
  const [profileLastName, setProfileLastName] = useState<string>('');
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [profileSchool, setProfileSchool] = useState<string>('');
  const [profileSubject, setProfileSubject] = useState<string>('Computer Science');
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [profileExperience, setProfileExperience] = useState<string>('');
  const [profileBio, setProfileBio] = useState<string>('');
  const [profileCurrentPw, setProfileCurrentPw] = useState<string>('');
  const [profileNewPw, setProfileNewPw] = useState<string>('');

  // Add/Edit Student States
  const [showAddStudentForm, setShowAddStudentForm] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentEmail, setNewStudentEmail] = useState<string>('');
  const [newStudentPassword, setNewStudentPassword] = useState<string>('');
  const [newStudentRoll, setNewStudentRoll] = useState<string>('');
  const [addStudentError, setAddStudentError] = useState<string>('');
  const [addStudentSuccess, setAddStudentSuccess] = useState<string>('');

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState<string>('');
  const [editStudentEmail, setEditStudentEmail] = useState<string>('');
  const [editStudentPassword, setEditStudentPassword] = useState<string>('');
  const [editStudentClassId, setEditStudentClassId] = useState<string>('');
  const [profileSaveStatus, setProfileSaveStatus] = useState<string>('');
  const [profileSaveError, setProfileSaveError] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated && teacherInfo) {
      fetchQuestions();
      fetchClasses();
      fetchReports();
      fetchJoinRequests();
    }
  }, [isAuthenticated, teacherInfo]);

  // Handle socket live updates when session is active
  useEffect(() => {
    if (socket) {
      socket.on('room:updated', (data: any) => {
        if (activeSession && data.roomCode === activeSession.roomCode) {
          setLiveMonitorState(data);
          
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
        if (activeSession) {
          fetchSessionReport(activeSession.id);
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
        setAuthError(data.error || 'Access authorization failed');
        return;
      }

      setTeacherInfo(data.teacher);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError('Connection failed. Backend is offline.');
    }
  };

  // ==========================================
  // QUESTIONS CRUD METHODS
  // ==========================================

  const fetchQuestions = async () => {
    if (!teacherInfo) return;
    try {
      const res = await fetch(`${API_BASE}/questions?teacherId=${teacherInfo.id}`);
      const data = await res.json();
      if (res.ok) setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    }
  };

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
    try {
      const res = await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE' });
      if (res.ok) fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const duplicateQuestion = async (q: any) => {
    try {
      const res = await fetch(`${API_BASE}/questions/${q.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: teacherInfo?.id })
      });
      if (res.ok) {
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStudentError('');
    setAddStudentSuccess('');
    if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPassword.trim()) {
      setAddStudentError('All fields are required.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudentName.trim(),
          email: newStudentEmail.trim(),
          password: newStudentPassword.trim(),
          classId: selectedStudentClassId
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (newStudentRoll.trim()) {
          localStorage.setItem(`bytequest_student_roll_${data.student.id}`, newStudentRoll.trim());
        }
        setAddStudentSuccess('🎉 Student registered successfully!');
        setNewStudentName('');
        setNewStudentEmail('');
        setNewStudentPassword('');
        setNewStudentRoll('');
        handleSelectStudentClass(selectedStudentClassId);
      } else {
        setAddStudentError(data.error || 'Failed to add student.');
      }
    } catch (err) {
      setAddStudentError('Network error.');
    }
  };

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentId) return;
    try {
      const res = await fetch(`${API_BASE}/students/${editingStudentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editStudentName.trim(),
          email: editStudentEmail.trim(),
          password: editStudentPassword.trim() || undefined,
          classId: editStudentClassId
        })
      });
      if (res.ok) {
        alert('✅ Student profile updated!');
        setEditingStudentId(null);
        setEditStudentPassword('');
        handleSelectStudentClass(selectedStudentClassId);
        handleLoadStudentStats(editingStudentId);
      } else {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Failed to update student.'));
      }
    } catch (err) {
      alert('Connection failed.');
    }
  };

  const handleSaveTeacherProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherInfo) return;
    setProfileSaveStatus('');
    setProfileSaveError('');
    try {
      const body: any = {};
      if (profileFirstName.trim()) body.firstName = profileFirstName.trim();
      if (profileLastName.trim()) body.lastName = profileLastName.trim();
      if (profileEmail.trim()) body.email = profileEmail.trim();
      if (profileSchool.trim()) body.schoolName = profileSchool.trim();
      if (profileNewPw) {
        body.currentPassword = profileCurrentPw;
        body.newPassword = profileNewPw;
      }
      const res = await fetch(`${API_BASE}/profile/${teacherInfo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        // Save local metadata fields
        localStorage.setItem(`bytequest_teacher_pic_${teacherInfo.id}`, profilePhoto.trim());
        localStorage.setItem(`bytequest_teacher_subject_${teacherInfo.id}`, profileSubject.trim());
        localStorage.setItem(`bytequest_teacher_phone_${teacherInfo.id}`, profilePhone.trim());
        localStorage.setItem(`bytequest_teacher_exp_${teacherInfo.id}`, profileExperience.trim());
        localStorage.setItem(`bytequest_teacher_bio_${teacherInfo.id}`, profileBio.trim());

        setProfileSaveStatus('✅ Profile updated successfully!');
        setTeacherInfo((prev: any) => ({ ...prev, ...data.teacher }));
        setEditingProfile(false);
        setProfileCurrentPw('');
        setProfileNewPw('');
      } else {
        setProfileSaveError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileSaveError('Connection failed.');
    }
  };



  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setCsvStatus('Importing...');

    try {
      const res = await fetch(`${API_BASE}/questions/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, teacherId: teacherInfo.id })
      });
      const data = await res.json();
      if (res.ok) {
        setCsvStatus(`Import successful! Added questions.`);
        setCsvText('');
        fetchQuestions();
      } else {
        setCsvStatus(data.error || 'Import failed.');
      }
    } catch (err) {
      setCsvStatus('Network error.');
    }
  };

  // ==========================================
  // CLASSES CRUD METHODS
  // ==========================================

  const fetchClasses = async () => {
    if (!teacherInfo) return;
    try {
      const res = await fetch(`${API_BASE}/classes?teacherId=${teacherInfo.id}`);
      const data = await res.json();
      if (res.ok) setClasses(data.classes || []);
    } catch (err) {
      console.error(err);
    }
  };

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
          section: newClassSection,
          grade: Number(newClassGrade),
          subject: newClassSubject
        })
      });
      if (res.ok) {
        setNewClassName('');
        setNewClassSection('A');
        setNewClassSubject('Computer Science');
        fetchClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleDuplicateClass = async (classId: string) => {
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        alert('✅ Class duplicated successfully!');
        fetchClasses();
      } else {
        const data = await res.json();
        alert('Error: ' + (data.error || 'Failed to duplicate class.'));
      }
    } catch (err) {
      alert('Connection failed.');
    }
  };

  const handleEditClassName = async (classId: string, newName: string) => {
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        setEditingClass(null);
        fetchClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveClass = async (classId: string, isArchived: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived })
      });
      if (res.ok) fetchClasses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteConfirm(null);
        fetchClasses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudentsToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosterClassId || !rosterNamesText.trim()) return;

    const names = rosterNamesText.split('\n').filter(n => n.trim() !== '');

    try {
      const res = await fetch(`${API_BASE}/classes/${rosterClassId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names })
      });
      if (res.ok) {
        setRosterNamesText('');
        fetchClasses();
        // Reload details if active
        if (activeClassDetails && activeClassDetails.id === rosterClassId) {
          const updatedCls = classes.find(c => c.id === rosterClassId);
          setActiveClassDetails(updatedCls);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfigureTeams = async (classId: string, teamsConfig: any) => {
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: teamsConfig })
      });
      if (res.ok) {
        fetchClasses();
        alert('Teams allocated successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // STUDENT APPROVAL REQUESTS
  // ==========================================

  const fetchJoinRequests = async () => {
    if (!teacherInfo) return;
    try {
      const res = await fetch(`${API_BASE}/requests?teacherId=${teacherInfo.id}`);
      const data = await res.json();
      if (res.ok) setJoinRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveJoinRequest = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      const res = await fetch(`${API_BASE}/requests/${requestId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchJoinRequests();
        fetchClasses(); // Update student list
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // STUDENT MANAGEMENT OPTIONS
  // ==========================================

  const handleSelectStudentClass = (classId: string) => {
    setSelectedStudentClassId(classId);
    setSelectedStudentProfile(null);
    const cls = classes.find(c => c.id === classId);
    if (cls) {
      setRosterStudents(cls.students || []);
    }
  };

  const handleLoadStudentStats = async (studentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/students/profile/${studentId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedStudentProfile(data.student);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSuspendStudent = async (studentId: string, suspend: boolean) => {
    const action = suspend ? 'suspend' : 'unsuspend';
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/${action}`, { method: 'POST' });
      if (res.ok) {
        handleLoadStudentStats(studentId);
        fetchClasses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetStudentProgress = async (studentId: string) => {
    if (!confirm('Are you sure you want to reset all XP and Coins for this student?')) return;
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/reset`, { method: 'POST' });
      if (res.ok) {
        handleLoadStudentStats(studentId);
        fetchClasses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student from the roster?')) return;
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedStudentProfile(null);
        fetchClasses();
        // Refresh list
        if (selectedStudentClassId) handleSelectStudentClass(selectedStudentClassId);
      }
    } catch (e) {
      console.error(e);
    }
  };


  // ==========================================
  // SESSIONS & MONITORS
  // ==========================================

  const handleStartLobby = async (classId: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      });
      const data = await res.json();
      if (res.ok && data.session) {
        setActiveSession(data.session);
        setLobbyPlayers([]);
        setLiveMonitorState(null);
        setSessionReport(null);
        
        // Connect socket
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

  const fetchReports = async () => {
    if (!teacherInfo) return;
    try {
      const res = await fetch(`${API_BASE}/reports?teacherId=${teacherInfo.id}`);
      const data = await res.json();
      if (res.ok) setPastReports(data.reports || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSessionReport = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/report`);
      const data = await res.json();
      if (res.ok) {
        setSessionReport(data);
        setActiveSession(null); // Clear active session to view results
        fetchReports(); // Refresh past list
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(questionSearch.toLowerCase()) || 
                          q.topic.toLowerCase().includes(questionSearch.toLowerCase());
    const matchesGrade = gradeFilter === 'all' ? true : q.grade === Number(gradeFilter);
    const matchesDifficulty = difficultyFilter === 'all' ? true : q.difficulty === difficultyFilter;
    return matchesSearch && matchesGrade && matchesDifficulty;
  });

  // Render Login Panel if not authenticated
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

  // -------------------------------------------------------------
  // AUTHENTICATED REDESIGNED SIDEBAR PANEL
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col md:flex-row max-w-7xl mx-auto w-full px-4 py-8 gap-8">
      {/* Redesigned exact 9 tab items sidebar */}
      <aside className="w-full md:w-64 bg-jungle-medium border border-jungle-light rounded-2xl p-6 flex flex-col justify-between select-none">
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-jungle-light pb-4">
            <Compass className="text-gold w-6 h-6" />
            <span className="font-adventure text-lg font-bold text-gold">Teacher Console</span>
          </div>

          <nav className="flex flex-col gap-2">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'classes', label: 'Classes' },
              { id: 'students', label: 'Students' },
              { id: 'questions', label: 'Questions' },
              { id: 'requests', label: `Join Requests ${joinRequests.length > 0 ? `(${joinRequests.length})` : ''}` },
              { id: 'leaderboard', label: 'Leaderboard' },
              { id: 'reports', label: 'Reports' },
              { id: 'settings', label: 'Settings' },
              { id: 'profile', label: 'Profile' }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === t.id ? 'bg-gold text-jungle-deep shadow-md' : 'text-offwhite hover:bg-jungle-deep/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-jungle-light space-y-2">
          <div className="flex items-center gap-2 px-2 text-offwhite/70 text-[10px] font-bold uppercase">
            <User className="w-3.5 h-3.5 text-gold" />
            <span>{teacherInfo.name}</span>
          </div>
          <button 
            onClick={() => { setIsAuthenticated(false); onBack(); }}
            className="w-full flex items-center justify-between text-left px-4 py-2 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition-colors"
          >
            <span>Sign Out</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main workspace section */}
      <section className="flex-1 min-h-[60vh] select-text">
        {/* TAB 1: TEACHER DASHBOARD CENTRAL SCREEN */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
              <h2 className="font-adventure text-3xl font-bold text-gold mb-2">Welcome Back, {teacherInfo.name}!</h2>
              <p className="text-gold-light text-xs">ByteQuest school classroom controller console. Setup and check study progress here.</p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-jungle-deep border border-jungle-light/35 p-5 rounded-2xl text-center">
                <span className="text-2xl block mb-1">🏫</span>
                <span className="text-[10px] block text-offwhite/50 font-bold uppercase">Total Classes</span>
                <span className="font-adventure text-xl font-bold text-gold">{classes.length}</span>
              </div>
              <div className="bg-jungle-deep border border-jungle-light/35 p-5 rounded-2xl text-center">
                <span className="text-2xl block mb-1">👥</span>
                <span className="text-[10px] block text-offwhite/50 font-bold uppercase">Total Students</span>
                <span className="font-adventure text-xl font-bold text-gold">
                  {classes.reduce((acc, c) => acc + (c.students?.length || 0), 0)}
                </span>
              </div>
              <div className="bg-jungle-deep border border-jungle-light/35 p-5 rounded-2xl text-center">
                <span className="text-2xl block mb-1">📜</span>
                <span className="text-[10px] block text-offwhite/50 font-bold uppercase">Question Bank</span>
                <span className="font-adventure text-xl font-bold text-gold">{questions.length}</span>
              </div>
              <div className="bg-jungle-deep border border-jungle-light/35 p-5 rounded-2xl text-center">
                <span className="text-2xl block mb-1">⚡</span>
                <span className="text-[10px] block text-offwhite/50 font-bold uppercase">Pending Requests</span>
                <span className="font-adventure text-xl font-bold text-gold">{joinRequests.length}</span>
              </div>
            </div>

            {/* Pending Requests List Panel */}
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl space-y-4">
              <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2">Pending Student Approvals</h3>
              {joinRequests.length === 0 ? (
                <p className="text-offwhite/40 italic py-6 text-center text-xs">No pending student join requests.</p>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map(req => (
                    <div key={req.id} className="p-4 bg-jungle-deep/40 border border-jungle-light/20 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-white mb-0.5">{req.studentName}</h4>
                        <p className="text-gold-light text-[10px]">Requests to join: {req.className}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleResolveJoinRequest(req.id, 'ACCEPT')}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow"
                          title="Approve student"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleResolveJoinRequest(req.id, 'REJECT')}
                          className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded shadow"
                          title="Reject student"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLASSES (FULL CRUD) */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            {/* Create Class Form */}
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
              <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2 mb-4">Register New Class</h3>
              <form onSubmit={handleCreateClass} className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gold-light mb-1">Classroom Name</label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-offwhite"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gold-light mb-1">Section</label>
                  <input
                    type="text"
                    value={newClassSection}
                    onChange={(e) => setNewClassSection(e.target.value)}
                    placeholder="e.g. A"
                    className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-offwhite"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gold-light mb-1">Target Syllabus Grade</label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(Number(e.target.value))}
                    className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-offwhite font-bold"
                  >
                    <option value={10}>Class 10 (Basics)</option>
                    <option value={11}>Class 11 (Functions)</option>
                    <option value={12}>Class 12 (Data Structures)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gold-light mb-1">Subject</label>
                  <input
                    type="text"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-offwhite"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full py-2.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg uppercase">Create Class</button>
                </div>
              </form>
            </div>

            {/* Delete Confirmation Modal Overlay */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="parchment-panel rounded-xl max-w-sm w-full p-6 text-center text-jungle-deep">
                  <AlertCircle className="w-16 h-16 text-rose-600 mx-auto mb-3" />
                  <h3 className="font-adventure text-2xl font-bold mb-2">Delete Classroom?</h3>
                  <p className="text-xs text-jungle-light mb-6">
                    Warning: Deleting this class will permanently remove all student rosters, student progress stats, team configurations, and assignment history.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleDeleteClass(showDeleteConfirm)}
                      className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 py-2.5 bg-parchment-dark text-jungle-deep font-bold border rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List Classes */}
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl space-y-4">
              <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2">Active & Archived Classes</h3>
              <div className="space-y-4">
                {classes.map(cls => (
                  <div key={cls.id} className="p-4 bg-jungle-deep/45 border border-jungle-light/20 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        {editingClass?.id === cls.id ? (
                          <input 
                            type="text" 
                            value={editingClass.name}
                            onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                            onBlur={() => handleEditClassName(cls.id, editingClass.name)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEditClassName(cls.id, editingClass.name)}
                            className="bg-jungle-deep border border-gold text-offwhite p-1 rounded text-sm font-bold"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-adventure text-lg font-bold text-white">{cls.name} (Section {cls.section || 'A'})</span>
                            {cls.isArchived && <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full uppercase font-bold">Archived</span>}
                          </div>
                        )}
                        <span className="text-[10px] text-gold-light block">Syllabus Grade {cls.grade} | Subject: {cls.subject || 'Computer Science'} | {cls.students?.length || 0} Students | {cls.teams?.length || 0} Teams</span>
                        <div className="flex gap-4 mt-1">
                          <span className="text-xs font-bold text-gold">Join Code: <span className="font-mono bg-jungle-deep px-2 py-0.5 rounded border border-jungle-light text-white">{cls.joinCode || `BQ${cls.id.replace(/-/g, '').substring(0, 4).toUpperCase()}`}</span></span>
                          <span className="text-[10px] text-offwhite/50">Class ID: <span className="font-mono select-all bg-jungle-deep/50 px-1.5 py-0.5 rounded">{cls.id}</span></span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDuplicateClass(cls.id)}
                          className="p-1.5 bg-jungle-medium text-emerald-400 hover:bg-emerald-500/10 rounded"
                          title="Duplicate Class"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingClass({ id: cls.id, name: cls.name })}
                          className="p-1.5 bg-jungle-medium text-gold hover:bg-gold/10 rounded"
                          title="Rename Class"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleArchiveClass(cls.id, !cls.isArchived)}
                          className="p-1.5 bg-jungle-medium text-amber-400 hover:bg-amber-500/10 rounded"
                          title={cls.isArchived ? "Unarchive Class" : "Archive Class"}
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(cls.id)}
                          className="p-1.5 bg-rose-950/40 text-rose-400 hover:bg-rose-600 hover:text-white rounded"
                          title="Delete Class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {!cls.isArchived && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-jungle-light/20 text-xs">
                        {/* Roster students additions */}
                        <div>
                          <h4 className="font-bold text-gold-light mb-1 uppercase text-[9px]">Add Students (newline separated)</h4>
                          <form onSubmit={(e) => {
                            setRosterClassId(cls.id);
                            handleAddStudentsToClass(e);
                          }} className="space-y-2">
                            <textarea
                              value={rosterClassId === cls.id ? rosterNamesText : ''}
                              onChange={(e) => {
                                setRosterClassId(cls.id);
                                setRosterNamesText(e.target.value);
                              }}
                              placeholder="Aarav Sharma&#10;Diya Verma&#10;Kabir Roy"
                              className="w-full bg-jungle-deep border border-jungle-light/30 rounded p-1.5 text-offwhite text-[10px] h-16 resize-none"
                              required
                            />
                            <button type="submit" className="px-3 py-1 bg-gold text-jungle-deep font-bold rounded hover:bg-gold-light">Add to roster</button>
                          </form>
                        </div>

                        {/* Team configure option links */}
                        <div>
                          <h4 className="font-bold text-gold-light mb-1 uppercase text-[9px]">Configure Classroom Teams</h4>
                          <button 
                            onClick={() => {
                              const autoTeams = [
                                { name: 'Team Crimson', color: 'bg-red-600 text-white border-red-300', studentIds: cls.students.slice(0, 3).map((s:any)=>s.id) },
                                { name: 'Team Cobalt', color: 'bg-blue-600 text-white border-blue-300', studentIds: cls.students.slice(3, 6).map((s:any)=>s.id) },
                                { name: 'Team Jade', color: 'bg-emerald-600 text-white border-emerald-300', studentIds: cls.students.slice(6, 9).map((s:any)=>s.id) }
                              ];
                              handleConfigureTeams(cls.id, autoTeams);
                            }}
                            className="w-full py-2 bg-jungle-medium border border-jungle-light text-offwhite hover:bg-jungle-deep/50 rounded font-bold"
                          >
                            Quick Auto-Allocate Teams (Crimson/Cobalt/Jade)
                          </button>
                          
                          <button 
                            onClick={() => handleStartLobby(cls.id)}
                            disabled={cls.students.length === 0}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold mt-2 disabled:opacity-50"
                          >
                            Launch Live Session Lobby 🚀
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Live game room console */}
            {activeSession && (
              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl mt-6 space-y-4">
                <h3 className="font-adventure text-2xl font-bold text-gold border-b border-jungle-light pb-2">Active Classroom Room Lobby</h3>
                <div className="flex justify-between items-center bg-jungle-deep/40 p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] block text-gold-light uppercase font-bold">Session Code</span>
                    <span className="font-adventure text-3xl font-bold text-white tracking-widest">{activeSession.roomCode}</span>
                  </div>
                  <button 
                    onClick={handleTriggerStartMatch}
                    disabled={lobbyPlayers.length === 0}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow disabled:opacity-50"
                  >
                    Start Classroom Match
                  </button>
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-gold-light mb-2">CONNECTED STUDENTS ({lobbyPlayers.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {lobbyPlayers.map((p: any) => (
                      <div key={p.id} className="p-2 bg-jungle-deep/50 border border-jungle-light/25 rounded-lg text-center font-bold text-white">
                        {p.name}
                      </div>
                    ))}
                    {lobbyPlayers.length === 0 && <p className="text-offwhite/40 italic py-2 col-span-4">Waiting for students to join with Room Code...</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENTS MANAGEMENT PANEL */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-jungle-light pb-2 mb-4">
                <h3 className="font-adventure text-lg font-bold text-gold">Student Profiles Controller</h3>
                {selectedStudentClassId && (
                  <button
                    onClick={() => {
                      setShowAddStudentForm(!showAddStudentForm);
                      setAddStudentError('');
                      setAddStudentSuccess('');
                    }}
                    className="px-3 py-1.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg text-[10px] uppercase flex items-center gap-1"
                  >
                    {showAddStudentForm ? '✕ Close Form' : '➕ Add Student'}
                  </button>
                )}
              </div>
              
              <div className="max-w-md text-xs">
                <label className="block font-bold text-gold-light mb-1">Select Class roster</label>
                <select
                  value={selectedStudentClassId}
                  onChange={(e) => {
                    handleSelectStudentClass(e.target.value);
                    setShowAddStudentForm(false);
                    setEditingStudentId(null);
                  }}
                  className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-offwhite font-bold"
                >
                  <option value="">Choose Class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section ? `(Sec ${c.section})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Add student manually form */}
              {showAddStudentForm && selectedStudentClassId && (
                <form onSubmit={handleAddStudentSubmit} className="mt-6 p-5 bg-jungle-deep/45 border border-jungle-light/25 rounded-xl space-y-4 text-xs">
                  <h4 className="font-adventure text-sm font-bold text-gold">Register Student Manually</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Full Name</label>
                      <input
                        type="text"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="e.g. Aarav Sharma"
                        className="w-full bg-jungle-deep border border-jungle-light/35 rounded px-2.5 py-1.5 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Email Address</label>
                      <input
                        type="email"
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                        placeholder="e.g. aarav@student.com"
                        className="w-full bg-jungle-deep border border-jungle-light/35 rounded px-2.5 py-1.5 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Temporary Password</label>
                      <input
                        type="text"
                        value={newStudentPassword}
                        onChange={(e) => setNewStudentPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full bg-jungle-deep border border-jungle-light/35 rounded px-2.5 py-1.5 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Roll Number (Optional)</label>
                      <input
                        type="text"
                        value={newStudentRoll}
                        onChange={(e) => setNewStudentRoll(e.target.value)}
                        placeholder="e.g. 15"
                        className="w-full bg-jungle-deep border border-jungle-light/35 rounded px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  {addStudentError && <p className="text-rose-400 font-bold text-[10px]">{addStudentError}</p>}
                  {addStudentSuccess && <p className="text-emerald-400 font-bold text-[10px]">{addStudentSuccess}</p>}
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded uppercase text-[10px]">Add Explorer</button>
                </form>
              )}
            </div>

            {selectedStudentClassId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Students list */}
                <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
                  <h4 className="font-adventure text-sm font-bold text-gold border-b border-jungle-light pb-2 mb-3">Roster list</h4>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 text-xs">
                    {rosterStudents.map(student => (
                      <button
                        key={student.id}
                        onClick={() => {
                          handleLoadStudentStats(student.id);
                          setEditingStudentId(null);
                        }}
                        className={`w-full text-left p-3 rounded-lg border font-bold transition-all ${
                          selectedStudentProfile?.id === student.id 
                            ? 'bg-gold border-gold text-jungle-deep' 
                            : 'bg-jungle-deep/50 border-jungle-light/20 text-offwhite'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{student.name}</span>
                          {localStorage.getItem(`bytequest_student_roll_${student.id}`) && (
                            <span className="text-[9px] bg-jungle-deep/45 text-gold px-1.5 py-0.5 rounded font-mono">
                              #{localStorage.getItem(`bytequest_student_roll_${student.id}`)}
                            </span>
                          )}
                        </div>
                        {student.isSuspended && <span className="block text-[8px] text-rose-500 font-semibold">(Suspended)</span>}
                      </button>
                    ))}
                    {rosterStudents.length === 0 && <p className="text-offwhite/40 italic py-4 text-center">No students registered.</p>}
                  </div>
                </div>

                {/* Profile detail / edit card actions */}
                <div className="md:col-span-2 bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
                  {selectedStudentProfile ? (
                    editingStudentId === selectedStudentProfile.id ? (
                      /* EDITING STUDENT MODE FORM */
                      <form onSubmit={handleEditStudentSubmit} className="space-y-4 text-xs">
                        <div className="flex justify-between items-center border-b border-jungle-light pb-2">
                          <h4 className="font-adventure text-sm font-bold text-gold">Edit Student Profile</h4>
                          <button
                            type="button"
                            onClick={() => setEditingStudentId(null)}
                            className="text-[10px] text-offwhite/50 font-bold hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Full Name</label>
                            <input
                              type="text"
                              value={editStudentName}
                              onChange={(e) => setEditStudentName(e.target.value)}
                              className="w-full bg-jungle-deep border border-jungle-light rounded px-2.5 py-1.5 text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Email Address</label>
                            <input
                              type="email"
                              value={editStudentEmail}
                              onChange={(e) => setEditStudentEmail(e.target.value)}
                              className="w-full bg-jungle-deep border border-jungle-light rounded px-2.5 py-1.5 text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Move to Class / Section</label>
                            <select
                              value={editStudentClassId}
                              onChange={(e) => setEditStudentClassId(e.target.value)}
                              className="w-full bg-jungle-deep border border-jungle-light rounded px-2.5 py-1.5 text-white font-bold"
                            >
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} {c.section ? `(Sec ${c.section})` : ''}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Reset Password (Optional)</label>
                            <input
                              type="password"
                              value={editStudentPassword}
                              onChange={(e) => setEditStudentPassword(e.target.value)}
                              placeholder="Leave blank to keep current password"
                              className="w-full bg-jungle-deep border border-jungle-light rounded px-2.5 py-1.5 text-white"
                            />
                          </div>
                        </div>
                        <button type="submit" className="w-full py-2 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded uppercase">Save Explorer Changes</button>
                      </form>
                    ) : (
                      /* STATISTICS VIEW MODE */
                      <div className="space-y-6 text-xs select-text">
                        <div className="flex justify-between items-center border-b border-jungle-light pb-2 mb-3">
                          <h4 className="font-adventure text-sm font-bold text-gold">Explorer Statistics</h4>
                          <span className="text-[10px] text-offwhite/50 font-semibold">Registered Email: {selectedStudentProfile.email}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 font-semibold">
                          <div className="bg-jungle-deep/30 p-3 rounded-xl">
                            <span className="text-[9px] block text-gold-light uppercase">XP Score</span>
                            <span className="text-lg font-bold text-white">{selectedStudentProfile.xp} XP</span>
                          </div>
                          <div className="bg-jungle-deep/30 p-3 rounded-xl">
                            <span className="text-[9px] block text-gold-light uppercase">Level</span>
                            <span className="text-lg font-bold text-white">Level {selectedStudentProfile.level}</span>
                          </div>
                          <div className="bg-jungle-deep/30 p-3 rounded-xl">
                            <span className="text-[9px] block text-gold-light uppercase">Coins Gained</span>
                            <span className="text-lg font-bold text-white">{selectedStudentProfile.coins} Coins</span>
                          </div>
                          <div className="bg-jungle-deep/30 p-3 rounded-xl">
                            <span className="text-[9px] block text-gold-light uppercase">Accuracy Rate</span>
                            <span className="text-lg font-bold text-emerald-400">{(selectedStudentProfile.accuracy * 100).toFixed(0)}%</span>
                          </div>
                        </div>

                        {/* Admin action buttons */}
                        <div className="border-t border-jungle-light/20 pt-4 space-y-3 font-sans">
                          <h4 className="font-bold text-gold-light uppercase text-[9px] tracking-wider mb-2">Roster Controller Actions</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-bold text-center">
                            <button 
                              onClick={() => {
                                setEditingStudentId(selectedStudentProfile.id);
                                setEditStudentName(selectedStudentProfile.name);
                                setEditStudentEmail(selectedStudentProfile.email || '');
                                setEditStudentClassId(selectedStudentProfile.classId || selectedStudentClassId);
                                setEditStudentPassword('');
                              }}
                              className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px]"
                            >
                              ✏️ Edit Info
                            </button>
                            {selectedStudentProfile.isSuspended ? (
                              <button 
                                onClick={() => handleSuspendStudent(selectedStudentProfile.id, false)}
                                className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px]"
                              >
                                Unsuspend
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleSuspendStudent(selectedStudentProfile.id, true)}
                                className="py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px]"
                              >
                                Suspend Student
                              </button>
                            )}
                            <button 
                              onClick={() => handleResetStudentProgress(selectedStudentProfile.id)}
                              className="py-2 bg-jungle-deep border border-gold text-gold rounded text-[10px]"
                            >
                              Reset Progress
                            </button>
                            <button 
                              onClick={() => handleRemoveStudent(selectedStudentProfile.id)}
                              className="py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px]"
                            >
                              Remove Student
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="text-offwhite/40 italic py-10 text-center text-xs">Choose a student profile from the roster list to check stats.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: QUESTIONS BANK MANAGER (CRUD & CSV IMPORT) */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            {/* Importer trigger */}
            <div className="flex justify-between items-center bg-jungle-medium border border-jungle-light p-4 rounded-2xl">
              <div>
                <h3 className="font-adventure text-lg font-bold text-gold">Curriculum Syllabus Pool</h3>
                <span className="text-[10px] text-gold-light block">Create MCQ entries or upload CSV questions</span>
              </div>
              <div className="flex gap-2">
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase"
                >
                  Create New Question
                </button>
                <button 
                  onClick={() => setShowCsvImport(!showCsvImport)}
                  className="px-4 py-2 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg text-xs uppercase"
                >
                  CSV Import
                </button>
              </div>
            </div>

            {/* Editing Form */}
            {isEditingQuestion && (
              <div className="bg-jungle-medium border border-gold/40 p-6 rounded-2xl space-y-4 shadow-2xl">
                <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2 mb-4">
                  {isEditingQuestion.id ? '✏️ Edit Question' : '✨ Create New Question'}
                </h3>
                <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-gold-light mb-1">Grade</label>
                      <select
                        value={isEditingQuestion.grade || 11}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, grade: Number(e.target.value) })}
                        className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-white font-bold"
                      >
                        <option value={10}>Class 10</option>
                        <option value={11}>Class 11</option>
                        <option value={12}>Class 12</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gold-light mb-1">Topic</label>
                      <input
                        type="text"
                        value={isEditingQuestion.topic || ''}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, topic: e.target.value })}
                        placeholder="e.g. Loops"
                        className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gold-light mb-1">Difficulty</label>
                      <select
                        value={isEditingQuestion.difficulty || 'medium'}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, difficulty: e.target.value })}
                        className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-white font-bold"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gold-light mb-1">Question Text</label>
                    <textarea
                      value={isEditingQuestion.question || ''}
                      onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, question: e.target.value })}
                      placeholder="Enter the question text here..."
                      className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-white h-20 resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(isEditingQuestion.options || ['', '', '', '']).map((opt: string, idx: number) => (
                      <div key={idx}>
                        <label className="block font-bold text-gold-light mb-1">Option {idx + 1}</label>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(isEditingQuestion.options || ['', '', '', ''])];
                            newOpts[idx] = e.target.value;
                            setIsEditingQuestion({ ...isEditingQuestion, options: newOpts });
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-white"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gold-light mb-1">Correct Answer Index (1-4)</label>
                      <select
                        value={isEditingQuestion.correctIndex || 0}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, correctIndex: Number(e.target.value) })}
                        className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-white font-bold"
                      >
                        <option value={0}>Option 1</option>
                        <option value={1}>Option 2</option>
                        <option value={2}>Option 3</option>
                        <option value={3}>Option 4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gold-light mb-1">Explanation</label>
                      <input
                        type="text"
                        value={isEditingQuestion.explanation || ''}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, explanation: e.target.value })}
                        placeholder="Explain the correct answer..."
                        className="w-full bg-jungle-deep border border-jungle-light/40 rounded-lg p-2.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg uppercase">
                      Save Question
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingQuestion(null)}
                      className="px-5 py-2.5 bg-jungle-deep border border-jungle-light text-offwhite font-bold rounded-lg uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* CSV Import card */}
            {showCsvImport && (
              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
                <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2 mb-4">Bulk Import MCQ (Semicolon separated)</h3>
                <p className="text-[10px] text-gold-light mb-3">Format: Grade;Topic;Difficulty;Question;Opt1;Opt2;Opt3;Opt4;CorrectIndex(0-3);Explanation</p>
                <form onSubmit={handleCsvImport} className="space-y-3">
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="11;Functions;medium;Define Python module;Script;Package;Library;Core;0;Modules are script files."
                    className="w-full bg-jungle-deep border border-jungle-light/35 rounded-xl p-3 text-xs text-offwhite h-32 resize-y font-mono"
                    required
                  />
                  {csvStatus && <p className="text-xs font-bold text-gold">{csvStatus}</p>}
                  <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase">Upload CSV</button>
                </form>
              </div>
            )}

            {/* Questions list filter */}
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-jungle-light pb-4">
                <div className="flex items-center bg-jungle-deep border border-jungle-light/30 rounded-xl px-3 py-1.5 w-full md:w-80">
                  <Search className="w-4 h-4 text-gold-light mr-2" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search topic or question..."
                    className="bg-transparent text-xs text-white focus:outline-none w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex gap-1.5 border-r border-jungle-light pr-3">
                    {['all', '10', '11', '12'].map(g => (
                      <button
                        key={g}
                        onClick={() => setGradeFilter(g)}
                        className={`px-3 py-1 border rounded text-[10px] font-bold uppercase ${
                          gradeFilter === g ? 'bg-gold border-gold text-jungle-deep' : 'bg-jungle-deep border-jungle-light text-offwhite'
                        }`}
                      >
                        {g === 'all' ? 'All Grades' : `Class ${g}`}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    {['all', 'easy', 'medium', 'hard'].map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficultyFilter(d)}
                        className={`px-3 py-1 border rounded text-[10px] font-bold uppercase ${
                          difficultyFilter === d ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-jungle-deep border-jungle-light text-offwhite'
                        }`}
                      >
                        {d === 'all' ? 'All Diff' : d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Display Question List */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs">
                {filteredQuestions.map(q => (
                  <div key={q.id} className="p-4 bg-jungle-deep/45 border border-jungle-light/25 rounded-xl space-y-2 relative select-text">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[9px] bg-gold/15 text-gold px-2 py-0.5 rounded-full font-bold uppercase mr-1.5">{q.difficulty}</span>
                        <span className="text-gold-light font-bold">Class {q.grade} | Topic: {q.topic}</span>
                        <p className="font-bold text-white text-sm mt-1 leading-relaxed">{q.question}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="p-1.5 bg-jungle-medium text-emerald-400 hover:bg-emerald-500/10 rounded"
                          title="Student Preview"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => setIsEditingQuestion(q)}
                          className="p-1.5 bg-jungle-medium text-gold hover:bg-gold/10 rounded"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateQuestion(q)}
                          className="p-1.5 bg-jungle-medium text-indigo-400 hover:bg-indigo-500/10 rounded"
                          title="Duplicate"
                        >
                          📋
                        </button>
                        <button 
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 bg-rose-950/45 text-rose-400 hover:bg-rose-600 hover:text-white rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-semibold text-offwhite/85">
                      {q.options.map((opt: string, idx: number) => (
                        <div 
                          key={idx} 
                          className={`p-2 rounded border ${
                            idx === q.correctIndex ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-jungle-deep/20 border-jungle-light/10'
                          }`}
                        >
                          {idx + 1}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredQuestions.length === 0 && <p className="text-offwhite/40 italic py-10 text-center">No questions found matching your search parameters.</p>}
              </div>
            </div>

            {/* Preview Question Modal Overlay */}
            {previewQuestion && (
              <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="parchment-panel rounded-xl max-w-lg w-full p-6 text-jungle-deep shadow-2xl relative">
                  <button
                    onClick={() => setPreviewQuestion(null)}
                    className="absolute top-4 right-4 text-jungle-light font-bold text-xs"
                  >
                    Close [X]
                  </button>
                  <h3 className="font-adventure text-2xl font-bold text-gold-dark border-b border-gold-dark/25 pb-2 mb-4">
                    Student MCQ Preview
                  </h3>
                  <div className="space-y-4 text-xs font-bold font-sans">
                    <div className="flex gap-2">
                      <span className="bg-gold/20 text-gold-dark px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-gold-dark/30">
                        {previewQuestion.difficulty}
                      </span>
                      <span className="text-jungle-light text-[10px]">
                        Class {previewQuestion.grade}
                      </span>
                    </div>
                    <p className="text-base font-semibold leading-relaxed text-jungle-deep font-adventure">
                      {previewQuestion.question}
                    </p>
                    <div className="space-y-2">
                      {previewQuestion.options.map((opt: string, idx: number) => {
                        const isCorrect = idx === previewQuestion.correctIndex;
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                                : 'bg-parchment-light border-gold-dark/30 text-jungle-deep'
                            }`}
                          >
                            <span>
                              {String.fromCharCode(65 + idx)}. {opt}
                            </span>
                            {isCorrect && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-extrabold">
                                CORRECT CHOICE
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {previewQuestion.explanation && (
                      <div className="bg-amber-50 border border-amber-300/60 p-3 rounded-lg text-amber-900 text-xs">
                        <span className="block text-[10px] uppercase text-amber-800 font-extrabold mb-1">
                          Explanation:
                        </span>
                        {previewQuestion.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: JOIN REQUESTS APPROVALS */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
              <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2 mb-4">Join Requests</h3>
              <p className="text-xs text-gold-light mb-6">Review pending requests from students seeking to join your classrooms.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {joinRequests.map((req: any) => (
                  <div key={req.id} className="p-5 bg-jungle-deep/55 border border-jungle-light/30 rounded-xl space-y-4 relative flex flex-col justify-between text-xs">
                    <div className="space-y-2 text-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-sm block">{req.studentName}</span>
                          <span className="text-[10px] text-offwhite/50 block">Wants to join: {req.className}</span>
                          <span className="text-[10px] text-gold block">Grade Level: {req.studentGrade || 11}</span>
                        </div>
                        <span className="text-[9px] text-offwhite/50">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-jungle-light/20">
                      <button
                        onClick={() => handleResolveJoinRequest(req.id, 'ACCEPT')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg uppercase"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleResolveJoinRequest(req.id, 'REJECT')}
                        className="flex-1 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg uppercase"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {joinRequests.length === 0 && (
                  <div className="col-span-full py-16 text-center text-offwhite/40 italic text-sm">
                    🎉 No pending join requests. Everything is up to date!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CLASS LEADERBOARD STANDINGS */}
        {activeTab === 'leaderboard' && (
          <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl space-y-4">
            <h3 className="font-adventure text-xl font-bold text-gold border-b border-jungle-light pb-2">Student Standings Leaderboard</h3>
            <p className="text-gold-light text-xs">Overview rank standings compiled across classes</p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 text-xs">
              {[
                { name: 'Aarav Gupta', xp: 480, coins: 45, className: 'Grade 11 - Section B' },
                { name: 'Kabir Patel', xp: 320, coins: 30, className: 'Grade 11 - Section B' },
                { name: 'Diya Sharma', xp: 250, coins: 15, className: 'Grade 11 - Section B' }
              ].sort((a,b)=>b.xp - a.xp).map((student, idx) => (
                <div key={idx} className="p-4 bg-jungle-deep/50 border border-jungle-light/20 rounded-xl flex justify-between items-center text-white font-semibold">
                  <div className="flex items-center gap-3">
                    <span className="font-bold font-mono">#{idx+1}</span>
                    <div>
                      <span className="font-bold text-sm block">{student.name}</span>
                      <span className="text-[10px] text-offwhite/50 block">Class: {student.className}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-gold">
                    <span>⭐ {student.xp} XP</span>
                    <span>🪙 {student.coins} Coins</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: ASYNC SESSION REPORTS PAGE */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* List past games */}
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
              <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2 mb-4">Completed Game Session Reports</h3>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 text-xs">
                {pastReports.map(report => (
                  <button 
                    key={report.id}
                    onClick={() => fetchSessionReport(report.id)}
                    className="w-full text-left p-4 bg-jungle-deep/55 border border-jungle-light/20 rounded-xl hover:bg-jungle-deep hover:border-gold/30 transition-all flex justify-between items-center"
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full mr-2">Finished</span>
                      <span className="font-bold text-white">Roster Code: {report.roomCode}</span>
                      <p className="text-[10px] text-gold-light mt-1">Classroom Grade: {report.className} | Date: {new Date(report.endedAt).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gold-light" />
                  </button>
                ))}
                {pastReports.length === 0 && <p className="text-offwhite/40 italic py-10 text-center">No completed match sessions saved in database.</p>}
              </div>
            </div>

            {/* Student Progress & Activity Report */}
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl space-y-4">
              <h3 className="font-adventure text-lg font-bold text-gold border-b border-jungle-light pb-2 mb-4">Student Activity & Progress</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-jungle-light/25 text-gold font-bold">
                      <th className="py-2.5">Student Name</th>
                      <th className="py-2.5">Email</th>
                      <th className="py-2.5 text-center">Grade</th>
                      <th className="py-2.5 text-center">XP</th>
                      <th className="py-2.5 text-center">Coins</th>
                      <th className="py-2.5 text-center">Explorer Level</th>
                      <th className="py-2.5 text-center font-bold">Minutes Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.flatMap(cls => cls.students || []).map((student: any) => (
                      <tr key={student.id} className="border-b border-jungle-light/10 text-white font-semibold">
                        <td className="py-3 font-bold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${student.isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`} title={student.isSuspended ? 'Suspended' : 'Active'}></span>
                          <span>{student.name}</span>
                        </td>
                        <td className="py-3 text-offwhite/70">{student.email || 'N/A'}</td>
                        <td className="py-3 text-center">{student.grade || 11}</td>
                        <td className="py-3 text-center text-gold">{student.xp}</td>
                        <td className="py-3 text-center">{student.coins}</td>
                        <td className="py-3 text-center">Level {student.level}</td>
                        <td className="py-3 text-center font-mono font-bold text-emerald-400">{student.minutesPlayed || 0} min</td>
                      </tr>
                    ))}
                    {classes.flatMap(cls => cls.students || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-offwhite/40 italic py-6 text-center">No students registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Session details modal report */}
            {sessionReport && (
              <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl space-y-4 relative">
                <button 
                  onClick={() => setSessionReport(null)}
                  className="absolute top-4 right-4 text-offwhite/60 hover:text-white text-xs font-bold font-sans"
                >
                  Close Report [X]
                </button>
                <h3 className="font-adventure text-2xl font-bold text-gold border-b border-jungle-light pb-2">Session Summary Details</h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gold-light">
                  <div>Session ID: <span className="text-white font-bold">{sessionReport.session.id}</span></div>
                  <div>Classroom: <span className="text-white font-bold">{sessionReport.className}</span></div>
                  <div>Room Code: <span className="text-white font-bold">{sessionReport.session.roomCode}</span></div>
                  <div>Ended At: <span className="text-white font-bold">{new Date(sessionReport.session.endedAt).toLocaleString()}</span></div>
                </div>

                <div className="overflow-x-auto pr-2 text-xs pt-4 select-text">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-jungle-light/25 text-gold font-bold">
                        <th className="py-2.5">Team Explorer</th>
                        <th className="py-2.5 text-center">Final Tile Position</th>
                        <th className="py-2.5 text-center font-bold">Answer Accuracy</th>
                        <th className="py-2.5 text-center">XP Earned</th>
                        <th className="py-2.5 text-center">Final Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionReport.results.map((r: any) => (
                        <tr key={r.id} className="border-b border-jungle-light/10 text-white font-semibold">
                          <td className="py-3 font-bold">{r.teamName || r.studentName}</td>
                          <td className="py-3 text-center">{r.position}</td>
                          <td className="py-3 text-center text-emerald-400 font-bold">{r.accuracy.toFixed(0)}%</td>
                          <td className="py-3 text-center text-gold">{r.xp}</td>
                          <td className="py-3 text-center font-adventure font-extrabold text-gold-dark text-sm">#{r.rank}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: SETTINGS PANEL */}
        {activeTab === 'settings' && (
          <div className="parchment-panel rounded-2xl p-8 text-jungle-deep max-w-md mx-auto space-y-4">
            <h3 className="font-adventure text-2xl font-bold text-gold-dark border-b border-gold-dark/25 pb-2">Console Settings</h3>
            
            <div className="flex justify-between items-center py-2 border-b border-gold-dark/10">
              <span className="text-xs font-bold text-jungle-light">Sidebar Theme Layout</span>
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value)}
                className="bg-parchment-light border border-gold-dark/30 rounded p-1 text-xs font-bold"
              >
                <option value="Dark Forest">Dark Forest (Jungle)</option>
                <option value="Parchment Light">Parchment Light</option>
              </select>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gold-dark/10">
              <span className="text-xs font-bold text-jungle-light">Authentication Logs</span>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">SSL Secured</span>
            </div>
            
            <div className="pt-2 text-center text-[10px] text-offwhite/40 italic">
              ByteQuest Teacher Dashboard controller console build version 1.0.0
            </div>
          </div>
        )}

        {/* TAB 9: PROFILE SUMMARY */}
        {activeTab === 'profile' && (
          <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl text-xs space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-adventure text-xl font-bold text-gold">Teacher Profile Details</h3>
              <button
                onClick={() => {
                  setEditingProfile(!editingProfile);
                  if (!editingProfile) {
                    const nameParts = (teacherInfo.name || '').split(' ');
                    setProfileFirstName(nameParts[0] || '');
                    setProfileLastName(nameParts.slice(1).join(' ') || '');
                    setProfileEmail(teacherInfo.email || '');
                    setProfileSchool(teacherInfo.schoolName || 'Delhi Public School');
                    setProfileSubject(localStorage.getItem(`bytequest_teacher_subject_${teacherInfo.id}`) || 'Computer Science');
                    setProfilePhone(localStorage.getItem(`bytequest_teacher_phone_${teacherInfo.id}`) || '');
                    setProfilePhoto(localStorage.getItem(`bytequest_teacher_pic_${teacherInfo.id}`) || '');
                    setProfileExperience(localStorage.getItem(`bytequest_teacher_exp_${teacherInfo.id}`) || '');
                    setProfileBio(localStorage.getItem(`bytequest_teacher_bio_${teacherInfo.id}`) || '');
                    setProfileCurrentPw('');
                    setProfileNewPw('');
                    setProfileSaveStatus('');
                    setProfileSaveError('');
                  }
                }}
                className="px-3 py-1.5 bg-gold/20 border border-gold/50 text-gold text-[10px] font-bold rounded-lg hover:bg-gold/30 transition-colors font-sans"
              >
                {editingProfile ? 'Cancel' : '✏️ Edit Profile'}
              </button>
            </div>

            {!editingProfile ? (
              <div className="space-y-4 text-gold-light pt-2 font-semibold select-text">
                <div className="flex items-center gap-4 border-b border-jungle-light pb-4 mb-2">
                  <div className="w-16 h-16 rounded-full bg-jungle-deep border border-gold/45 flex items-center justify-center text-3xl overflow-hidden text-offwhite/50">
                    {localStorage.getItem(`bytequest_teacher_pic_${teacherInfo.id}`) ? (
                      <img src={localStorage.getItem(`bytequest_teacher_pic_${teacherInfo.id}`)!} alt="profile" className="w-full h-full object-cover" />
                    ) : (
                      '👩‍🏫'
                    )}
                  </div>
                  <div>
                    <span className="text-xl font-adventure text-gold block">{teacherInfo.name}</span>
                    <span className="text-[10px] text-offwhite/50">Certified Instructor</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>Name: <span className="text-white font-bold">{teacherInfo.name}</span></div>
                  <div>Registered Email: <span className="text-white font-bold">{teacherInfo.email}</span></div>
                  <div>School: <span className="text-white font-bold">{teacherInfo.schoolName || 'Delhi Public School'}</span></div>
                  <div>Subject: <span className="text-white font-bold">{localStorage.getItem(`bytequest_teacher_subject_${teacherInfo.id}`) || 'Computer Science'}</span></div>
                  <div>Phone: <span className="text-white font-bold">{localStorage.getItem(`bytequest_teacher_phone_${teacherInfo.id}`) || '—'}</span></div>
                  <div>Experience: <span className="text-white font-bold">{localStorage.getItem(`bytequest_teacher_exp_${teacherInfo.id}`) ? `${localStorage.getItem(`bytequest_teacher_exp_${teacherInfo.id}`)} Years` : '—'}</span></div>
                  <div className="col-span-2">Biography: <p className="text-white font-bold mt-1 bg-jungle-deep/30 p-2.5 rounded-lg border border-jungle-light/20 font-sans font-normal">{localStorage.getItem(`bytequest_teacher_bio_${teacherInfo.id}`) || 'No biography entered yet.'}</p></div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveTeacherProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">First Name</label>
                    <input
                      type="text"
                      value={profileFirstName}
                      onChange={(e) => setProfileFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Email</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">School</label>
                    <input
                      type="text"
                      value={profileSchool}
                      onChange={(e) => setProfileSchool(e.target.value)}
                      placeholder="School name"
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Subject</label>
                    <input
                      type="text"
                      value={profileSubject}
                      onChange={(e) => setProfileSubject(e.target.value)}
                      placeholder="Subject taught"
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Phone</label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Experience (Yrs)</label>
                    <input
                      type="number"
                      value={profileExperience}
                      onChange={(e) => setProfileExperience(e.target.value)}
                      placeholder="Years"
                      className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Profile Photo (Upload from device)</label>
                  <div className="flex items-center gap-3">
                    {profilePhoto && (
                      <img 
                        src={profilePhoto} 
                        alt="Profile Preview" 
                        className="w-12 h-12 rounded-full object-cover border border-gold/40"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfilePhoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-offwhite bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 cursor-pointer w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gold-light mb-1">Biography / Bio</label>
                  <textarea
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Tell your students about yourself..."
                    rows={3}
                    className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold font-sans"
                  />
                </div>

                <div className="border-t border-jungle-light pt-3">
                  <p className="text-[10px] font-bold text-gold-light uppercase mb-2 font-sans font-extrabold">Change Password (optional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-jungle-light mb-1 font-sans font-bold">Current Password</label>
                      <input
                        type="password"
                        value={profileCurrentPw}
                        onChange={(e) => setProfileCurrentPw(e.target.value)}
                        placeholder="Current password"
                        className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-jungle-light mb-1 font-sans font-bold">New Password</label>
                      <input
                        type="password"
                        value={profileNewPw}
                        onChange={(e) => setProfileNewPw(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full bg-jungle-deep border border-jungle-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                </div>

                {profileSaveError && (
                  <div className="bg-rose-950/50 text-rose-300 text-xs p-2.5 rounded-lg border border-rose-500/40 font-semibold font-sans">
                    {profileSaveError}
                  </div>
                )}
                {profileSaveStatus && (
                  <div className="bg-emerald-950/50 text-emerald-300 text-xs p-2.5 rounded-lg border border-emerald-500/40 font-semibold font-sans">
                    {profileSaveStatus}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gold hover:bg-gold-light text-jungle-deep font-bold rounded-lg text-xs uppercase"
                >
                  Save Changes
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
