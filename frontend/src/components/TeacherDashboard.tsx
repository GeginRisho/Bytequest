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
  activeTab: 'dashboard' | 'classes' | 'teachers' | 'students' | 'questions' | 'leaderboard' | 'reports' | 'settings' | 'profile' | 'requests';
  setActiveTab: (tab: 'dashboard' | 'classes' | 'teachers' | 'students' | 'questions' | 'leaderboard' | 'reports' | 'settings' | 'profile' | 'requests') => void;
  showTeacherModal: 'create' | 'edit' | 'reset-password' | null;
  setShowTeacherModal: (modal: 'create' | 'edit' | 'reset-password' | null) => void;
  theme: string;
  setTheme: (theme: string) => void;
  onLoginStateChange?: (authenticated: boolean) => void;
}

export default function TeacherDashboard({ 
  onBack, 
  socket,
  activeTab,
  setActiveTab,
  showTeacherModal,
  setShowTeacherModal,
  theme,
  setTheme,
  onLoginStateChange
}: TeacherDashboardProps) {
  // Local wrapper to automatically inject Authorization token
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = localStorage.getItem('bytequest_token');
    const headers = {
      ...(init?.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return window.fetch(input, { ...init, headers });
  };

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [teacherInfo, setTeacherInfo] = useState<any>(null);

  useEffect(() => {
    const cachedTeacher = localStorage.getItem('bytequest_teacher_info');
    if (cachedTeacher) {
      setTeacherInfo(JSON.parse(cachedTeacher));
      setIsAuthenticated(true);
      onLoginStateChange?.(true);
    }
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      setSidebarOpen(prev => !prev);
    };
    window.addEventListener('toggle-teacher-sidebar', handleToggle);
    return () => {
      window.removeEventListener('toggle-teacher-sidebar', handleToggle);
    };
  }, []);

  // Teacher Signup State (Public self-registration disabled; accounts created via Teacher Management only)

  // Teacher Management State
  const [teachersList, setTeachersList] = useState<any[]>([]);

  const playBeep = (freq: number, type: OscillatorType, duration: number, vol: number = 0.08) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  };

  const handleGoBack = () => {
    playBeep(430, 'sine', 0.05);
    if (showTeacherModal) {
      setShowTeacherModal(null);
      return;
    }
    if (activeTab !== 'dashboard') {
      setActiveTab('dashboard');
      return;
    }
    onBack();
  };
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teacherFormEmail, setTeacherFormEmail] = useState('');
  const [teacherFormPassword, setTeacherFormPassword] = useState('');
  const [teacherFormFirstName, setTeacherFormFirstName] = useState('');
  const [teacherFormLastName, setTeacherFormLastName] = useState('');
  const [teacherFormSchool, setTeacherFormSchool] = useState('');
  const [teacherFormSubject, setTeacherFormSubject] = useState('');
  const [teacherFormPhone, setTeacherFormPhone] = useState('');
  const [teacherFormError, setTeacherFormError] = useState('');
  const [teacherFormSuccess, setTeacherFormSuccess] = useState('');

  // Backend API Base URL
  const baseApi = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
  const API_BASE = `${baseApi}/api/v1/teacher`;

  // Question bank state
  const [questions, setQuestions] = useState<any[]>([]);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState<number>(0);
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
  const [newClassGrade, setNewClassGrade] = useState<number>(4);
  const [newClassSubject, setNewClassSubject] = useState<string>('English');
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
      loadTeachersList();
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

  const clearTeacherForm = () => {
    setTeacherFormEmail('');
    setTeacherFormPassword('');
    setTeacherFormFirstName('');
    setTeacherFormLastName('');
    setTeacherFormSchool('');
    setTeacherFormSubject('');
    setTeacherFormPhone('');
    setTeacherFormError('');
    setTeacherFormSuccess('');
  };

  const loadTeachersList = async () => {
    try {
      const res = await fetch(`${API_BASE}/management/teachers`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTeachersList(data.teachers);
      }
    } catch (err) {
      console.error('Failed to load teachers list:', err);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherFormError('');
    setTeacherFormSuccess('');
    try {
      const res = await fetch(`${API_BASE}/management/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: teacherFormEmail,
          password: teacherFormPassword,
          firstName: teacherFormFirstName,
          lastName: teacherFormLastName,
          schoolName: teacherFormSchool,
          subject: teacherFormSubject,
          mobileNumber: teacherFormPhone
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTeacherFormSuccess('Teacher created successfully!');
        loadTeachersList();
        setTimeout(() => {
          setShowTeacherModal(null);
          clearTeacherForm();
        }, 1500);
      } else {
        setTeacherFormError(data.error || 'Failed to create teacher.');
      }
    } catch (err: any) {
      setTeacherFormError(err.message || 'Server error.');
    }
  };

  const handleEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherFormError('');
    setTeacherFormSuccess('');
    try {
      const res = await fetch(`${API_BASE}/management/teachers/${selectedTeacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: teacherFormEmail,
          firstName: teacherFormFirstName,
          lastName: teacherFormLastName,
          schoolName: teacherFormSchool,
          subject: teacherFormSubject,
          mobileNumber: teacherFormPhone
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTeacherFormSuccess('Teacher details updated successfully!');
        loadTeachersList();
        setTimeout(() => {
          setShowTeacherModal(null);
          clearTeacherForm();
        }, 1500);
      } else {
        setTeacherFormError(data.error || 'Failed to update details.');
      }
    } catch (err: any) {
      setTeacherFormError(err.message || 'Server error.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherFormError('');
    setTeacherFormSuccess('');
    try {
      const res = await fetch(`${API_BASE}/management/teachers/${selectedTeacher.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: teacherFormPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTeacherFormSuccess('Password reset successfully!');
        setTimeout(() => {
          setShowTeacherModal(null);
          clearTeacherForm();
        }, 1500);
      } else {
        setTeacherFormError(data.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setTeacherFormError(err.message || 'Server error.');
    }
  };

  const handleToggleActive = async (teacher: any) => {
    try {
      const res = await fetch(`${API_BASE}/management/teachers/${teacher.id}/toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !teacher.isActive })
      });
      if (res.ok) {
        loadTeachersList();
      }
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
      const res = await fetch(`${API_BASE}/management/teachers/${teacherId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadTeachersList();
      }
    } catch (err) {
      console.error('Failed to delete teacher:', err);
    }
  };


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

      localStorage.setItem('bytequest_teacher_info', JSON.stringify(data.teacher));
      localStorage.setItem('bytequest_role', 'teacher');
      setTeacherInfo(data.teacher);
      setIsAuthenticated(true);
      onLoginStateChange?.(true);
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
      if (res.ok) {
        setQuestions(data.questions || []);
        setTotalQuestionsCount(data.totalCount || 0);
      }
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
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-slate-800 shadow-xl relative">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <Compass className="w-8 h-8 text-[var(--primary-color)] animate-spin-slow" />
            <h2 className="font-adventure text-3xl font-bold tracking-wide text-slate-900">Teacher Portal</h2>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5 tracking-wider">Teacher Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1.5 tracking-wider">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold text-sm"
                required
              />
            </div>

            {authError && (
              <div className="alert-error text-xs p-2.5 rounded-xl font-bold flex gap-1.5 items-center justify-center">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                <span>{authError}</span>
              </div>
            )}

            <div className="pt-2">
              <button 
                type="submit"
                className="w-full py-3.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl shadow-md transition-colors"
              >
                Log In
              </button>
            </div>
          </form>

          <button 
            onClick={onBack}
            className="w-full mt-4 py-1 text-center text-xs text-slate-500 font-bold hover:text-slate-800 transition-colors"
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
      {/* Mobile Sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Redesigned exact 9 tab items sidebar */}
      <aside className={`bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xl shrink-0 select-none transition-transform duration-300 z-50
        fixed top-0 bottom-0 left-0 w-72 max-w-[80vw] h-full rounded-r-2xl rounded-l-none border-y-0 border-l-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:w-64 md:h-auto md:rounded-2xl md:border
      `}>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Compass className="text-[var(--primary-color)] w-6 h-6" />
              <span className="font-adventure text-lg font-bold text-slate-900">Teacher Console</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 md:hidden transition-colors"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
              { id: 'classes', label: 'Classes', emoji: '🏫' },
              { id: 'students', label: 'Students', emoji: '👨‍🎓' },
              { id: 'questions', label: 'Questions', emoji: '📁' },
              { id: 'requests', label: `Join Requests ${joinRequests.length > 0 ? `(${joinRequests.length})` : ''}`, emoji: '🔔' },
              { id: 'leaderboard', label: 'Leaderboard', emoji: '🏆' },
              { id: 'reports', label: 'Reports', emoji: '📋' },
              { id: 'settings', label: 'Settings', emoji: '⚙️' },
              { id: 'profile', label: 'Profile', emoji: '👤' }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === t.id 
                    ? 'bg-[var(--primary-color)] text-white shadow-md shadow-[var(--primary-color)]/10' 
                    : 'text-slate-550 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2 px-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-[var(--primary-color)]" />
            <span className="truncate">{teacherInfo?.name || 'Teacher User'}</span>
          </div>
          <button 
            onClick={() => { 
              localStorage.removeItem('bytequest_teacher_info'); 
              localStorage.removeItem('bytequest_role'); 
              setIsAuthenticated(false); 
              onLoginStateChange?.(false);
              onBack(); 
            }}
            className="w-full flex items-center justify-between text-left px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--primary-subtle-text)] hover:bg-[var(--primary-subtle-bg)] transition-colors"
          >
            <span>Sign Out</span>
            <X className="w-4 h-4 text-[var(--primary-color)]" />
          </button>
        </div>
      </aside>

      {/* Main workspace section */}
      <section className="flex-1 min-h-[60vh] select-text">
        {/* TAB 1: TEACHER DASHBOARD CENTRAL SCREEN */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Actions Header Banner */}
            <div className="bg-[var(--primary-subtle-bg)] border-4 border-[var(--primary-color)] rounded-2xl p-8 shadow-[6px_6px_0px_var(--primary-dark)] relative overflow-hidden animate-scale-in">
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4 scale-150 text-[var(--primary-color)]">
                <Compass className="w-80 h-80 animate-spin-slow" />
              </div>
              <div className="relative z-10 space-y-4">
                <div>
                  <h2 className="font-adventure text-3xl md:text-4xl font-extrabold tracking-wide mb-1 leading-tight text-[var(--primary-dark)]">Welcome back, {teacherInfo?.name}!</h2>
                  <p className="text-[var(--primary-dark)]/80 text-xs md:text-sm font-semibold">Your ByteQuest classroom workspace portal. Access curriculum logs, configure teams, or host live play rooms.</p>
                </div>
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button 
                    onClick={() => setActiveTab('classes')}
                    className="px-4 py-2 bg-[var(--primary-dark)] text-white hover:bg-[var(--primary-color)] font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    🏫 Create Classroom
                  </button>
                  <button 
                    onClick={() => setActiveTab('classes')}
                    className="px-4 py-2 bg-[var(--primary-subtle-hover)] hover:bg-[var(--primary-subtle-border)] text-[var(--primary-subtle-text)] font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-[var(--primary-subtle-border)]"
                  >
                    🎲 Launch Live Match
                  </button>
                  <button 
                    onClick={() => setActiveTab('classes')}
                    className="px-4 py-2 bg-[var(--primary-subtle-hover)] hover:bg-[var(--primary-subtle-border)] text-[var(--primary-subtle-text)] font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-[var(--primary-subtle-border)]"
                  >
                    🔗 Invite Students
                  </button>
                  <button 
                    onClick={() => setActiveTab('teachers')}
                    className="px-4 py-2 bg-[var(--primary-subtle-hover)] hover:bg-[var(--primary-subtle-border)] text-[var(--primary-subtle-text)] font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-[var(--primary-subtle-border)]"
                  >
                    ➕ Create Teacher
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200 p-5 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Active Classes</span>
                  <span className="text-xl">🏫</span>
                </div>
                <span className="font-adventure text-3xl font-extrabold text-slate-900 leading-none">{classes.length}</span>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Enrolled</span>
                  <span className="text-xl">👥</span>
                </div>
                <span className="font-adventure text-3xl font-extrabold text-slate-900 leading-none">
                  {classes.reduce((acc, c) => acc + (c.students?.length || 0), 0)}
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Question Bank</span>
                  <span className="text-xl">📁</span>
                </div>
                <span className="font-adventure text-3xl font-extrabold text-slate-900 leading-none">
                  {totalQuestionsCount || questions.length}
                </span>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-[1.5rem] shadow-sm flex flex-col justify-between min-h-[110px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pending Invites</span>
                  <span className="text-xl">⚡</span>
                </div>
                <span className="font-adventure text-3xl font-extrabold text-slate-900 leading-none">{joinRequests.length}</span>
              </div>
            </div>

            {/* Pending Requests List Panel */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-adventure text-lg font-bold text-slate-900">Student Access Requests</h3>
                <span className="bg-[var(--primary-subtle-bg)] text-[var(--primary-color)] border border-cyan-95 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {joinRequests.length} Action Needed
                </span>
              </div>
              {joinRequests.length === 0 ? (
                <p className="text-slate-550 italic py-8 text-center text-xs font-semibold">No pending student join requests. Share your classroom codes to invite students!</p>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map(req => (
                    <div key={req.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm mb-0.5">{req.studentName}</h4>
                        <p className="text-slate-450 font-semibold">Wants to join: <span className="text-[var(--primary-color)]">{req.className}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleResolveJoinRequest(req.id, 'ACCEPT')}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm transition-colors"
                          title="Approve student"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleResolveJoinRequest(req.id, 'REJECT')}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-colors"
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

        {/* TAB: TEACHERS MANAGEMENT */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="bg-jungle-medium border border-jungle-light p-6 rounded-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-jungle-light pb-4 mb-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={handleGoBack}
                    className="mt-1 px-3 py-1.5 rounded-lg bg-[var(--primary-subtle-bg)] border border-[var(--primary-subtle-border)] hover:bg-[var(--primary-subtle-hover)] text-[var(--primary-dark)] font-bold text-xs uppercase font-adventure transition-all"
                  >
                    ← Back
                  </button>
                  <div>
                    <h3 className="font-adventure text-2xl font-bold text-[var(--primary-dark)]">Teacher Profiles Controller</h3>
                    <p className="text-slate-600 text-xs">Create, edit, enable/disable, reset passwords, or delete teacher accounts.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    clearTeacherForm();
                    setShowTeacherModal('create');
                  }}
                  className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-lg text-xs uppercase tracking-wide transition-colors"
                >
                  + Add Teacher
                </button>
              </div>

              {/* Table of teachers */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-jungle-light text-slate-700 font-bold">
                      <th className="py-2.5">Name</th>
                      <th className="py-2.5">Email</th>
                      <th className="py-2.5">Subject</th>
                      <th className="py-2.5">School</th>
                      <th className="py-2.5">Mobile</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachersList.map((t) => (
                      <tr key={t.id} className="border-b border-jungle-light/40 text-offwhite hover:bg-slate-50">
                        <td className="py-3 font-semibold">{t.firstName} {t.lastName}</td>
                        <td className="py-3 font-mono">{t.email}</td>
                        <td className="py-3">{t.subject || <span className="text-offwhite/40 italic">None</span>}</td>
                        <td className="py-3">{t.schoolName}</td>
                        <td className="py-3 font-mono">{t.mobileNumber || <span className="text-offwhite/40 italic">-</span>}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {t.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              clearTeacherForm();
                              setSelectedTeacher(t);
                              setTeacherFormEmail(t.email);
                              setTeacherFormFirstName(t.firstName);
                              setTeacherFormLastName(t.lastName);
                              setTeacherFormSchool(t.schoolName);
                              setTeacherFormSubject(t.subject);
                              setTeacherFormPhone(t.mobileNumber);
                              setShowTeacherModal('edit');
                            }}
                            className="px-2 py-1 bg-[var(--primary-subtle-bg)] hover:bg-[var(--primary-subtle-hover)] text-[var(--primary-subtle-text)] border border-[var(--primary-subtle-border)] rounded font-bold uppercase text-[9px] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(t)}
                            className={`px-2 py-1 rounded font-bold uppercase text-[9px] transition-colors ${
                              t.isActive ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {t.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => {
                              clearTeacherForm();
                              setSelectedTeacher(t);
                              setShowTeacherModal('reset-password');
                            }}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded font-bold uppercase text-[9px] transition-colors"
                          >
                            PW Reset
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(t.id)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold uppercase text-[9px] transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {teachersList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-offwhite/40 italic">No teachers found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal for Creating / Editing Teachers */}
            {showTeacherModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="parchment-panel text-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
                  <h3 className="font-adventure text-xl font-bold text-gold-dark mb-4 uppercase tracking-wide">
                    {showTeacherModal === 'create' && 'Create Teacher Account'}
                    {showTeacherModal === 'edit' && 'Edit Teacher Details'}
                    {showTeacherModal === 'reset-password' && 'Reset Teacher Password'}
                  </h3>

                  <form onSubmit={
                    showTeacherModal === 'create' ? handleCreateTeacher :
                    showTeacherModal === 'edit' ? handleEditTeacher :
                    handleResetPassword
                  } className="space-y-4">
                    {showTeacherModal !== 'reset-password' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">First Name</label>
                            <input
                              type="text"
                              value={teacherFormFirstName}
                              onChange={(e) => setTeacherFormFirstName(e.target.value)}
                              className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-gold font-semibold"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Last Name</label>
                            <input
                              type="text"
                              value={teacherFormLastName}
                              onChange={(e) => setTeacherFormLastName(e.target.value)}
                              className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-gold font-semibold"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email</label>
                          <input
                            type="email"
                            value={teacherFormEmail}
                            onChange={(e) => setTeacherFormEmail(e.target.value)}
                            className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-gold font-semibold"
                            required
                            disabled={showTeacherModal === 'edit'}
                          />
                        </div>

                        {showTeacherModal === 'create' && (
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Password</label>
                            <input
                              type="password"
                              value={teacherFormPassword}
                              onChange={(e) => setTeacherFormPassword(e.target.value)}
                              className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-gold font-semibold"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">School</label>
                          <input
                            type="text"
                            value={teacherFormSchool}
                            onChange={(e) => setTeacherFormSchool(e.target.value)}
                            className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-gold font-semibold"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Subject</label>
                            <input
                              type="text"
                              value={teacherFormSubject}
                              onChange={(e) => setTeacherFormSubject(e.target.value)}
                              className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-gold font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mobile Number</label>
                            <input
                              type="text"
                              value={teacherFormPhone}
                              onChange={(e) => setTeacherFormPhone(e.target.value)}
                              placeholder="e.g. 9876543210"
                              className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-gold font-semibold"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {showTeacherModal === 'reset-password' && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">New Password</label>
                        <input
                          type="password"
                          value={teacherFormPassword}
                          onChange={(e) => setTeacherFormPassword(e.target.value)}
                          className="w-full bg-parchment-light border border-gold-dark/40 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-gold font-semibold"
                          required
                        />
                      </div>
                    )}

                    {teacherFormError && (
                      <p className="text-[var(--primary-subtle-text)] text-xs font-semibold">{teacherFormError}</p>
                    )}
                    {teacherFormSuccess && (
                      <p className="text-emerald-600 text-xs font-semibold">{teacherFormSuccess}</p>
                    )}

                    <div className="flex gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTeacherModal(null);
                          clearTeacherForm();
                        }}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 rounded text-xs uppercase transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded text-xs uppercase shadow transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
                   {activeTab === 'classes' && (
          <div className="space-y-6">
            {/* Create Class Form */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                <button
                  onClick={handleGoBack}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs uppercase font-adventure transition-all"
                >
                  ← Back
                </button>
                <h3 className="font-adventure text-lg font-bold text-slate-900 font-adventure">Register New Class</h3>
              </div>
              <form onSubmit={handleCreateClass} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Classroom Name</label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Section</label>
                  <input
                    type="text"
                    value={newClassSection}
                    onChange={(e) => setNewClassSection(e.target.value)}
                    placeholder="e.g. A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Target Syllabus Grade</label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => {
                      const grade = Number(e.target.value);
                      setNewClassGrade(grade);
                      const validSubs = grade <= 10 
                        ? ['English', 'Tamil', 'Mathematics', 'Science', 'Social Science'] 
                        : ['English', 'Tamil', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'];
                      if (!validSubs.includes(newClassSubject)) {
                        setNewClassSubject(validSubs[0]);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold font-sans"
                  >
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                      <option key={g} value={g}>Class {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Subject</label>
                  <select
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold font-sans"
                  >
                    {(newClassGrade <= 10
                      ? ['English', 'Tamil', 'Mathematics', 'Science', 'Social Science']
                      : ['English', 'Tamil', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science']
                    ).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full py-3.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl shadow-md uppercase transition-colors">Create Class</button>
                </div>
              </form>
            </div>

            {/* Delete Confirmation Modal Overlay */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 text-center text-slate-800 shadow-2xl">
                  <AlertCircle className="w-16 h-16 text-[var(--primary-subtle-text)] mx-auto mb-3" />
                  <h3 className="font-adventure text-2xl font-bold mb-2 text-slate-900">Delete Classroom?</h3>
                  <p className="text-xs text-slate-500 mb-6 font-semibold">
                    Warning: Deleting this class will permanently remove all student rosters, student progress stats, team configurations, and assignment history.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleDeleteClass(showDeleteConfirm)}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-200 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List Classes */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl space-y-4">
              <h3 className="font-adventure text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Active & Archived Classes</h3>
              <div className="space-y-4">
                {classes.map(cls => (
                  <div key={cls.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        {editingClass?.id === cls.id ? (
                          <input 
                            type="text" 
                            value={editingClass.name}
                            onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                            onBlur={() => handleEditClassName(cls.id, editingClass.name)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEditClassName(cls.id, editingClass.name)}
                            className="bg-white border border-[var(--primary-color)] text-slate-800 p-2 rounded-xl text-sm font-bold focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-adventure text-lg font-bold text-slate-900">{cls.name} (Section {cls.section || 'A'})</span>
                            {cls.isArchived && <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] px-2.5 py-0.5 rounded-full uppercase font-bold">Archived</span>}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-600 font-bold block mt-1 uppercase tracking-wider">Syllabus Grade {cls.grade} | Subject: {cls.subject || 'Computer Science'} | {cls.students?.length || 0} Students | {cls.teams?.length || 0} Teams</span>
                        <div className="flex flex-wrap gap-4 mt-2 font-semibold">
                          <span className="text-xs text-slate-700 font-bold">Join Code: <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-[var(--primary-color)] font-extrabold select-all">{cls.joinCode || `BQ${cls.id.replace(/-/g, '').substring(0, 4).toUpperCase()}`}</span></span>
                          <span className="text-[10px] text-slate-600 font-bold">Class ID: <span className="font-mono select-all bg-white px-1.5 py-0.5 rounded border border-slate-200">{cls.id}</span></span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleDuplicateClass(cls.id)}
                          className="p-2 text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                          title="Duplicate Class"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingClass({ id: cls.id, name: cls.name })}
                          className="p-2 text-[var(--primary-color)] hover:bg-[var(--primary-subtle-bg)] rounded-xl transition-colors"
                          title="Rename Class"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleArchiveClass(cls.id, !cls.isArchived)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                          title={cls.isArchived ? "Unarchive Class" : "Archive Class"}
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(cls.id)}
                          className="p-2 text-[var(--primary-subtle-text)] hover:bg-[var(--primary-subtle-bg)] rounded-xl transition-colors"
                          title="Delete Class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {!cls.isArchived && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/60 text-xs font-semibold">
                        {/* Roster students additions */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-600 mb-1 uppercase text-[9px] tracking-wider">Add Students (newline separated)</h4>
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
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-800 text-xs h-18 resize-none focus:outline-none focus:border-[var(--primary-color)] font-bold"
                              required
                            />
                            <button type="submit" className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl transition-colors shadow-sm">Add to roster</button>
                          </form>
                        </div>

                        {/* Team configure option links */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-600 mb-1 uppercase text-[9px] tracking-wider">Configure Classroom Teams</h4>
                          <button 
                            onClick={() => {
                              const autoTeams = [
                                { name: 'Team Crimson', color: 'bg-red-600 text-white border-[var(--primary-subtle-border)]', studentIds: cls.students.slice(0, 3).map((s:any)=>s.id) },
                                { name: 'Team Cobalt', color: 'bg-[var(--primary-color)] text-white border-blue-300', studentIds: cls.students.slice(3, 6).map((s:any)=>s.id) },
                                { name: 'Team Jade', color: 'bg-[var(--primary-color)] text-white border-emerald-300', studentIds: cls.students.slice(6, 9).map((s:any)=>s.id) }
                              ];
                              handleConfigureTeams(cls.id, autoTeams);
                            }}
                            className="w-full py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all shadow-sm"
                          >
                            Quick Auto-Allocate Teams (Crimson/Cobalt/Jade)
                          </button>
                          
                          <button 
                            onClick={() => handleStartLobby(cls.id)}
                            disabled={cls.students.length === 0}
                            className="w-full py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white rounded-xl font-bold mt-2 disabled:opacity-50 transition-colors shadow-md text-xs uppercase"
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
              <div className="bg-white border border-slate-200 p-6 rounded-2xl mt-6 space-y-6 shadow-xl select-text">
                <h3 className="font-adventure text-2xl font-bold text-slate-900 border-b border-slate-100 pb-3">Active Classroom Room Lobby</h3>
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 border border-slate-200 p-5 rounded-2xl gap-4">
                  <div>
                    <span className="text-[10px] block text-slate-600 font-bold uppercase tracking-wider mb-1">Session Code</span>
                    <span className="font-adventure text-3xl font-extrabold text-[var(--primary-dark)] tracking-widest select-all">{activeSession.roomCode}</span>
                  </div>
                  <button 
                    onClick={handleTriggerStartMatch}
                    disabled={lobbyPlayers.length === 0}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-colors text-xs uppercase"
                  >
                    Start Classroom Match
                  </button>
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-slate-600 mb-3 uppercase tracking-wider">CONNECTED STUDENTS ({lobbyPlayers.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {lobbyPlayers.map((p: any) => (
                      <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-800 shadow-sm">
                        {p.name}
                      </div>
                    ))}
                    {lobbyPlayers.length === 0 && <p className="text-slate-550 italic py-4 col-span-4 text-center font-semibold">Waiting for students to join with Room Code...</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENTS MANAGEMENT PANEL */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGoBack}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs uppercase font-adventure transition-all"
                  >
                    ← Back
                  </button>
                  <h3 className="font-adventure text-lg font-bold text-slate-900">Student Profiles Controller</h3>
                </div>
                {selectedStudentClassId && (
                  <button
                    onClick={() => {
                      setShowAddStudentForm(!showAddStudentForm);
                      setAddStudentError('');
                      setAddStudentSuccess('');
                    }}
                    className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1 shadow-md"
                  >
                    {showAddStudentForm ? '✕ Close Form' : '➕ Add Student'}
                  </button>
                )}
              </div>
              
              <div className="max-w-md text-xs font-semibold">
                <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Select Class roster</label>
                <select
                  value={selectedStudentClassId}
                  onChange={(e) => {
                    handleSelectStudentClass(e.target.value);
                    setShowAddStudentForm(false);
                    setEditingStudentId(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold font-sans"
                >
                  <option value="">Choose Class...</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section ? `(Sec ${c.section})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Add student manually form */}
              {showAddStudentForm && selectedStudentClassId && (
                <form onSubmit={handleAddStudentSubmit} className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-xs font-semibold select-text">
                  <h4 className="font-adventure text-sm font-bold text-slate-900 border-b border-slate-200/55 pb-2">Register Student Manually</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="e.g. Aarav Sharma"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                        placeholder="e.g. aarav@student.com"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 tracking-wider">Temporary Password</label>
                      <input
                        type="text"
                        value={newStudentPassword}
                        onChange={(e) => setNewStudentPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 tracking-wider">Roll Number (Optional)</label>
                      <input
                        type="text"
                        value={newStudentRoll}
                        onChange={(e) => setNewStudentRoll(e.target.value)}
                        placeholder="e.g. 15"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                      />
                    </div>
                  </div>
                  {addStudentError && <p className="text-[var(--primary-subtle-text)] font-bold text-center text-[10px]">{addStudentError}</p>}
                  {addStudentSuccess && <p className="text-green-650 font-bold text-center text-[10px]">{addStudentSuccess}</p>}
                  <button type="submit" className="px-5 py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl uppercase text-[10px] tracking-wide transition-colors">Add Explorer</button>
                </form>
              )}
            </div>

            {selectedStudentClassId && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Students list */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
                  <h4 className="font-adventure text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Roster list</h4>
                  <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-2 text-xs">
                    {rosterStudents.map(student => (
                      <button
                        key={student.id}
                        onClick={() => {
                          handleLoadStudentStats(student.id);
                          setEditingStudentId(null);
                        }}
                        className={`w-full text-left p-3 rounded-xl border font-bold transition-all ${
                          selectedStudentProfile?.id === student.id 
                            ? 'bg-[var(--primary-subtle-bg)] border-[var(--primary-subtle-border)] text-[var(--primary-subtle-text)] shadow-sm' 
                            : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{student.name}</span>
                          {localStorage.getItem(`bytequest_student_roll_${student.id}`) && (
                            <span className="text-[9px] bg-white text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                              #{localStorage.getItem(`bytequest_student_roll_${student.id}`)}
                            </span>
                          )}
                        </div>
                        {student.isSuspended && <span className="block text-[8px] text-[var(--primary-color)] font-bold uppercase tracking-wider mt-0.5">(Suspended)</span>}
                      </button>
                    ))}
                    {rosterStudents.length === 0 && <p className="text-slate-550 italic py-6 text-center font-semibold">No students registered.</p>}
                  </div>
                </div>

                {/* Profile detail / edit card actions */}
                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
                  {selectedStudentProfile ? (
                    editingStudentId === selectedStudentProfile.id ? (
                      /* EDITING STUDENT MODE FORM */
                      <form onSubmit={handleEditStudentSubmit} className="space-y-4 text-xs font-semibold select-text">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <h4 className="font-adventure text-sm font-bold text-slate-900">Edit Student Profile</h4>
                          <button
                            type="button"
                            onClick={() => setEditingStudentId(null)}
                            className="text-[10px] text-slate-600 font-bold hover:text-slate-700 uppercase tracking-wider"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 tracking-wider">Full Name</label>
                            <input
                              type="text"
                              value={editStudentName}
                              onChange={(e) => setEditStudentName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 tracking-wider">Email Address</label>
                            <input
                              type="email"
                              value={editStudentEmail}
                              onChange={(e) => setEditStudentEmail(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 tracking-wider">Move to Class / Section</label>
                            <select
                              value={editStudentClassId}
                              onChange={(e) => setEditStudentClassId(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold font-sans"
                            >
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} {c.section ? `(Sec ${c.section})` : ''}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1 tracking-wider">Reset Password (Optional)</label>
                            <input
                              type="password"
                              value={editStudentPassword}
                              onChange={(e) => setEditStudentPassword(e.target.value)}
                              placeholder="Leave blank to keep current password"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold font-sans"
                            />
                          </div>
                        </div>
                        <button type="submit" className="w-full py-3.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl uppercase transition-colors shadow-md">Save Explorer Changes</button>
                      </form>
                    ) : (
                      /* STATISTICS VIEW MODE */
                      <div className="space-y-6 text-xs select-text">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <h4 className="font-adventure text-sm font-bold text-slate-900">Explorer Statistics</h4>
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Email: {selectedStudentProfile.email}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 font-bold">
                          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl shadow-sm">
                            <span className="text-[9px] block text-slate-600 uppercase tracking-wider mb-0.5">XP Score</span>
                            <span className="text-lg font-extrabold text-purple-600">{selectedStudentProfile.xp} XP</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl shadow-sm">
                            <span className="text-[9px] block text-slate-600 uppercase tracking-wider mb-0.5">Level</span>
                            <span className="text-lg font-extrabold text-[var(--primary-dark)]">Level {selectedStudentProfile.level}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl shadow-sm">
                            <span className="text-[9px] block text-slate-600 uppercase tracking-wider mb-0.5">Coins Gained</span>
                            <span className="text-lg font-extrabold text-amber-600">{selectedStudentProfile.coins} Coins</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl shadow-sm">
                            <span className="text-[9px] block text-slate-600 uppercase tracking-wider mb-0.5">Accuracy Rate</span>
                            <span className="text-lg font-extrabold text-green-600">{(selectedStudentProfile.accuracy * 100).toFixed(0)}%</span>
                          </div>
                        </div>

                        {/* Admin action buttons */}
                        <div className="border-t border-slate-100 pt-4 space-y-3 font-semibold">
                          <h4 className="font-bold text-slate-600 uppercase text-[9px] tracking-wider mb-1">Roster Controller Actions</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-bold text-center text-[10px]">
                            <button 
                              onClick={() => {
                                setEditingStudentId(selectedStudentProfile.id);
                                setEditStudentName(selectedStudentProfile.name);
                                setEditStudentEmail(selectedStudentProfile.email || '');
                                setEditStudentClassId(selectedStudentProfile.classId || selectedStudentClassId);
                                setEditStudentPassword('');
                              }}
                              className="py-2.5 bg-[var(--primary-subtle-bg)] hover:bg-[var(--primary-subtle-hover)] text-[var(--primary-subtle-text)] border border-[var(--primary-subtle-border)] rounded-xl transition-colors"
                            >
                              ✏️ Edit Info
                            </button>
                            {selectedStudentProfile.isSuspended ? (
                              <button 
                                onClick={() => handleSuspendStudent(selectedStudentProfile.id, false)}
                                className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors"
                              >
                                Unsuspend
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleSuspendStudent(selectedStudentProfile.id, true)}
                                className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition-colors"
                              >
                                Suspend Student
                              </button>
                            )}
                            <button 
                              onClick={() => handleResetStudentProgress(selectedStudentProfile.id)}
                              className="py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl transition-colors"
                            >
                              Reset Progress
                            </button>
                            <button 
                              onClick={() => handleRemoveStudent(selectedStudentProfile.id)}
                              className="py-2.5 bg-[var(--primary-subtle-bg)] hover:bg-[var(--primary-subtle-hover)] text-[var(--primary-subtle-text)] border border-[var(--primary-subtle-border)] rounded-xl transition-colors"
                            >
                              Remove Student
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="text-slate-550 italic py-12 text-center text-xs font-semibold">Choose a student profile from the roster list to check stats.</p>
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
            <div className="flex justify-between items-center bg-white border border-slate-200 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGoBack}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs uppercase font-adventure transition-all"
                >
                  ← Back
                </button>
                <div>
                  <h3 className="font-adventure text-lg font-bold text-slate-900 font-adventure">Curriculum Syllabus Pool</h3>
                  <span className="text-[10px] text-slate-600 font-bold block uppercase tracking-wider">Create MCQ entries or upload CSV questions</span>
                </div>
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
                  className="px-4 py-2.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl text-xs uppercase tracking-wide transition-colors"
                >
                  Create New Question
                </button>
                <button 
                  onClick={() => setShowCsvImport(!showCsvImport)}
                  className="px-4 py-2.5 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-600 font-bold rounded-xl text-xs uppercase tracking-wide transition-colors"
                >
                  CSV Import
                </button>
              </div>
            </div>

            {/* Editing Form */}
            {isEditingQuestion && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-xl text-slate-800 font-semibold select-text">
                <h3 className="font-adventure text-lg font-bold text-slate-900 border-b border-slate-150 pb-2 mb-4">
                  {isEditingQuestion.id ? '✏️ Edit Question' : '✨ Create New Question'}
                </h3>
                <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs select-text">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Grade</label>
                      <select
                        value={isEditingQuestion.grade || 11}
                        onChange={(e) => {
                          const grade = Number(e.target.value);
                          const validSubs = grade <= 10 
                            ? ['English', 'Tamil', 'Mathematics', 'Science', 'Social Science'] 
                            : ['English', 'Tamil', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'];
                          let sub = isEditingQuestion.subject || (grade <= 10 ? 'Mathematics' : 'Computer Science');
                          if (!validSubs.includes(sub)) {
                            sub = validSubs[0];
                          }
                          setIsEditingQuestion({ ...isEditingQuestion, grade, subject: sub });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold font-sans"
                      >
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                          <option key={g} value={g}>Class {g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Subject</label>
                      <select
                        value={isEditingQuestion.subject || ((isEditingQuestion.grade || 11) <= 10 ? 'Mathematics' : 'Computer Science')}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, subject: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold font-sans"
                      >
                        {(((isEditingQuestion.grade || 11) <= 10)
                          ? ['English', 'Tamil', 'Mathematics', 'Science', 'Social Science']
                          : ['English', 'Tamil', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science']
                        ).map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Topic</label>
                      <input
                        type="text"
                        value={isEditingQuestion.topic || ''}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, topic: e.target.value })}
                        placeholder="e.g. Loops"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Difficulty</label>
                      <select
                        value={isEditingQuestion.difficulty || 'medium'}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, difficulty: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold font-sans"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Question Text</label>
                    <textarea
                      value={isEditingQuestion.question || ''}
                      onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, question: e.target.value })}
                      placeholder="Enter the question text here..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 h-20 resize-none font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(isEditingQuestion.options || ['', '', '', '']).map((opt: string, idx: number) => (
                      <div key={idx}>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Option {idx + 1}</label>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...(isEditingQuestion.options || ['', '', '', ''])];
                            newOpts[idx] = e.target.value;
                            setIsEditingQuestion({ ...isEditingQuestion, options: newOpts });
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Correct Answer Index (1-4)</label>
                      <select
                        value={isEditingQuestion.correctIndex || 0}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, correctIndex: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold font-sans"
                      >
                        <option value={0}>Option 1</option>
                        <option value={1}>Option 2</option>
                        <option value={2}>Option 3</option>
                        <option value={3}>Option 4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Explanation</label>
                      <input
                        type="text"
                        value={isEditingQuestion.explanation || ''}
                        onChange={(e) => setIsEditingQuestion({ ...isEditingQuestion, explanation: e.target.value })}
                        placeholder="Explain the correct answer..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="px-5 py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl uppercase transition-colors shadow-md text-xs">
                      Save Question
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingQuestion(null)}
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl uppercase transition-colors text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* CSV Import card */}
            {showCsvImport && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl text-slate-800 font-semibold select-text">
                <h3 className="font-adventure text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Bulk Import MCQ (Semicolon separated)</h3>
                <p className="text-[10px] text-slate-600 font-bold mb-3 uppercase tracking-wider">Format: Grade;Topic;Difficulty;Question;Opt1;Opt2;Opt3;Opt4;CorrectIndex(0-3);Explanation</p>
                <form onSubmit={handleCsvImport} className="space-y-3">
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="11;Functions;medium;Define Python module;Script;Package;Library;Core;0;Modules are script files."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 h-32 resize-y font-mono focus:outline-none focus:border-[var(--primary-color)] font-bold"
                    required
                  />
                  {csvStatus && <p className="text-xs font-bold text-[var(--primary-color)]">{csvStatus}</p>}
                  <button type="submit" className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs uppercase shadow-md transition-colors">Upload CSV</button>
                </form>
              </div>
            )}

            {/* Questions list filter */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-xl text-slate-800">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-4 select-text">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full lg:w-80 shadow-sm">
                  <Search className="w-4 h-4 text-slate-600 mr-2" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search topic or question..."
                    className="bg-transparent text-xs text-slate-800 focus:outline-none w-full font-bold"
                  />
                </div>
                <div className="flex flex-wrap gap-3 font-semibold text-[10px]">
                  <div className="flex gap-1.5 border-r border-slate-100 pr-3">
                    {['all', '10', '11', '12'].map(g => (
                      <button
                        key={g}
                        onClick={() => setGradeFilter(g)}
                        className={`px-3 py-1.5 border rounded-lg font-bold uppercase transition-all ${
                          gradeFilter === g ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700'
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
                        className={`px-3 py-1.5 border rounded-lg font-bold uppercase transition-all ${
                          difficultyFilter === d ? 'bg-purple-650 border-purple-650 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {d === 'all' ? 'All Diff' : d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Display Question List */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs font-semibold select-text">
                {filteredQuestions.map(q => (
                  <div key={q.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative shadow-sm">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded-full font-bold uppercase mr-1.5 tracking-wide">{q.difficulty}</span>
                        <span className="text-slate-550 font-bold uppercase tracking-wider text-[9px]">Class {q.grade} | Topic: {q.topic}</span>
                        <p className="font-extrabold text-slate-900 text-sm mt-1 leading-relaxed">{q.question}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Student Preview"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => setIsEditingQuestion(q)}
                          className="p-1.5 text-[var(--primary-color)] hover:bg-[var(--primary-subtle-bg)] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateQuestion(q)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          📋
                        </button>
                        <button 
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-[var(--primary-subtle-text)] hover:bg-[var(--primary-subtle-bg)] rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px] font-semibold text-slate-700">
                      {q.options.map((opt: string, idx: number) => (
                        <div 
                          key={idx} 
                          className={`p-2.5 rounded-xl border font-bold ${
                            idx === q.correctIndex 
                              ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          {idx + 1}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredQuestions.length === 0 && <p className="text-slate-550 italic py-10 text-center font-bold">No questions found matching your search parameters.</p>}
              </div>
            </div>

            {/* Preview Question Modal Overlay */}
            {previewQuestion && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 text-slate-800 shadow-2xl relative">
                  <button
                    onClick={() => setPreviewQuestion(null)}
                    className="absolute top-4 right-4 text-slate-600 hover:text-slate-700 font-bold text-xs"
                  >
                    Close [X]
                  </button>
                  <h3 className="font-adventure text-2xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 font-adventure">
                    Student MCQ Preview
                  </h3>
                  <div className="space-y-4 text-xs font-bold font-sans">
                    <div className="flex gap-2">
                      <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-200 text-[10px] uppercase font-bold">
                        {previewQuestion.difficulty}
                      </span>
                      <span className="text-slate-550 text-[10px] font-bold uppercase tracking-wider">
                        Class {previewQuestion.grade}
                      </span>
                    </div>
                    <p className="text-base font-semibold leading-relaxed text-slate-900 font-sans">
                      {previewQuestion.question}
                    </p>
                    <div className="space-y-2">
                      {previewQuestion.options.map((opt: string, idx: number) => {
                        const isCorrect = idx === previewQuestion.correctIndex;
                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                              isCorrect
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span>
                              {String.fromCharCode(65 + idx)}. {opt}
                            </span>
                            {isCorrect && (
                              <span className="text-[9px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-extrabold uppercase">
                                Correct Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {previewQuestion.explanation && (
                      <div className="bg-amber-50 border border-amber-250 p-4 rounded-xl text-amber-900 text-xs font-semibold">
                        <strong className="block text-[10px] uppercase text-amber-800 font-bold tracking-wider mb-1">
                          Explanation:
                        </strong>
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
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                <button
                  onClick={handleGoBack}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs uppercase font-adventure transition-all"
                >
                  ← Back
                </button>
                <h3 className="font-adventure text-lg font-bold text-slate-900">Join Requests</h3>
              </div>
              <p className="text-xs text-slate-500 font-semibold mb-6">Review pending requests from students seeking to join your classrooms.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-text">
                {joinRequests.map((req: any) => (
                  <div key={req.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 relative flex flex-col justify-between text-xs font-semibold">
                    <div className="space-y-2 text-slate-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm block">{req.studentName}</span>
                          <span className="text-[10px] text-slate-600 font-bold block uppercase tracking-wider">Wants to join: {req.className}</span>
                          <span className="text-[10px] text-[var(--primary-color)] font-bold block">Grade Level: Class {req.studentGrade || 11}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold">{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-slate-200/60">
                      <button
                        onClick={() => handleResolveJoinRequest(req.id, 'ACCEPT')}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl uppercase transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleResolveJoinRequest(req.id, 'REJECT')}
                        className="flex-1 py-2 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl uppercase transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {joinRequests.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-600 font-bold text-sm italic">
                    🎉 No pending join requests. Everything is up to date!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CLASS LEADERBOARD STANDINGS */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-xl select-text">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-2">
              <button
                onClick={handleGoBack}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs uppercase font-adventure transition-all"
              >
                ← Back
              </button>
              <h3 className="font-adventure text-xl font-bold text-slate-900">Student Standings Leaderboard</h3>
            </div>
            <p className="text-slate-550 text-xs font-semibold">Overview rank standings compiled across classes</p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 text-xs font-semibold">
              {[
                { name: 'Aarav Gupta', xp: 480, coins: 45, className: 'Grade 11 - Section B' },
                { name: 'Kabir Patel', xp: 320, coins: 30, className: 'Grade 11 - Section B' },
                { name: 'Diya Sharma', xp: 250, coins: 15, className: 'Grade 11 - Section B' }
              ].sort((a,b)=>b.xp - a.xp).map((student, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-slate-800 font-semibold shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-bold font-mono text-sm">#{idx+1}</span>
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">{student.name}</span>
                      <span className="text-[10px] text-slate-600 font-bold block uppercase tracking-wider">Class: {student.className}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                    <span className="text-purple-600">⭐ {student.xp} XP</span>
                    <span className="text-amber-600">🪙 {student.coins} Coins</span>
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
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                <button
                  onClick={handleGoBack}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs uppercase font-adventure transition-all"
                >
                  ← Back
                </button>
                <h3 className="font-adventure text-lg font-bold text-slate-900">Completed Game Session Reports</h3>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 text-xs font-semibold">
                {pastReports.map(report => (
                  <button 
                    key={report.id}
                    onClick={() => fetchSessionReport(report.id)}
                    className="w-full text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 hover:border-slate-700 transition-all flex justify-between items-center shadow-sm"
                  >
                    <div>
                      <span className="text-[9px] uppercase font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full mr-2">Finished</span>
                      <span className="font-extrabold text-slate-900">Roster Code: {report.roomCode}</span>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-1.5">Classroom Grade: {report.className} | Date: {new Date(report.endedAt).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                ))}
                {pastReports.length === 0 && <p className="text-slate-550 italic py-10 text-center font-bold">No completed match sessions saved in database.</p>}
              </div>
            </div>

            {/* Student Progress & Activity Report */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-xl select-text">
              <h3 className="font-adventure text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Student Activity & Progress</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-text">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
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
                      <tr key={student.id} className="border-b border-slate-100 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-bold flex items-center gap-1.5 text-slate-900">
                          <span className={`w-2 h-2 rounded-full ${student.isSuspended ? 'bg-slate-300' : 'bg-green-500'}`} title={student.isSuspended ? 'Suspended' : 'Active'}></span>
                          <span>{student.name}</span>
                        </td>
                        <td className="py-3 text-slate-600 font-mono text-[11px]">{student.email || 'N/A'}</td>
                        <td className="py-3 text-center text-slate-800">{student.grade || 11}</td>
                        <td className="py-3 text-center text-purple-600">{student.xp}</td>
                        <td className="py-3 text-center text-amber-600">{student.coins}</td>
                        <td className="py-3 text-center text-[var(--primary-dark)]">Level {student.level}</td>
                        <td className="py-3 text-center font-mono font-bold text-green-700">{student.minutesPlayed || 0} min</td>
                      </tr>
                    ))}
                    {classes.flatMap(cls => cls.students || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-slate-550 italic py-6 text-center font-bold">No students registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Session details modal report */}
            {sessionReport && (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 relative shadow-xl select-text">
                <button 
                  onClick={() => setSessionReport(null)}
                  className="absolute top-4 right-4 text-slate-600 hover:text-slate-700 text-xs font-bold font-sans"
                >
                  Close Report [X]
                </button>
                <h3 className="font-adventure text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2">Session Summary Details</h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600 pt-2">
                  <div>Session ID: <span className="text-slate-900 font-extrabold">{sessionReport.session.id}</span></div>
                  <div>Classroom: <span className="text-slate-900 font-extrabold">{sessionReport.className}</span></div>
                  <div>Room Code: <span className="text-slate-900 font-extrabold">{sessionReport.session.roomCode}</span></div>
                  <div>Ended At: <span className="text-slate-900 font-extrabold">{new Date(sessionReport.session.endedAt).toLocaleString()}</span></div>
                </div>

                <div className="overflow-x-auto pr-2 text-xs pt-4 select-text">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5">Team Explorer</th>
                        <th className="py-2.5 text-center">Final Tile Position</th>
                        <th className="py-2.5 text-center font-bold">Answer Accuracy</th>
                        <th className="py-2.5 text-center">XP Earned</th>
                        <th className="py-2.5 text-center">Final Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionReport.results.map((r: any) => (
                        <tr key={r.id} className="border-b border-slate-100 text-slate-700 font-bold">
                          <td className="py-3 font-bold text-slate-900">{r.teamName || r.studentName}</td>
                          <td className="py-3 text-center">{r.position}</td>
                          <td className="py-3 text-center text-green-700 font-bold">{r.accuracy.toFixed(0)}%</td>
                          <td className="py-3 text-center text-purple-600">{r.xp}</td>
                          <td className="py-3 text-center font-adventure font-extrabold text-[var(--primary-dark)] text-sm">#{r.rank}</td>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-slate-800 max-w-md mx-auto space-y-6 shadow-xl select-text">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-2">
              <button
                onClick={handleGoBack}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs uppercase font-adventure transition-all"
              >
                ← Back
              </button>
              <h3 className="font-adventure text-2xl font-bold text-slate-900 font-adventure">Console Settings</h3>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500">Sidebar Theme Layout</span>
              <select
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-sans"
              >
                <option value="Dark Forest">Dark Forest (Jungle)</option>
                <option value="Parchment Light">Parchment Light</option>
              </select>
            </div>

            <div className="space-y-3 py-3 border-b border-slate-100 text-left">
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">ByteQuest Theme</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cyber-blue', name: 'Cyber Blue', emoji: '💙' },
                  { id: 'aurora', name: 'Aurora', emoji: '🩵' },
                  { id: 'rose', name: 'Rose', emoji: '💖' },
                  { id: 'emerald-tech', name: 'Emerald Tech', emoji: '💚' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      playBeep(440, 'sine', 0.05);
                      setTheme(t.id);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 text-[10px] font-extrabold font-adventure transition-all ${
                      theme === t.id
                        ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-inner scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500">Authentication Logs</span>
              <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">SSL Secured</span>
            </div>
            
            <div className="pt-2 text-center text-[10px] text-slate-600 font-bold uppercase tracking-wider">
              ByteQuest Teacher Dashboard controller console build version 1.0.0
            </div>
          </div>
        )}

        {/* TAB 9: PROFILE SUMMARY */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xl text-xs space-y-6 select-text">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGoBack}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-full text-xs uppercase font-adventure transition-all"
                >
                  ← Back
                </button>
                <h3 className="font-adventure text-xl font-bold text-slate-900 font-adventure">Teacher Profile Details</h3>
              </div>
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
                className="px-4 py-2 bg-[var(--primary-subtle-bg)] border border-cyan-95 text-[var(--primary-color)] text-xs font-bold rounded-full hover:bg-[var(--primary-subtle-hover)] transition-colors font-sans"
              >
                {editingProfile ? 'Cancel' : '✏️ Edit Profile'}
              </button>
            </div>

            {!editingProfile ? (
              <div className="space-y-6 text-slate-600 pt-2 font-semibold select-text">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-2">
                  <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-4xl overflow-hidden shadow-sm shrink-0">
                    {localStorage.getItem(`bytequest_teacher_pic_${teacherInfo.id}`) ? (
                      <img src={localStorage.getItem(`bytequest_teacher_pic_${teacherInfo.id}`)!} alt="profile" className="w-full h-full object-cover" />
                    ) : (
                      '👩‍🏫'
                    )}
                  </div>
                  <div>
                    <span className="text-2xl font-adventure font-extrabold text-slate-900 block leading-tight">{teacherInfo.name}</span>
                    <span className="bg-[var(--primary-subtle-bg)] text-[var(--primary-color)] border border-cyan-95 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mt-1">Certified Instructor</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 block uppercase font-bold tracking-wider mb-1">Full Name</span>
                    <span className="text-slate-955 font-extrabold text-sm">{teacherInfo.name}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 block uppercase font-bold tracking-wider mb-1">Registered Email</span>
                    <span className="text-slate-955 font-extrabold text-sm">{teacherInfo.email}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 block uppercase font-bold tracking-wider mb-1">School</span>
                    <span className="text-slate-955 font-extrabold text-sm">{teacherInfo.schoolName || 'Delhi Public School'}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 block uppercase font-bold tracking-wider mb-1">Subject</span>
                    <span className="text-slate-955 font-extrabold text-sm">{localStorage.getItem(`bytequest_teacher_subject_${teacherInfo.id}`) || 'Computer Science'}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 block uppercase font-bold tracking-wider mb-1">Phone</span>
                    <span className="text-slate-955 font-extrabold text-sm">{localStorage.getItem(`bytequest_teacher_phone_${teacherInfo.id}`) || '—'}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 block uppercase font-bold tracking-wider mb-1">Experience</span>
                    <span className="text-slate-955 font-extrabold text-sm">{localStorage.getItem(`bytequest_teacher_exp_${teacherInfo.id}`) ? `${localStorage.getItem(`bytequest_teacher_exp_${teacherInfo.id}`)} Years` : '—'}</span>
                  </div>
                  <div className="col-span-1 sm:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-600 block uppercase font-bold tracking-wider mb-1">Biography</span>
                    <p className="text-slate-700 font-medium mt-1 font-sans leading-relaxed">{localStorage.getItem(`bytequest_teacher_bio_${teacherInfo.id}`) || 'No biography entered yet.'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveTeacherProfile} className="space-y-4 text-xs font-semibold select-text">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">First Name</label>
                    <input
                      type="text"
                      value={profileFirstName}
                      onChange={(e) => setProfileFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">School</label>
                    <input
                      type="text"
                      value={profileSchool}
                      onChange={(e) => setProfileSchool(e.target.value)}
                      placeholder="School name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Subject</label>
                    <input
                      type="text"
                      value={profileSubject}
                      onChange={(e) => setProfileSubject(e.target.value)}
                      placeholder="Subject taught"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Phone</label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Experience (Yrs)</label>
                    <input
                      type="number"
                      value={profileExperience}
                      onChange={(e) => setProfileExperience(e.target.value)}
                      placeholder="Years"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Profile Photo</label>
                  <div className="flex items-center gap-3">
                    {profilePhoto && (
                      <img 
                        src={profilePhoto} 
                        alt="Profile Preview" 
                        className="w-12 h-12 rounded-full object-cover border border-slate-200"
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
                      className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Biography / Bio</label>
                  <textarea
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Tell your students about yourself..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-sans font-bold"
                  />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Change Password (optional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={profileCurrentPw}
                        onChange={(e) => setProfileCurrentPw(e.target.value)}
                        placeholder="Current password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">New Password</label>
                      <input
                        type="password"
                        value={profileNewPw}
                        onChange={(e) => setProfileNewPw(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[var(--primary-color)] font-bold"
                      />
                    </div>
                  </div>
                </div>

                {profileSaveError && (
                  <div className="bg-[var(--primary-subtle-bg)] text-[var(--primary-subtle-text)] text-xs p-2.5 rounded-xl border border-[var(--primary-subtle-border)] font-bold text-center">
                    {profileSaveError}
                  </div>
                )}
                {profileSaveStatus && (
                  <div className="bg-green-50 text-green-600 text-xs p-2.5 rounded-xl border border-green-200 font-bold text-center">
                    {profileSaveStatus}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl shadow-md uppercase transition-colors"
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
