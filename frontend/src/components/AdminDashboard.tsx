import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  Users, 
  Play, 
  Award, 
  BookOpen, 
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
  Copy,
  LogOut,
  Download,
  Menu,
  BookOpen as BookIcon,
  HelpCircle,
  Activity,
  Loader2
} from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
  socket: any;
  theme: string;
  setTheme: (t: string) => void;
  onLoginStateChange: (state: boolean) => void;
}

export default function AdminDashboard({
  onBack,
  socket,
  theme,
  setTheme,
  onLoginStateChange
}: AdminDashboardProps) {
  const baseApi = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
  const API_BASE = `${baseApi}/api/v1/admin`;

  // Local helper to fetch with auth token
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('bytequest_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers });
  };

  // State Management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'teachers' | 'students' | 'questions' | 'classes' | 'reports' | 'exports'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [viewingTeacherDetails, setViewingTeacherDetails] = useState<any>(null);
  const [stats, setStats] = useState({
    teachersCount: 0,
    studentsCount: 0,
    questionsCount: 0,
    classesCount: 0,
    activeSessionsCount: 0
  });

  const [performance, setPerformance] = useState<any>({
    totalAttempted: 0,
    totalCorrect: 0,
    totalWrong: 0,
    accuracy: 0,
    totalXp: 0,
    totalCoins: 0,
    latestActivityDate: null,
    activityDistribution: {
      ONLINE_GAME: 0,
      OFFLINE_GAME: 0,
      DAILY_CHALLENGE: 0,
      PRACTICE_QUIZ: 0
    }
  });

  const [leaderboards, setLeaderboards] = useState<any>({
    overall: [],
    class4: [], class5: [], class6: [], class7: [], class8: [], class9: [],
    class10: [], class11: [], class12: []
  });

  const [leaderboard1Grade, setLeaderboard1Grade] = useState<string>('overall');
  const [leaderboard2Grade, setLeaderboard2Grade] = useState<string>('class10');
  const [leaderboard3Grade, setLeaderboard3Grade] = useState<string>('class12');

  // Data lists
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);

  // Search/Filters
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [studentSortKey, setStudentSortKey] = useState<'rank' | 'xp-asc' | 'xp-desc' | 'coins-asc' | 'coins-desc'>('rank');
  const [studentGradeFilter, setStudentGradeFilter] = useState<'all' | '10' | '11' | '12'>('all');

  // New Question Filters & Selections
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [showSyllabusTree, setShowSyllabusTree] = useState<boolean>(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [bulkEditForm, setBulkEditForm] = useState({
    grade: '', subject: '', difficulty: '', topic: ''
  });

  // Modals state
  const [showModal, setShowModal] = useState<any>(null);

  // Selected item reference
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Form Fields
  const [teacherForm, setTeacherForm] = useState({
    email: '', password: '', firstName: '', lastName: '', schoolName: '', subject: '', mobileNumber: ''
  });
  const [studentForm, setStudentForm] = useState({
    name: '', email: '', classId: '', password: ''
  });
  const [questionForm, setQuestionForm] = useState({
    grade: '11', subject: 'Computer Science', topic: '', difficulty: 'medium', questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctIndex: 0, explanation: ''
  });
  const [classForm, setClassForm] = useState({
    teacherId: '', name: '', grade: '11', section: 'A', subject: 'Computer Science'
  });

  const [resetPasswordText, setResetPasswordText] = useState('');
  const [csvText, setCsvText] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [downloadingSystem, setDownloadingSystem] = useState(false);
  const [downloadingMarks, setDownloadingMarks] = useState(false);
  const [downloadingQuestions, setDownloadingQuestions] = useState(false);
  const [exportGrade, setExportGrade] = useState<string>('all');
  const [exportSubject, setExportSubject] = useState<string>('all');

  // ------------------------------------------
  // EFFECTS & DATA LOADERS
  // ------------------------------------------
  useEffect(() => {
    loadStats();
    loadTeachers();
    loadStudents();
    loadQuestions();
    loadClasses();
    loadReports();
  }, []);

  const loadStats = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/dashboard-stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        if (data.performance) setPerformance(data.performance);
        if (data.leaderboards) setLeaderboards(data.leaderboards);
      }
    } catch (e) { console.error(e); }
  };

  const loadTeachers = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/management/teachers`);
      if (res.ok) {
        const data = await res.json();
        setTeachersList(data.teachers);
      }
    } catch (e) { console.error(e); }
  };

  const loadStudents = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudentsList(data.students);
      }
    } catch (e) { console.error(e); }
  };

  const loadQuestions = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/questions`);
      if (res.ok) {
        const data = await res.json();
        setQuestionsList(data.questions);
      }
    } catch (e) { console.error(e); }
  };

  const loadClasses = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/classes`);
      if (res.ok) {
        const data = await res.json();
        setClassesList(data.classes);
      }
    } catch (e) { console.error(e); }
  };

  const loadReports = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/reports`);
      if (res.ok) {
        const data = await res.json();
        setReportsList(data.reports);
      }
    } catch (e) { console.error(e); }
  };

  const showToast = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 4000);
    } else {
      setInfoMessage(msg);
      setTimeout(() => setInfoMessage(''), 4000);
    }
  };

  // ------------------------------------------
  // ACTIONS / CALLS
  // ------------------------------------------

  // TEACHER CRUD
  const handleTeacherCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/management/teachers`, {
        method: 'POST',
        body: JSON.stringify(teacherForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Teacher account created successfully!');
        setShowModal(null);
        loadTeachers();
        loadStats();
      } else {
        showToast(data.error || 'Failed to create teacher', true);
      }
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/management/teachers/${selectedTeacher.id}`, {
        method: 'PUT',
        body: JSON.stringify(teacherForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Teacher details updated!');
        setShowModal(null);
        loadTeachers();
      } else {
        showToast(data.error || 'Update failed', true);
      }
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherToggleActive = async (teacher: any) => {
    try {
      const res = await apiFetch(`${API_BASE}/management/teachers/${teacher.id}/toggle-active`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(`Teacher status updated: ${data.isActive ? 'Active' : 'Inactive'}`);
        loadTeachers();
      }
    } catch (e) { console.error(e); }
  };

  const handleTeacherResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !resetPasswordText) return;
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/management/teachers/${selectedTeacher.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: resetPasswordText })
      });
      if (res.ok) {
        showToast('Password reset completed!');
        setShowModal(null);
        setResetPasswordText('');
      } else {
        const data = await res.json();
        showToast(data.error || 'Password reset failed', true);
      }
    } catch (e: any) {
      showToast(e.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher? All records remain saved but marked deleted.')) return;
    try {
      const res = await apiFetch(`${API_BASE}/management/teachers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Teacher deleted.');
        loadTeachers();
        loadStats();
      }
    } catch (e) { console.error(e); }
  };

  // STUDENT CRUD
  const handleStudentCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/students`, {
        method: 'POST',
        body: JSON.stringify(studentForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Student account created successfully!');
        setShowModal(null);
        loadStudents();
        loadStats();
      } else {
        showToast(data.error || 'Failed to create student', true);
      }
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/students/${selectedStudent.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          firstName: studentForm.name.split(' ')[0] || 'Student',
          lastName: studentForm.name.split(' ').slice(1).join(' ') || '',
          email: studentForm.email,
          classId: studentForm.classId
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Student details updated!');
        setShowModal(null);
        loadStudents();
      } else {
        showToast(data.error || 'Update failed', true);
      }
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggleSuspend = async (student: any) => {
    try {
      const action = student.isSuspended ? 'unsuspend' : 'suspend';
      const res = await apiFetch(`${API_BASE}/students/${student.id}/${action}`, { method: 'POST' });
      if (res.ok) {
        showToast(`Student ${action}ed successfully.`);
        loadStudents();
      }
    } catch (e) { console.error(e); }
  };

  const handleStudentReset = async (id: string) => {
    if (!confirm('Are you sure you want to reset this student coins, level, and XP stats?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/students/${id}/reset`, { method: 'POST' });
      if (res.ok) {
        showToast('Student progress reset.');
        loadStudents();
      }
    } catch (e) { console.error(e); }
  };

  const handleStudentDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Student deleted.');
        loadStudents();
        loadStats();
      }
    } catch (e) { console.error(e); }
  };

  // QUESTIONS CRUD
  const handleQuestionCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const isNew = showModal === 'question_create';
      const url = isNew ? `${API_BASE}/questions` : `${API_BASE}/questions/${selectedQuestion.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const payload = {
        grade: Number(questionForm.grade),
        subject: questionForm.subject,
        topic: questionForm.topic,
        difficulty: questionForm.difficulty,
        question: questionForm.questionText,
        options: [questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD].filter(Boolean),
        correctIndex: Number(questionForm.correctIndex),
        explanation: questionForm.explanation
      };

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(isNew ? 'Question created!' : 'Question updated!');
        setShowModal(null);
        loadQuestions();
        loadStats();
      } else {
        showToast(data.error || 'Operation failed', true);
      }
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/questions/bulk-edit`, {
        method: 'POST',
        body: JSON.stringify({
          ids: Array.from(selectedQuestionIds),
          fields: bulkEditForm
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully bulk edited ${selectedQuestionIds.size} questions!`);
        setShowModal(null);
        setSelectedQuestionIds(new Set());
        loadQuestions();
        loadStats();
      } else {
        showToast(data.error || 'Bulk edit failed', true);
      }
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedQuestionIds.size;
    if (!confirm(`Are you sure you want to delete all ${count} selected questions?`)) return;
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/questions/bulk-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedQuestionIds) })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Successfully bulk deleted ${count} questions`);
        setSelectedQuestionIds(new Set());
        loadQuestions();
        loadStats();
      } else {
        showToast(data.error || 'Bulk delete failed', true);
      }
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/questions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Question deleted.');
        loadQuestions();
        loadStats();
      }
    } catch (e) { console.error(e); }
  };

  const handleQuestionDuplicate = async (id: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/questions/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        showToast('Question duplicated.');
        loadQuestions();
        loadStats();
      }
    } catch (e) { console.error(e); }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText) return;
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/questions/import`, {
        method: 'POST',
        body: JSON.stringify({ csvText })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Imported ${data.count} questions successfully!`);
        setShowModal(null);
        setCsvText('');
        loadQuestions();
        loadStats();
      } else {
        showToast(data.error || 'Failed to import CSV', true);
      }
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // CLASSES CRUD
  const handleClassCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const isNew = showModal === 'class_create';
      const url = isNew ? `${API_BASE}/classes` : `${API_BASE}/classes/${selectedClass.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(classForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(isNew ? 'Class created!' : 'Class details updated!');
        setShowModal(null);
        loadClasses();
        loadStats();
      } else {
        showToast(data.error || 'Operation failed', true);
      }
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleClassDuplicate = async (classId: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/classes/${classId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        showToast('Class and roster copied!');
        loadClasses();
      }
    } catch (e) { console.error(e); }
  };

  const handleClassDelete = async (classId: string) => {
    if (!confirm('Delete this class? All students associated will be unassigned.')) return;
    try {
      const res = await apiFetch(`${API_BASE}/classes/${classId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Class deleted.');
        loadClasses();
        loadStats();
      }
    } catch (e) { console.error(e); }
  };

  // EXPORT HANDLERS (EXCEL DOWNLOADS)
  const handleDownloadMarks = async () => {
    if (downloadingMarks) return;
    setDownloadingMarks(true);
    try {
      showToast('Preparing Marks Excel Report...');
      const token = localStorage.getItem('bytequest_token');
      const res = await fetch(`${API_BASE}/export/marks`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        let errorReason = 'Download failed';
        try {
          const errData = await res.json();
          errorReason = errData.error || errorReason;
        } catch (_) {}
        throw new Error(errorReason);
      }
      const rawBlob = await res.blob();
      if (!rawBlob || rawBlob.size === 0) {
        throw new Error('Generated spreadsheet is empty');
      }

      const blob = new Blob([rawBlob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const filename = `ByteQuest_Marks_${new Date().toISOString().split('T')[0]}.xlsx`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);

      try {
        a.click();
      } catch (clickErr) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const fallbackA = document.createElement('a');
          fallbackA.href = dataUrl;
          fallbackA.download = filename;
          fallbackA.style.display = 'none';
          document.body.appendChild(fallbackA);
          fallbackA.click();
          setTimeout(() => {
            if (document.body.contains(fallbackA)) {
              document.body.removeChild(fallbackA);
            }
          }, 2000);
        };
        reader.readAsDataURL(blob);
      }

      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 2000);

      showToast('Download ready. Marks Report downloaded successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to download marks', true);
    } finally {
      setDownloadingMarks(false);
    }
  };

  const handleDownloadSystemData = async () => {
    if (downloadingSystem) return;
    setDownloadingSystem(true);
    try {
      showToast('Preparing System Data Export...');
      const token = localStorage.getItem('bytequest_token');
      const res = await fetch(`${API_BASE}/export/system`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        let errorReason = 'Download failed';
        try {
          const errData = await res.json();
          errorReason = errData.error || errorReason;
        } catch (_) {}
        throw new Error(errorReason);
      }
      const rawBlob = await res.blob();
      if (!rawBlob || rawBlob.size === 0) {
        throw new Error('Generated spreadsheet is empty');
      }

      const blob = new Blob([rawBlob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const filename = `ByteQuest_System_Output_${new Date().toISOString().split('T')[0]}.xlsx`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);

      try {
        a.click();
      } catch (clickErr) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const fallbackA = document.createElement('a');
          fallbackA.href = dataUrl;
          fallbackA.download = filename;
          fallbackA.style.display = 'none';
          document.body.appendChild(fallbackA);
          fallbackA.click();
          setTimeout(() => {
            if (document.body.contains(fallbackA)) {
              document.body.removeChild(fallbackA);
            }
          }, 2000);
        };
        reader.readAsDataURL(blob);
      }

      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 2000);

      showToast('Download ready. System Data downloaded successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to download system output', true);
    } finally {
      setDownloadingSystem(false);
    }
  };

  const handleDownloadQuestions = async () => {
    if (downloadingQuestions) return;
    setDownloadingQuestions(true);
    try {
      showToast('Preparing Filtered Questions spreadsheet...');
      const token = localStorage.getItem('bytequest_token');
      const res = await fetch(`${API_BASE}/export/questions?grade=${exportGrade}&subject=${encodeURIComponent(exportSubject)}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        let errorReason = 'Download failed';
        try {
          const errData = await res.json();
          errorReason = errData.error || errorReason;
        } catch (_) {}
        throw new Error(errorReason);
      }
      const rawBlob = await res.blob();
      if (!rawBlob || rawBlob.size === 0) {
        throw new Error('Generated spreadsheet is empty');
      }

      const blob = new Blob([rawBlob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const filename = `ByteQuest_Questions_${exportGrade}_${exportSubject}.xlsx`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);

      try {
        a.click();
      } catch (clickErr) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const fallbackA = document.createElement('a');
          fallbackA.href = dataUrl;
          fallbackA.download = filename;
          fallbackA.style.display = 'none';
          document.body.appendChild(fallbackA);
          fallbackA.click();
          setTimeout(() => {
            if (document.body.contains(fallbackA)) {
              document.body.removeChild(fallbackA);
            }
          }, 2000);
        };
        reader.readAsDataURL(blob);
      }

      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      }, 2000);

      showToast('Download ready. Questions downloaded successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to download questions export', true);
    } finally {
      setDownloadingQuestions(false);
    }
  };

  const handleLogOut = () => {
    localStorage.removeItem('bytequest_admin_info');
    localStorage.removeItem('bytequest_role');
    localStorage.removeItem('bytequest_token');
    onLoginStateChange(false);
    onBack();
    window.location.reload();
  };

  // ------------------------------------------
  // HELPERS FOR MODAL LOADING
  // ------------------------------------------
  const openTeacherEdit = (t: any) => {
    setSelectedTeacher(t);
    setTeacherForm({
      email: t.email,
      password: '', // leave empty to avoid password editing unless reset
      firstName: t.firstName,
      lastName: t.lastName,
      schoolName: t.schoolName,
      subject: t.subject,
      mobileNumber: t.mobileNumber
    });
    setShowModal('teacher_edit');
  };

  const openStudentEdit = (s: any) => {
    setSelectedStudent(s);
    setStudentForm({
      name: `${s.firstName} ${s.lastName}`.trim(),
      email: s.email,
      classId: s.classId || '',
      password: ''
    });
    setShowModal('student_edit');
  };

  const openQuestionEdit = (q: any) => {
    setSelectedQuestion(q);
    setQuestionForm({
      grade: String(q.classLevel),
      subject: q.subject || 'Computer Science',
      topic: q.topic,
      difficulty: q.difficulty.toLowerCase(),
      questionText: q.questionText,
      optionA: q.options[0] || '',
      optionB: q.options[1] || '',
      optionC: q.options[2] || '',
      optionD: q.options[3] || '',
      correctIndex: q.options.indexOf(q.correctAnswer) !== -1 ? q.options.indexOf(q.correctAnswer) : 0,
      explanation: q.explanation
    });
    setShowModal('question_edit');
  };

  const openClassEdit = (c: any) => {
    setSelectedClass(c);
    setClassForm({
      teacherId: c.teacherId,
      name: c.name,
      grade: String(c.grade),
      section: c.section,
      subject: c.subject
    });
    setShowModal('class_edit');
  };

  const openReportView = async (sessionId: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/sessions/${sessionId}/report`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data);
        setShowModal('view_report');
      }
    } catch (e) { console.error(e); }
  };

  // Filter lists
  const filteredTeachers = teachersList.filter(t => 
    `${t.firstName} ${t.lastName} ${t.email} ${t.subject} ${t.schoolName}`.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const getProcessedStudents = () => {
    let list = studentsList.filter(s => 
      `${s.firstName} ${s.lastName} ${s.email} ${s.schoolName} ${s.className}`.toLowerCase().includes(studentSearch.toLowerCase())
    );

    if (studentGradeFilter !== 'all') {
      list = list.filter(s => String(s.grade) === studentGradeFilter);
    }

    list.sort((a, b) => {
      if (studentSortKey === 'rank') {
        return a.rank - b.rank;
      } else if (studentSortKey === 'xp-asc') {
        return a.xp - b.xp;
      } else if (studentSortKey === 'xp-desc') {
        return b.xp - a.xp;
      } else if (studentSortKey === 'coins-asc') {
        return a.coins - b.coins;
      } else if (studentSortKey === 'coins-desc') {
        return b.coins - a.coins;
      }
      return 0;
    });

    return list;
  };

  const filteredStudents = getProcessedStudents();

  const filteredQuestions = useMemo(() => {
    return questionsList.filter(q => {
      // Search query match
      const search = questionSearch.toLowerCase();
      const matchesSearch = !search || 
        `${q.topic} ${q.questionText} ${q.difficulty} ${q.explanation} ${q.id}`.toLowerCase().includes(search);

      // Class match
      const matchesClass = filterClass === 'all' || q.classLevel === Number(filterClass);
      // Subject match
      const matchesSubject = filterSubject === 'all' || q.subject?.toLowerCase() === filterSubject.toLowerCase();
      // Topic match
      const matchesTopic = filterTopic === 'all' || q.topic === filterTopic;
      // Difficulty match
      const matchesDifficulty = filterDifficulty === 'all' || q.difficulty.toUpperCase() === filterDifficulty.toUpperCase();

      return matchesSearch && matchesClass && matchesSubject && matchesTopic && matchesDifficulty;
    });
  }, [questionsList, questionSearch, filterClass, filterSubject, filterTopic, filterDifficulty]);

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    questionsList.forEach(q => {
      const matchClass = filterClass === 'all' || q.classLevel === Number(filterClass);
      const matchSubject = filterSubject === 'all' || q.subject?.toLowerCase() === filterSubject.toLowerCase();
      if (matchClass && matchSubject && q.topic) {
        set.add(q.topic);
      }
    });
    return Array.from(set).sort();
  }, [questionsList, filterClass, filterSubject]);

  const syllabusData = useMemo(() => {
    const data: Record<number, Record<string, number>> = {};
    for (let grade = 4; grade <= 12; grade++) {
      const subjects = grade <= 10 
        ? ["English", "Tamil", "Mathematics", "Science", "Social Science"]
        : ["English", "Tamil", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science"];
      data[grade] = {};
      subjects.forEach(sub => {
        data[grade][sub] = 0;
      });
    }
    questionsList.forEach(q => {
      const grade = q.classLevel;
      const sub = q.subject;
      if (data[grade] && data[grade][sub] !== undefined) {
        data[grade][sub]++;
      }
    });
    return data;
  }, [questionsList]);

  const filteredClasses = classesList.filter(c => 
    `${c.name} ${c.section} ${c.subject} ${c.teacherName}`.toLowerCase().includes(classSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)] flex flex-col font-sans">
      {/* Toast Alert Popups */}
      {infoMessage && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold shadow-lg border border-emerald-400 animate-slide-in text-xs">
          {infoMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl bg-red-600 text-white font-bold shadow-lg border border-red-400 animate-slide-in text-xs">
          {errorMessage}
        </div>
      )}

      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Compass className="text-[var(--primary-color)] w-7 h-7" />
          <div>
            <h1 className="font-adventure text-xl font-bold text-slate-900 leading-tight uppercase tracking-wider">ByteQuest Admin</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Control Panel Console</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-extrabold text-slate-600 border border-slate-200 uppercase">
            ⚡ Administrator Clearance
          </span>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-2 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 active:scale-95 transition-all flex items-center justify-center shrink-0"
            title="System Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-slate-700 bg-slate-50 rounded-xl border border-slate-250 active:scale-95"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SIDEBAR NAVIGATION */}
        <aside className={`
          absolute inset-y-0 left-0 w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between z-30 transition-transform duration-250
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 shrink-0
        `}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-150 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="text-[var(--primary-color)] w-5 h-5" />
                <span className="font-adventure text-sm font-bold text-slate-800 tracking-wider">Admin Console</span>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 md:hidden transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {[
                { id: 'dashboard', label: 'Overview Metrics', emoji: '📊' },
                { id: 'teachers', label: 'Manage Teachers', emoji: '🧑‍🏫' },
                { id: 'students', label: 'Manage Students', emoji: '👨‍Grad' },
                { id: 'questions', label: 'Questions Bank', emoji: '📁' },
                { id: 'classes', label: 'Manage Classes', emoji: '🏫' },
                { id: 'reports', label: 'Session Reports', emoji: '📋' },
                { id: 'exports', label: 'Export Center', emoji: '📥' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                    activeTab === item.id 
                      ? 'bg-[var(--primary-color)] text-white shadow-md shadow-[var(--primary-color)]/10' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="text-sm shrink-0">{item.emoji === '👨‍Grad' ? '👨‍🎓' : item.emoji}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-150 space-y-2">
            <button
              onClick={handleLogOut}
              className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider font-adventure"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-scale-in">
              <div className="border border-slate-200 bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="font-adventure text-2xl font-bold text-slate-900 uppercase tracking-wide">Administrator Overview</h2>
                <p className="text-slate-600 text-xs mt-1">Full system-level metrics dashboard monitor.</p>
              </div>

              {/* STATS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { title: 'Registered Teachers', value: stats.teachersCount, emoji: '🧑‍🏫', bg: 'bg-blue-50 border-blue-200 text-blue-800' },
                  { title: 'Enrolled Students', value: stats.studentsCount, emoji: '👨‍🎓', bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                  { title: 'Questions Database', value: stats.questionsCount, emoji: '📁', bg: 'bg-amber-50 border-amber-200 text-amber-800' },
                  { title: 'Active Classes', value: stats.classesCount, emoji: '🏫', bg: 'bg-purple-50 border-purple-200 text-purple-800' },
                  { title: 'Active Live Rooms', value: stats.activeSessionsCount, emoji: '⚡', bg: 'bg-rose-50 border-rose-200 text-rose-800' }
                ].map((s, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border flex flex-col justify-between min-h-[110px] shadow-sm ${s.bg}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">{s.title}</span>
                      <span className="text-lg shrink-0">{s.emoji}</span>
                    </div>
                    <span className="text-3xl font-black font-adventure leading-none pt-2">{s.value}</span>
                  </div>
                ))}
              </div>

              {/* RECENT ACTIVITY & SYSTEM OPTIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QUICK DOWNLOADS PORTLET */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-adventure text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide">Export Console Data</h3>
                  <p className="text-slate-600 text-xs">Direct download controls for Excel reports. These buttons fetch latest marks and logs directly from the backend system databases.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    <button 
                      onClick={handleDownloadMarks}
                      className="p-4 bg-[var(--primary-subtle-bg)] hover:bg-[var(--primary-subtle-hover)] border border-[var(--primary-subtle-border)] rounded-2xl flex items-center gap-3 transition-all active:scale-98 text-left text-slate-800"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary-color)] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-adventure font-extrabold text-xs uppercase text-[var(--primary-color)]">Marks Sheet</p>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide">Classroom Scores Report</p>
                      </div>
                    </button>

                    <button 
                      onClick={handleDownloadSystemData}
                      className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded-2xl flex items-center gap-3 transition-all active:scale-98 text-left text-emerald-900"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-adventure font-extrabold text-xs uppercase text-emerald-700">System Data Export</p>
                        <p className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wide">All Data Sheets (.xlsx)</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* RAPID ACTIONS */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-adventure text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide">System Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <button 
                      onClick={() => setActiveTab('teachers')}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      🧑‍🏫 Setup Teacher
                    </button>
                    <button 
                      onClick={() => setActiveTab('students')}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      👨‍🎓 Setup Student
                    </button>
                    <button 
                      onClick={() => setActiveTab('questions')}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      📁 Question Editor
                    </button>
                    <button 
                      onClick={() => setActiveTab('classes')}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      🏫 Classes Board
                    </button>
                  </div>
                </div>
              </div>

              {/* STUDENT PERFORMANCE DATA */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-adventure text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide flex items-center gap-2">
                  <span>📈 Global Student Performance</span>
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Questions Attempted</p>
                    <p className="text-xl font-bold text-slate-800 font-adventure mt-1">{performance.totalAttempted}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-150 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Correct Answers</p>
                    <p className="text-xl font-bold text-emerald-700 font-adventure mt-1">✓ {performance.totalCorrect}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-150 text-center">
                    <p className="text-[10px] font-bold text-rose-600 uppercase">Wrong Answers</p>
                    <p className="text-xl font-bold text-rose-700 font-adventure mt-1">✕ {performance.totalWrong}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-150 text-center">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Accuracy Rate</p>
                    <p className="text-xl font-bold text-blue-700 font-adventure mt-1">{performance.accuracy}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-150 text-center">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Total XP Accumulation</p>
                    <p className="text-xl font-bold text-amber-700 font-adventure mt-1">⚡ {performance.totalXp}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-150 text-center">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">Total Rewards Distributed</p>
                    <p className="text-xl font-bold text-purple-700 font-adventure mt-1">🪙 {performance.totalCoins}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">Activity Distribution Attempts</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">🎮 Online Multiplayer Game</span>
                        <span className="font-bold text-slate-800">{performance.activityDistribution?.ONLINE_GAME || 0} answers</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">🎲 Offline Local Practice</span>
                        <span className="font-bold text-slate-800">{performance.activityDistribution?.OFFLINE_GAME || 0} answers</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">⚡ Daily Quest Challenge</span>
                        <span className="font-bold text-slate-800">{performance.activityDistribution?.DAILY_CHALLENGE || 0} answers</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">📖 Practice Topic Quizzes</span>
                        <span className="font-bold text-slate-800">{performance.activityDistribution?.PRACTICE_QUIZ || 0} answers</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">System Clock Status</h4>
                      <p className="text-xs text-slate-500 font-medium">Latest Student Activity logged in database:</p>
                      <p className="text-sm font-bold text-slate-800 mt-2 font-mono bg-white px-3 py-2 rounded-lg border border-slate-200">
                        {performance.latestActivityDate ? new Date(performance.latestActivityDate).toLocaleString() : 'No activity logged yet.'}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium italic mt-2">Database is synced in real-time. Any changes will immediately reflect here.</p>
                  </div>
                </div>
              </div>

              {/* OVERALL STUDENT RANKING LEADERBOARD */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-adventure text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide">
                  🏆 Overall Student Leaderboard
                </h3>
                {(!leaderboards.overall || leaderboards.overall.length === 0) ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                    No active student ranking data available.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full border border-slate-150 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase select-none">
                          <th className="p-3">Rank</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Grade</th>
                          <th className="p-3">Classroom</th>
                          <th className="p-3 text-right">XP</th>
                          <th className="p-3 text-right">Rewards (Coins)</th>
                          <th className="p-3 text-right">Attempted</th>
                          <th className="p-3 text-right">Correct</th>
                          <th className="p-3 text-right">Wrong</th>
                          <th className="p-3 text-right">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {leaderboards.overall.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 font-medium text-slate-800">
                            <td className="p-3 font-bold">{row.rank}</td>
                            <td className="p-3 font-adventure text-[10px] tracking-wide uppercase text-slate-900">{row.name}</td>
                            <td className="p-3">Grade {row.grade}</td>
                            <td className="p-3">{row.class}</td>
                            <td className="p-3 text-right font-bold text-amber-600">⚡ {row.xp}</td>
                            <td className="p-3 text-right font-bold text-purple-600">🪙 {row.coins}</td>
                            <td className="p-3 text-right">{row.attempted}</td>
                            <td className="p-3 text-right text-emerald-600 font-bold">{row.correct}</td>
                            <td className="p-3 text-right text-rose-600 font-bold">{row.wrong}</td>
                            <td className="p-3 text-right font-bold text-blue-600">{row.accuracy}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* GRADE-WISE TOP STUDENTS LEADERBOARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COLUMN 1 LEADERBOARD */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-adventure text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wide flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span>🏆</span>
                      <select
                        value={leaderboard1Grade}
                        onChange={(e) => setLeaderboard1Grade(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-[var(--primary-color)] font-sans"
                      >
                        <option value="overall">Overall Rankings</option>
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                          <option key={g} value={`class${g}`}>Class {g} Rankings</option>
                        ))}
                      </select>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 uppercase tracking-widest">TOP XP</span>
                  </h3>
                  
                  {(!leaderboards[leaderboard1Grade] || leaderboards[leaderboard1Grade].length === 0) ? (
                    <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                      No student records found.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {leaderboards[leaderboard1Grade].map((row: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl border border-slate-150 flex items-center justify-between text-xs hover:bg-slate-50 transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold shrink-0">{row.rank}</span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate font-adventure text-[9px] uppercase tracking-wide">{row.name}</p>
                              <p className="text-[9px] text-slate-400 font-semibold">{row.class}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-amber-600">⚡ {row.xp} XP</p>
                            <p className="text-[9px] text-slate-500 font-semibold">🪙 {row.coins} · Acc: {row.accuracy}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* COLUMN 2 LEADERBOARD */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-adventure text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wide flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span>🌴</span>
                      <select
                        value={leaderboard2Grade}
                        onChange={(e) => setLeaderboard2Grade(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-[var(--primary-color)] font-sans"
                      >
                        <option value="overall">Overall Rankings</option>
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                          <option key={g} value={`class${g}`}>Class {g} Rankings</option>
                        ))}
                      </select>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 uppercase tracking-widest">TOP XP</span>
                  </h3>
                  
                  {(!leaderboards[leaderboard2Grade] || leaderboards[leaderboard2Grade].length === 0) ? (
                    <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                      No student records found.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {leaderboards[leaderboard2Grade].map((row: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl border border-slate-150 flex items-center justify-between text-xs hover:bg-slate-50 transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold shrink-0">{row.rank}</span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate font-adventure text-[9px] uppercase tracking-wide">{row.name}</p>
                              <p className="text-[9px] text-slate-400 font-semibold">{row.class}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-amber-600">⚡ {row.xp} XP</p>
                            <p className="text-[9px] text-slate-500 font-semibold">🪙 {row.coins} · Acc: {row.accuracy}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* COLUMN 3 LEADERBOARD */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                  <h3 className="font-adventure text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wide flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span>🏰</span>
                      <select
                        value={leaderboard3Grade}
                        onChange={(e) => setLeaderboard3Grade(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-[var(--primary-color)] font-sans"
                      >
                        <option value="overall">Overall Rankings</option>
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                          <option key={g} value={`class${g}`}>Class {g} Rankings</option>
                        ))}
                      </select>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-800 uppercase tracking-widest">TOP XP</span>
                  </h3>
                  
                  {(!leaderboards[leaderboard3Grade] || leaderboards[leaderboard3Grade].length === 0) ? (
                    <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                      No student records found.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {leaderboards[leaderboard3Grade].map((row: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl border border-slate-150 flex items-center justify-between text-xs hover:bg-slate-50 transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold shrink-0">{row.rank}</span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate font-adventure text-[9px] uppercase tracking-wide">{row.name}</p>
                              <p className="text-[9px] text-slate-400 font-semibold">{row.class}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-amber-600">⚡ {row.xp} XP</p>
                            <p className="text-[9px] text-slate-500 font-semibold">🪙 {row.coins} · Acc: {row.accuracy}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-6 animate-scale-in">
              {viewingTeacherDetails ? (
                /* TEACHER DETAILS VIEW */
                <div className="space-y-6">
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <button 
                          onClick={() => setViewingTeacherDetails(null)}
                          className="mb-2 text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1"
                        >
                          ← Back to Teachers List
                        </button>
                        <h2 className="font-adventure text-2xl font-bold text-slate-900 uppercase tracking-wide">
                          Teacher Profile: {viewingTeacherDetails.name}
                        </h2>
                      </div>
                      <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                        viewingTeacherDetails.isActive 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                          : 'bg-slate-100 border-slate-300 text-slate-500'
                      }`}>
                        {viewingTeacherDetails.isActive ? 'Active Profile' : 'Inactive Profile'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans border-t border-slate-100 pt-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Email Address</p>
                        <p className="font-semibold text-slate-800">{viewingTeacherDetails.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Subject Area</p>
                        <p className="font-semibold text-slate-800">{viewingTeacherDetails.subject}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">School Campus</p>
                        <p className="font-semibold text-slate-800">{viewingTeacherDetails.schoolName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Mobile Number</p>
                        <p className="font-semibold text-slate-800">{viewingTeacherDetails.mobileNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* STUDENTS UNDER THIS TEACHER */}
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                    <h3 className="font-adventure text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide flex justify-between items-center">
                      <span>👨‍🎓 Students under this Teacher</span>
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 uppercase tracking-wider font-sans">
                        Count: {viewingTeacherDetails.students.length}
                      </span>
                    </h3>

                    {viewingTeacherDetails.students.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-semibold italic bg-slate-50 border border-slate-200 rounded-xl">
                        No students are currently assigned to classrooms managed by this teacher.
                      </div>
                    ) : (
                      <>
                        {/* Desktop View Table */}
                        <div className="hidden md:block overflow-x-auto w-full border border-slate-150 rounded-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase select-none">
                                <th className="p-3">Rank</th>
                                <th className="p-3">Student Name</th>
                                <th className="p-3">Classroom</th>
                                <th className="p-3 text-right">XP</th>
                                <th className="p-3 text-right">Coins</th>
                                <th className="p-3 text-right">Attempted</th>
                                <th className="p-3 text-right">Correct</th>
                                <th className="p-3 text-right">Wrong</th>
                                <th className="p-3 text-right">Accuracy</th>
                                <th className="p-3">Overall Rank</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150">
                              {viewingTeacherDetails.students.map((s: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50 font-medium text-slate-800">
                                  <td className="p-3 font-bold text-[var(--primary-color)]">{s.teacherRank}</td>
                                  <td className="p-3 font-adventure text-[10px] tracking-wide uppercase text-slate-900">{s.name}</td>
                                  <td className="p-3">{s.className}</td>
                                  <td className="p-3 text-right font-bold text-amber-600">⚡ {s.xp}</td>
                                  <td className="p-3 text-right font-bold text-purple-600">🪙 {s.coins}</td>
                                  <td className="p-3 text-right">{s.attempted}</td>
                                  <td className="p-3 text-right text-emerald-600 font-bold">{s.correct}</td>
                                  <td className="p-3 text-right text-rose-600 font-bold">{s.wrong}</td>
                                  <td className="p-3 text-right font-bold text-blue-600">{s.accuracy}%</td>
                                  <td className="p-3 font-semibold text-slate-500">Rank {s.overallRank}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="block md:hidden space-y-4">
                          {viewingTeacherDetails.students.map((s: any, idx: number) => (
                            <div key={idx} className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-sm text-[var(--primary-color)]">{s.teacherRank}</span>
                                  <span className="font-bold text-xs text-slate-800 font-adventure uppercase tracking-wide">{s.name}</span>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Overall: Rank {s.overallRank}</span>
                              </div>

                              <div className="text-[10px] text-slate-500 font-medium">
                                Classroom: {s.className} · Grade {s.grade}
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                <div className="bg-white border border-slate-150 p-2 rounded-lg">
                                  <p className="text-[8px] text-slate-400 uppercase">XP</p>
                                  <p className="font-bold text-amber-600">⚡ {s.xp}</p>
                                </div>
                                <div className="bg-white border border-slate-150 p-2 rounded-lg">
                                  <p className="text-[8px] text-slate-400 uppercase">Coins</p>
                                  <p className="font-bold text-purple-600">🪙 {s.coins}</p>
                                </div>
                                <div className="bg-white border border-slate-150 p-2 rounded-lg">
                                  <p className="text-[8px] text-slate-400 uppercase">Accuracy</p>
                                  <p className="font-bold text-blue-600">{s.accuracy}%</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] text-slate-550 border-t border-slate-150 pt-2 font-semibold">
                                <span>Answers: {s.attempted}</span>
                                <span className="text-emerald-600 font-bold">Correct: {s.correct}</span>
                                <span className="text-rose-600 font-bold">Wrong: {s.wrong}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* TEACHERS LIST VIEW */
                <>
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="font-adventure text-2xl font-bold text-slate-900 uppercase tracking-wide">Teacher Console Profiles</h2>
                      <p className="text-slate-600 text-xs">Manage active and inactive teacher accounts, assign schools, subjects, or reset passwords.</p>
                    </div>
                    <button
                      onClick={() => {
                        setTeacherForm({ email: '', password: '', firstName: '', lastName: '', schoolName: '', subject: '', mobileNumber: '' });
                        setShowModal('teacher_create');
                      }}
                      className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shrink-0"
                    >
                      + Add Teacher
                    </button>
                  </div>

                  {/* SEARCH FILTER */}
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search teachers by name, email, school, or subject..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-[var(--primary-color)] font-medium shadow-inner"
                    />
                  </div>

                  {/* TEACHERS LIST TABLE */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                            <th className="p-4">Name</th>
                            <th className="p-4">Email</th>
                            <th className="p-4 text-center">Students Count</th>
                            <th className="p-4">Subject</th>
                            <th className="p-4">School</th>
                            <th className="p-4">Mobile</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                          {filteredTeachers.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="p-4">
                                <button 
                                  onClick={() => setViewingTeacherDetails(t)}
                                  className="font-bold text-slate-900 hover:text-[var(--primary-color)] hover:underline text-left cursor-pointer"
                                  title="View Students under this Teacher"
                                >
                                  👨‍🏫 {t.firstName} {t.lastName}
                                </button>
                              </td>
                              <td className="p-4 font-semibold text-slate-650">{t.email}</td>
                              <td className="p-4 text-center">
                                <button 
                                  onClick={() => setViewingTeacherDetails(t)}
                                  className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                                  title="Click to view students details"
                                >
                                  {t.studentCount} students
                                </button>
                              </td>
                              <td className="p-4 font-medium text-slate-600">{t.subject || 'General'}</td>
                              <td className="p-4 font-medium text-slate-600">{t.schoolName}</td>
                              <td className="p-4 text-slate-500 font-semibold">{t.mobileNumber || 'N/A'}</td>
                              <td className="p-4">
                                <button
                                  onClick={() => handleTeacherToggleActive(t)}
                                  className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase border ${
                                    t.isActive 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                      : 'bg-slate-100 border-slate-350 text-slate-500'
                                  }`}
                                >
                                  {t.isActive ? 'Active ✓' : 'Inactive ✕'}
                                </button>
                              </td>
                              <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => openTeacherEdit(t)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-all inline-flex items-center justify-center"
                                  title="Edit Details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { setSelectedTeacher(t); setResetPasswordText(''); setShowModal('teacher_reset_pass'); }}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-200 transition-all inline-flex items-center justify-center"
                                  title="Reset Password"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleTeacherDelete(t.id)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-all inline-flex items-center justify-center"
                                  title="Delete Profile"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredTeachers.length === 0 && (
                            <tr>
                              <td colSpan={8} className="text-center py-8 text-slate-400 italic">No teachers found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-6 animate-scale-in">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-adventure text-2xl font-bold text-slate-900 uppercase tracking-wide">Student Profiles</h2>
                  <p className="text-slate-600 text-xs">View all registered student profiles, verify their levels, accumulated XP and coins, or manage account suspensions.</p>
                </div>
                <button
                  onClick={() => {
                    setStudentForm({ name: '', email: '', classId: classesList[0]?.id || '', password: '' });
                    setShowModal('student_create');
                  }}
                  className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shrink-0"
                >
                  + Add Student
                </button>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search students by name, email, class..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-[var(--primary-color)] font-medium shadow-inner"
                  />
                </div>
                <div>
                  <select 
                    value={studentGradeFilter} 
                    onChange={(e) => setStudentGradeFilter(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-[var(--primary-color)] font-semibold text-slate-700 shadow-sm"
                  >
                    <option value="all">All Grades</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>
                </div>
                <div>
                  <select 
                    value={studentSortKey} 
                    onChange={(e) => setStudentSortKey(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-[var(--primary-color)] font-semibold text-slate-700 shadow-sm"
                  >
                    <option value="rank">Overall Rank (XP Desc)</option>
                    <option value="xp-asc">XP (Ascending)</option>
                    <option value="xp-desc">XP (Descending)</option>
                    <option value="coins-asc">Rewards/Coins (Asc)</option>
                    <option value="coins-desc">Rewards/Coins (Desc)</option>
                  </select>
                </div>
              </div>

              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <th className="p-4">Rank</th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Class/Grade</th>
                        <th className="p-4">XP &amp; Level</th>
                        <th className="p-4 text-right">Coins</th>
                        <th className="p-4 text-right">Answered</th>
                        <th className="p-4 text-right">Correct</th>
                        <th className="p-4 text-right">Wrong</th>
                        <th className="p-4 text-right">Accuracy</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-800">#{s.rank}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{s.email}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-700">Grade {s.grade}</div>
                            <div className="text-[10px] text-slate-455 font-medium">{s.className}</div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-extrabold text-amber-600">Level {s.level}</div>
                            <div className="text-[10px] text-slate-400 font-bold">{s.xp} XP</div>
                          </td>
                          <td className="p-4 text-right font-bold text-purple-600">🪙 {s.coins}</td>
                          <td className="p-4 text-right font-semibold text-slate-700">{s.attempted}</td>
                          <td className="p-4 text-right font-bold text-emerald-600">{s.correct}</td>
                          <td className="p-4 text-right font-bold text-rose-600">{s.wrong}</td>
                          <td className="p-4 text-right font-extrabold text-blue-650">{s.accuracy}%</td>
                          <td className="p-4">
                            <button
                              onClick={() => handleStudentToggleSuspend(s)}
                              className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase border ${
                                s.isSuspended 
                                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              }`}
                            >
                              {s.isSuspended ? 'Suspended ✕' : 'Active ✓'}
                            </button>
                          </td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => openStudentEdit(s)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-all inline-flex items-center justify-center"
                              title="Edit Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStudentReset(s.id)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-200 transition-all inline-flex items-center justify-center"
                              title="Reset XP/Progress"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStudentDelete(s.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-all inline-flex items-center justify-center"
                              title="Delete Student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={11} className="text-center py-8 text-slate-400 italic">No students found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div className="block md:hidden space-y-4">
                {filteredStudents.map((s) => (
                  <div key={s.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">Rank {s.rank}</span>
                          <span className="font-extrabold text-slate-900 text-sm">{s.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{s.email}</p>
                      </div>
                      <button
                        onClick={() => handleStudentToggleSuspend(s)}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border ${
                          s.isSuspended 
                            ? 'bg-rose-50 border-rose-200 text-rose-700' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                      >
                        {s.isSuspended ? 'Suspended' : 'Active'}
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-2 flex flex-col gap-0.5">
                      <div>Grade {s.grade} · {s.className}</div>
                      <div className="text-[10px] text-slate-400">School: {s.schoolName}</div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-center">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Level</p>
                        <p className="text-xs font-bold text-amber-600">🛡️ {s.level}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">XP</p>
                        <p className="text-xs font-bold text-slate-800">⚡ {s.xp}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Coins</p>
                        <p className="text-xs font-bold text-purple-650">🪙 {s.coins}</p>
                      </div>
                    </div>

                    {/* Attempts Details */}
                    <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-center">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Attempted</p>
                        <p className="text-xs font-bold text-slate-700">{s.attempted}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Correct</p>
                        <p className="text-xs font-bold text-emerald-600">{s.correct}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Wrong</p>
                        <p className="text-xs font-bold text-rose-600">{s.wrong}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Accuracy</p>
                        <p className="text-xs font-bold text-blue-600">{s.accuracy}%</p>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => openStudentEdit(s)}
                        className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1"
                        title="Edit Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleStudentReset(s.id)}
                        className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1"
                        title="Reset XP/Progress"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                      <button
                        onClick={() => handleStudentDelete(s.id)}
                        className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1"
                        title="Delete Student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
                {filteredStudents.length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic bg-white border border-slate-200 rounded-2xl">No students found.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB: QUESTIONS */}
          {activeTab === 'questions' && (
            <div className="space-y-6 animate-scale-in">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-adventure text-2xl font-bold text-slate-900 uppercase tracking-wide">
                    Question Bank Repository ({questionsList.length} Questions)
                  </h2>
                  <p className="text-slate-600 text-xs">Manage the pedagogical computer science revision question bank, duplicate items, or import bulk database data from CSV.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setCsvText('');
                      setShowModal('csv_import');
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 border border-slate-350"
                  >
                    <Upload className="w-4 h-4" />
                    <span>CSV Import</span>
                  </button>
                  <button
                    onClick={() => {
                      setQuestionForm({ grade: '11', subject: 'Computer Science', topic: '', difficulty: 'medium', questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctIndex: 0, explanation: '' });
                      setShowModal('question_create');
                    }}
                    className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
                  >
                    + Add Question
                  </button>
                </div>
              </div>

              {/* SYLLABUS STATUS TREE */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                <div 
                  className="flex justify-between items-center cursor-pointer border-b border-slate-100 pb-2.5" 
                  onClick={() => setShowSyllabusTree(!showSyllabusTree)}
                >
                  <h3 className="font-adventure text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    📊 Complete Syllabus & Question Bank Status Tree
                  </h3>
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase">{showSyllabusTree ? 'Collapse ▲' : 'Expand ▼'}</span>
                </div>
                
                {showSyllabusTree && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {Object.keys(syllabusData).map((gradeStr) => {
                      const grade = Number(gradeStr);
                      const subjects = syllabusData[grade];
                      return (
                        <div key={grade} className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1.5 shadow-inner">
                          <div className="font-adventure text-[11px] font-extrabold text-[var(--primary-color)] border-b border-slate-200 pb-1 uppercase tracking-wide">
                            Class {grade} Syllabus
                          </div>
                          <div className="space-y-1 text-[10px] font-bold text-slate-650">
                            {Object.keys(subjects).map(sub => {
                              const count = subjects[sub];
                              const isComplete = count >= 25;
                              return (
                                <div key={sub} className="flex justify-between items-center">
                                  <span>{sub}</span>
                                  <span className={`px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5 ${isComplete ? 'bg-emerald-50 border border-emerald-250 text-emerald-700' : 'bg-amber-50 border border-amber-250 text-amber-700'}`}>
                                    {count}/25 {isComplete ? '✓' : '⚠'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DROPDOWN FILTERS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[9px] uppercase text-slate-400 font-extrabold mb-1">Class/Grade</label>
                  <select 
                    value={filterClass}
                    onChange={(e) => { setFilterClass(e.target.value); setFilterTopic('all'); }}
                    className="w-full bg-white border border-slate-250 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[var(--primary-color)]"
                  >
                    <option value="all">All Grades</option>
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                      <option key={g} value={String(g)}>Class {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase text-slate-400 font-extrabold mb-1">Subject</label>
                  <select 
                    value={filterSubject}
                    onChange={(e) => { setFilterSubject(e.target.value); setFilterTopic('all'); }}
                    className="w-full bg-white border border-slate-250 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[var(--primary-color)]"
                  >
                    <option value="all">All Subjects</option>
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Social Science">Social Science</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase text-slate-400 font-extrabold mb-1">Chapter/Topic</label>
                  <select 
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[var(--primary-color)]"
                  >
                    <option value="all">All Topics</option>
                    {availableTopics.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase text-slate-400 font-extrabold mb-1">Difficulty</label>
                  <select 
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-[var(--primary-color)]"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* SEARCH FILTER */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search questions by topic, content text, difficulty, etc..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-[var(--primary-color)] font-medium shadow-inner"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-extrabold uppercase px-1">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestionIds.has(q.id))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newSet = new Set(selectedQuestionIds);
                        filteredQuestions.forEach(q => {
                          if (checked) newSet.add(q.id);
                          else newSet.delete(q.id);
                        });
                        setSelectedQuestionIds(newSet);
                      }}
                      className="cursor-pointer rounded border-slate-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                    />
                    <span>Select All Showing ({filteredQuestions.length})</span>
                  </div>
                  {(questionSearch || filterClass !== 'all' || filterSubject !== 'all' || filterTopic !== 'all' || filterDifficulty !== 'all') ? (
                    <button 
                      onClick={() => {
                        setQuestionSearch('');
                        setFilterClass('all');
                        setFilterSubject('all');
                        setFilterTopic('all');
                        setFilterDifficulty('all');
                      }}
                      className="text-[var(--primary-color)] hover:underline animate-fade-in"
                    >
                      Clear All Filters
                    </button>
                  ) : null}
                </div>
              </div>

              {/* BULK ACTION BAR */}
              {selectedQuestionIds.size > 0 && (
                <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg border border-white/10 animate-scale-in text-xs">
                  <div className="font-bold flex items-center gap-2">
                    <span className="bg-[var(--primary-color)] text-white px-2 py-0.5 rounded-lg text-[10px] font-extrabold">
                      {selectedQuestionIds.size}
                    </span>
                    <span>Questions Selected for Bulk Actions</span>
                  </div>
                  <div className="flex gap-2 font-bold uppercase tracking-wider text-[10px]">
                    <button 
                      onClick={() => {
                        setBulkEditForm({ grade: '', subject: '', difficulty: '', topic: '' });
                        setShowModal('bulk_edit');
                      }}
                      className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all border border-indigo-500/30"
                    >
                      ✏️ Bulk Edit
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="px-3.5 py-2 bg-rose-650 hover:bg-rose-600 rounded-xl transition-all border border-rose-500/30"
                    >
                      🗑️ Bulk Delete
                    </button>
                    <button 
                      onClick={() => setSelectedQuestionIds(new Set())}
                      className="px-3.5 py-2 bg-slate-750 hover:bg-slate-700 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* QUESTIONS PANEL GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQuestions.map((q) => (
                  <div key={q.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={selectedQuestionIds.has(q.id)}
                            onChange={() => {
                              const newSet = new Set(selectedQuestionIds);
                              if (newSet.has(q.id)) newSet.delete(q.id);
                              else newSet.add(q.id);
                              setSelectedQuestionIds(newSet);
                            }}
                            className="cursor-pointer rounded border-slate-350 text-[var(--primary-color)] focus:ring-[var(--primary-color)] w-3.5 h-3.5"
                          />
                          <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
                            Grade {q.classLevel} • {q.subject} • {q.topic}
                          </span>
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                          q.difficulty === 'EASY' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                          q.difficulty === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs mb-4 leading-relaxed font-sans">{q.questionText}</p>
                      
                      <div className="space-y-1.5 pl-2 border-l-2 border-slate-100 mb-4">
                        {q.options.map((opt: string, idx: number) => {
                          const isCorrect = opt === q.correctAnswer;
                          return (
                            <div key={idx} className={`text-[11px] flex items-center gap-1.5 ${isCorrect ? 'text-emerald-700 font-extrabold' : 'text-slate-500 font-medium'}`}>
                              <span>{String.fromCharCode(65 + idx)}.</span>
                              <span>{opt} {isCorrect ? '✓' : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {q.explanation && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 text-[10px] text-slate-500 leading-normal mb-2 italic">
                          <strong>Explanatory Hint:</strong> {q.explanation}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100 mt-2">
                      <button
                        onClick={() => openQuestionEdit(q)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-extrabold text-blue-700 uppercase transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleQuestionDuplicate(q.id)}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-extrabold text-slate-700 uppercase transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleQuestionDelete(q.id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[10px] font-extrabold text-rose-700 uppercase transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {filteredQuestions.length === 0 && (
                  <div className="md:col-span-2 text-center py-10 bg-white border border-slate-200 rounded-2xl italic text-slate-400">
                    No questions found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CLASSES */}
          {activeTab === 'classes' && (
            <div className="space-y-6 animate-scale-in">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-adventure text-2xl font-bold text-slate-900 uppercase tracking-wide">Registered Classes Board</h2>
                  <p className="text-slate-600 text-xs">Create, duplicate, or delete academic classes and assign subjects/teachers.</p>
                </div>
                <button
                  onClick={() => {
                    setClassForm({ teacherId: teachersList[0]?.id || '', name: '', grade: '11', section: 'A', subject: 'Computer Science' });
                    setShowModal('class_create');
                  }}
                  className="px-4 py-2 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shrink-0"
                >
                  + Add Class
                </button>
              </div>

              {/* SEARCH FILTER */}
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search classes by name, subject, or assigned teacher..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-[var(--primary-color)] font-medium shadow-inner"
                />
              </div>

              {/* CLASSES LIST GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map((c) => (
                  <div key={c.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[140px]">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-adventure text-base font-bold text-[var(--primary-color)] uppercase tracking-wide">
                          {c.name} ({c.section})
                        </h3>
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-250 text-slate-600 text-[9px] font-extrabold uppercase rounded">
                          Grade {c.grade}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">{c.subject}</p>
                      
                      <div className="space-y-1 text-xs">
                        <div className="text-slate-600 font-medium">Teacher: <strong className="text-slate-800">{c.teacherName}</strong></div>
                        <div className="text-slate-600 font-medium">Roster: <strong className="text-slate-800">{c.studentCount} students enrolled</strong></div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-4 border-t border-slate-100 mt-4">
                      <button
                        onClick={() => openClassEdit(c)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-[9px] font-extrabold text-blue-700 uppercase transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleClassDuplicate(c.id)}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-extrabold text-slate-700 uppercase transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleClassDelete(c.id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[9px] font-extrabold text-rose-700 uppercase transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {filteredClasses.length === 0 && (
                  <div className="sm:col-span-2 lg:col-span-3 text-center py-10 bg-white border border-slate-200 rounded-2xl italic text-slate-400">
                    No classes found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6 animate-scale-in">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h2 className="font-adventure text-2xl font-bold text-slate-900 uppercase tracking-wide">Live &amp; Finished Session Reports</h2>
                <p className="text-slate-600 text-xs">Review finished classroom Sync Ludo multiplayer match histories and accuracy statistics.</p>
              </div>

              {/* REPORTS LIST TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <th className="p-4">Room Code</th>
                        <th className="p-4">Class</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Finished At</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {reportsList.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-4 font-adventure font-extrabold text-slate-900 text-sm tracking-widest">{r.session.roomCode}</td>
                          <td className="p-4 font-bold text-slate-700">{r.className}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-50 border border-emerald-200 text-emerald-700">
                              {r.session.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 font-medium">{new Date(r.session.endedAt).toLocaleString()}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => openReportView(r.session.id)}
                              className="px-3 py-1.5 bg-[var(--primary-subtle-bg)] hover:bg-[var(--primary-subtle-hover)] border border-[var(--primary-subtle-border)] rounded-lg text-[9px] font-extrabold text-[var(--primary-subtle-text)] uppercase transition-all"
                            >
                              View Stats 📊
                            </button>
                          </td>
                        </tr>
                      ))}
                      {reportsList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-400 italic">No reports found. Generate one by finishing a sync multiplayer classroom game.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EXPORTS CENTER */}
          {activeTab === 'exports' && (
            <div className="space-y-6 animate-scale-in">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <h2 className="font-adventure text-2xl font-bold text-slate-900 uppercase tracking-wide">Admin Export Center</h2>
                <p className="text-slate-600 text-xs">Download all relevant game logs, activity data, pedagogical questions, teacher tables, and student performance marks.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* SYSTEM DATA PANEL */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="font-adventure text-lg font-bold text-slate-950 uppercase tracking-wide">System Data Export</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
                      Generates a multi-sheet spreadsheet containing complete exports of all teacher profiles, students rosters, pedagogical question database entries, active academic classes, and socket sync game sessions histories.
                    </p>
                  </div>
                  <button 
                    onClick={handleDownloadSystemData}
                    disabled={downloadingSystem}
                    className={`w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white border-b-4 border-emerald-800 rounded-xl font-adventure font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-98 ${downloadingSystem ? 'opacity-65 cursor-not-allowed' : ''}`}
                  >
                    {downloadingSystem ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Preparing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download System Data (.xlsx)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* STUDENT MARKS PANEL */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-[var(--primary-color)] text-white flex items-center justify-center">
                        <Download className="w-5 h-5" />
                      </div>
                      <h3 className="font-adventure text-lg font-bold text-slate-950 uppercase tracking-wide">Student Marks Report</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
                      Extracts student details along with classroom session marks and results. The marks values are pulled dynamically from database session results record and generated instantly to reflect latest changes.
                    </p>
                  </div>
                  <button 
                    onClick={handleDownloadMarks}
                    disabled={downloadingMarks}
                    className={`w-full py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white border-b-4 border-[var(--primary-dark)] rounded-xl font-adventure font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-98 ${downloadingMarks ? 'opacity-65 cursor-not-allowed' : ''}`}
                  >
                    {downloadingMarks ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Preparing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Student Marks (.xlsx)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* QUESTIONS EXPORT PANEL */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                        <Download className="w-5 h-5" />
                      </div>
                      <h3 className="font-adventure text-lg font-bold text-slate-950 uppercase tracking-wide">Questions Bank Export</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans mb-3">
                      Export questions filtered by syllabus class and subject area to separate spreadsheets.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 mb-2">
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 mb-1">Grade</label>
                        <select 
                          value={exportGrade} 
                          onChange={(e)=>setExportGrade(e.target.value)} 
                          className="w-full bg-slate-55 border border-slate-250 rounded-lg px-2 py-1.5 focus:outline-none"
                        >
                          <option value="all">All Grades</option>
                          {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                            <option key={g} value={String(g)}>Class {g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 mb-1">Subject</label>
                        <select 
                          value={exportSubject} 
                          onChange={(e)=>setExportSubject(e.target.value)} 
                          className="w-full bg-slate-55 border border-slate-250 rounded-lg px-2 py-1.5 focus:outline-none"
                        >
                          <option value="all">All Subjects</option>
                          <option value="English">English</option>
                          <option value="Tamil">Tamil</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="Science">Science</option>
                          <option value="Social Science">Social Science</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Biology">Biology</option>
                          <option value="Computer Science">Computer Science</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleDownloadQuestions}
                    disabled={downloadingQuestions}
                    className={`w-full py-3 bg-indigo-650 hover:bg-indigo-605 text-white border-b-4 border-indigo-800 rounded-xl font-adventure font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-98 ${downloadingQuestions ? 'opacity-65 cursor-not-allowed' : ''}`}
                  >
                    {downloadingQuestions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Preparing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Questions (.xlsx)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ==========================================
         MODALS POPUPS LAYOUTS
         ========================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 select-text">
          <div className="bg-white text-stone-900 border-3 border-[var(--primary-color)] p-6 sm:p-8 rounded-[2rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative animate-scale-in">
            
            {/* Close modal */}
            <button
              onClick={() => setShowModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* A. TEACHER CREATE */}
            {showModal === 'teacher_create' && (
              <form onSubmit={handleTeacherCreate} className="space-y-4 text-xs font-semibold">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">Setup Teacher Profile</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">First Name</label>
                    <input type="text" required value={teacherForm.firstName} onChange={(e)=>setTeacherForm({...teacherForm, firstName: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Last Name</label>
                    <input type="text" required value={teacherForm.lastName} onChange={(e)=>setTeacherForm({...teacherForm, lastName: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Teacher Email</label>
                  <input type="email" required value={teacherForm.email} onChange={(e)=>setTeacherForm({...teacherForm, email: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Access Password</label>
                  <input type="password" required value={teacherForm.password} onChange={(e)=>setTeacherForm({...teacherForm, password: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">School Name</label>
                  <input type="text" required value={teacherForm.schoolName} onChange={(e)=>setTeacherForm({...teacherForm, schoolName: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" placeholder="e.g. St. Patrick High School" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Subject</label>
                    <input type="text" value={teacherForm.subject} onChange={(e)=>setTeacherForm({...teacherForm, subject: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" placeholder="e.g. Computer Science" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Mobile Number</label>
                    <input type="text" value={teacherForm.mobileNumber} onChange={(e)=>setTeacherForm({...teacherForm, mobileNumber: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" placeholder="e.g. +91 999999999" />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl uppercase transition-colors">
                  {loading ? 'Creating...' : 'Create Teacher Account'}
                </button>
              </form>
            )}

            {/* B. TEACHER EDIT */}
            {showModal === 'teacher_edit' && (
              <form onSubmit={handleTeacherEdit} className="space-y-4 text-xs font-semibold">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">Edit Teacher Details</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">First Name</label>
                    <input type="text" required value={teacherForm.firstName} onChange={(e)=>setTeacherForm({...teacherForm, firstName: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Last Name</label>
                    <input type="text" required value={teacherForm.lastName} onChange={(e)=>setTeacherForm({...teacherForm, lastName: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Teacher Email</label>
                  <input type="email" required value={teacherForm.email} onChange={(e)=>setTeacherForm({...teacherForm, email: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">School Name</label>
                  <input type="text" required value={teacherForm.schoolName} onChange={(e)=>setTeacherForm({...teacherForm, schoolName: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Subject</label>
                    <input type="text" value={teacherForm.subject} onChange={(e)=>setTeacherForm({...teacherForm, subject: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Mobile Number</label>
                    <input type="text" value={teacherForm.mobileNumber} onChange={(e)=>setTeacherForm({...teacherForm, mobileNumber: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl uppercase transition-colors">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}

            {/* C. STUDENT CREATE */}
            {showModal === 'student_create' && (
              <form onSubmit={handleStudentCreate} className="space-y-4 text-xs font-semibold">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">Setup Student Profile</h3>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Student Full Name</label>
                  <input type="text" required value={studentForm.name} onChange={(e)=>setStudentForm({...studentForm, name: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" placeholder="e.g. Aarav Sharma" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Student Email</label>
                  <input type="email" required value={studentForm.email} onChange={(e)=>setStudentForm({...studentForm, email: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" placeholder="e.g. aarav@gmail.com" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Assign Class Roster</label>
                  <select required value={studentForm.classId} onChange={(e)=>setStudentForm({...studentForm, classId: e.target.value})} className="w-full bg-slate-55 border border-slate-350 rounded-xl px-3 py-2 text-slate-800">
                    <option value="">Select a classroom...</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.section}) - {c.teacherName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Access Password</label>
                  <input type="password" required value={studentForm.password} onChange={(e)=>setStudentForm({...studentForm, password: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl uppercase transition-colors">
                  {loading ? 'Creating...' : 'Create Student Profile'}
                </button>
              </form>
            )}

            {/* D. STUDENT EDIT */}
            {showModal === 'student_edit' && (
              <form onSubmit={handleStudentEdit} className="space-y-4 text-xs font-semibold">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">Edit Student Profile</h3>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Student Full Name</label>
                  <input type="text" required value={studentForm.name} onChange={(e)=>setStudentForm({...studentForm, name: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Student Email</label>
                  <input type="email" required value={studentForm.email} onChange={(e)=>setStudentForm({...studentForm, email: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Assign Class Roster</label>
                  <select required value={studentForm.classId} onChange={(e)=>setStudentForm({...studentForm, classId: e.target.value})} className="w-full bg-slate-55 border border-slate-350 rounded-xl px-3 py-2 text-slate-800">
                    <option value="">Select a classroom...</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.section}) - {c.teacherName}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl uppercase transition-colors">
                  {loading ? 'Saving...' : 'Save Details'}
                </button>
              </form>
            )}

            {/* E. QUESTION CREATE OR EDIT */}
            {(showModal === 'question_create' || showModal === 'question_edit') && (
              <form onSubmit={handleQuestionCreateOrUpdate} className="space-y-4 text-xs font-semibold">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">
                  {showModal === 'question_create' ? 'Create Question' : 'Edit Question'}
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Syllabus Grade</label>
                    <select value={questionForm.grade} onChange={(e)=>setQuestionForm({...questionForm, grade: e.target.value})} className="w-full bg-slate-55 border border-slate-355 rounded-xl px-3 py-2 text-slate-800">
                      {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                        <option key={g} value={String(g)}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Difficulty</label>
                    <select value={questionForm.difficulty} onChange={(e)=>setQuestionForm({...questionForm, difficulty: e.target.value})} className="w-full bg-slate-55 border border-slate-355 rounded-xl px-3 py-2 text-slate-800">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Subject Area</label>
                  <select value={questionForm.subject} onChange={(e)=>setQuestionForm({...questionForm, subject: e.target.value})} className="w-full bg-slate-55 border border-slate-355 rounded-xl px-3 py-2 text-slate-800">
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Social Science">Social Science</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Syllabus Topic</label>
                  <input type="text" required value={questionForm.topic} onChange={(e)=>setQuestionForm({...questionForm, topic: e.target.value})} className="w-full border border-slate-355 rounded-xl px-3 py-2 text-slate-800" placeholder="e.g. Stack Operations" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Question Content Text</label>
                  <textarea required rows={3} value={questionForm.questionText} onChange={(e)=>setQuestionForm({...questionForm, questionText: e.target.value})} className="w-full border border-slate-355 rounded-xl px-3 py-2 text-slate-800 resize-none font-sans" placeholder="Type the question..." />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold">Option Choices</label>
                  <input type="text" required value={questionForm.optionA} onChange={(e)=>setQuestionForm({...questionForm, optionA: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800 text-[11px]" placeholder="Option A" />
                  <input type="text" required value={questionForm.optionB} onChange={(e)=>setQuestionForm({...questionForm, optionB: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800 text-[11px]" placeholder="Option B" />
                  <input type="text" required value={questionForm.optionC} onChange={(e)=>setQuestionForm({...questionForm, optionC: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800 text-[11px]" placeholder="Option C" />
                  <input type="text" required value={questionForm.optionD} onChange={(e)=>setQuestionForm({...questionForm, optionD: e.target.value})} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800 text-[11px]" placeholder="Option D" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Identify Correct Index</label>
                  <select value={questionForm.correctIndex} onChange={(e)=>setQuestionForm({...questionForm, correctIndex: Number(e.target.value)})} className="w-full bg-slate-55 border border-slate-355 rounded-xl px-3 py-2 text-slate-800">
                    <option value="0">Option A</option>
                    <option value="1">Option B</option>
                    <option value="2">Option C</option>
                    <option value="3">Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Detailed Explanation Hint</label>
                  <textarea rows={2} value={questionForm.explanation} onChange={(e)=>setQuestionForm({...questionForm, explanation: e.target.value})} className="w-full border border-slate-355 rounded-xl px-3 py-2 text-slate-800 resize-none font-sans" placeholder="Explain why correct answer is correct..." />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl uppercase transition-colors">
                  {loading ? 'Submitting...' : 'Save Question'}
                </button>
              </form>
            )}

            {/* E2. BULK EDIT QUESTIONS */}
            {showModal === 'bulk_edit' && (
              <form onSubmit={handleBulkEditSubmit} className="space-y-4 text-xs font-semibold">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">
                  Bulk Edit ({selectedQuestionIds.size} Questions)
                </h3>
                <p className="text-[10px] text-slate-500 text-center font-bold">Leave fields blank if you do not want to modify them.</p>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Grade Level</label>
                  <select value={bulkEditForm.grade} onChange={(e)=>setBulkEditForm({...bulkEditForm, grade: e.target.value})} className="w-full bg-slate-55 border border-slate-355 rounded-xl px-3 py-2 text-slate-800">
                    <option value="">-- Keep Original Grade --</option>
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                      <option key={g} value={String(g)}>Grade {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Subject Area</label>
                  <select value={bulkEditForm.subject} onChange={(e)=>setBulkEditForm({...bulkEditForm, subject: e.target.value})} className="w-full bg-slate-55 border border-slate-355 rounded-xl px-3 py-2 text-slate-800">
                    <option value="">-- Keep Original Subject --</option>
                    <option value="English">English</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Social Science">Social Science</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Difficulty</label>
                  <select value={bulkEditForm.difficulty} onChange={(e)=>setBulkEditForm({...bulkEditForm, difficulty: e.target.value})} className="w-full bg-slate-55 border border-slate-355 rounded-xl px-3 py-2 text-slate-800">
                    <option value="">-- Keep Original Difficulty --</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Chapter/Topic</label>
                  <input type="text" value={bulkEditForm.topic} onChange={(e)=>setBulkEditForm({...bulkEditForm, topic: e.target.value})} className="w-full border border-slate-355 rounded-xl px-3 py-2 text-slate-800" placeholder="e.g. Loops & Arrays (or leave blank)" />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl uppercase transition-colors">
                  {loading ? 'Submitting...' : 'Apply Changes'}
                </button>
              </form>
            )}

            {/* F. CLASS CREATE OR EDIT */}
            {(showModal === 'class_create' || showModal === 'class_edit') && (
              <form onSubmit={handleClassCreateOrUpdate} className="space-y-4 text-xs font-semibold">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">
                  {showModal === 'class_create' ? 'Create Class' : 'Edit Class Details'}
                </h3>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Assign Classroom Teacher</label>
                  <select required value={classForm.teacherId} onChange={(e)=>setClassForm({...classForm, teacherId: e.target.value})} className="w-full bg-slate-55 border border-slate-355 rounded-xl px-3 py-2 text-slate-800">
                    <option value="">Choose a teacher profile...</option>
                    {teachersList.map(t => (
                      <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Class Name</label>
                  <input type="text" required value={classForm.name} onChange={(e)=>setClassForm({...classForm, name: e.target.value})} className="w-full border border-slate-355 rounded-xl px-3 py-2 text-slate-800" placeholder="e.g. Class 11 CS" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Grade Level</label>
                    <select value={classForm.grade} onChange={(e)=>setClassForm({...classForm, grade: e.target.value})} className="w-full bg-slate-55 border border-slate-355 rounded-xl px-3 py-2 text-slate-800">
                      {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                        <option key={g} value={String(g)}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Class Section</label>
                    <input type="text" required value={classForm.section} onChange={(e)=>setClassForm({...classForm, section: e.target.value})} className="w-full border border-slate-355 rounded-xl px-3 py-2 text-slate-800" placeholder="e.g. A" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Subject Area</label>
                  <input type="text" required value={classForm.subject} onChange={(e)=>setClassForm({...classForm, subject: e.target.value})} className="w-full border border-slate-355 rounded-xl px-3 py-2 text-slate-800" />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl uppercase transition-colors">
                  {loading ? 'Submitting...' : 'Save Class'}
                </button>
              </form>
            )}

            {/* G. TEACHER RESET PASSWORD */}
            {showModal === 'teacher_reset_pass' && (
              <form onSubmit={handleTeacherResetPassword} className="space-y-4 text-xs font-semibold">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">Reset Teacher Password</h3>
                <p className="text-[10px] text-slate-500 font-semibold mb-2">Reset password for: <strong className="text-slate-800">{selectedTeacher?.firstName} {selectedTeacher?.lastName}</strong></p>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">New Password</label>
                  <input type="password" required value={resetPasswordText} onChange={(e)=>setResetPasswordText(e.target.value)} className="w-full border border-slate-350 rounded-xl px-3 py-2 text-slate-800" placeholder="••••••••" />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl uppercase transition-all shadow border-b-2 border-amber-800">
                  {loading ? 'Resetting...' : 'Change Password'}
                </button>
              </form>
            )}

            {/* H. CSV QUESTIONS IMPORT */}
            {showModal === 'csv_import' && (
              <form onSubmit={handleCsvImport} className="space-y-4 text-xs font-semibold">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">Import CSV Questions</h3>
                <p className="text-[9px] text-slate-400 font-medium">Format: Grade,Topic,Difficulty,QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectIndex(A/B/C/D),Explanation</p>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-extrabold mb-1">Paste CSV Contents</label>
                  <textarea rows={6} required value={csvText} onChange={(e)=>setCsvText(e.target.value)} className="w-full border border-slate-355 rounded-xl px-3 py-2 text-slate-800 resize-none font-mono text-[9px] leading-tight" placeholder='11,Stacks,medium,"What is LIFO?",Last In First Out,First In Last Out,Last In First In,First In First In,A,"LIFO stands for Last In First Out"' />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl uppercase transition-colors">
                  {loading ? 'Importing...' : 'Perform Import'}
                </button>
              </form>
            )}

            {/* I. VIEW REPORT DETAIL */}
            {showModal === 'view_report' && selectedReport && (
              <div className="space-y-4 text-xs">
                <h3 className="font-adventure text-xl font-bold text-[var(--primary-color)] border-b border-slate-100 pb-2 uppercase tracking-wide text-center">
                  Session Room Code: {selectedReport.session.roomCode}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Classroom: <span className="text-slate-800">{selectedReport.className}</span></p>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-2 select-text">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-2 uppercase text-[10px] tracking-wider">Standings &amp; Marks</h4>
                  
                  {selectedReport.results.map((r: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center border-b border-slate-150 pb-2 text-slate-700">
                      <div>
                        <p className="font-bold text-slate-900">{r.studentName}</p>
                        <p className="text-[9px] text-slate-450 font-bold uppercase">Accuracy: {r.accuracy ? Math.round(r.accuracy * 100) : 0}%</p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-[var(--primary-color)]">Rank #{r.rank}</p>
                        <p className="text-[9px] text-slate-400 font-bold">🪙 {r.coins} | {r.xp} XP</p>
                      </div>
                    </div>
                  ))}

                  {selectedReport.results.length === 0 && (
                    <p className="text-center py-4 italic text-slate-450">No students recorded results.</p>
                  )}
                </div>

                <button onClick={() => setShowModal(null)} className="w-full py-3 bg-[var(--primary-color)] text-white font-bold rounded-xl uppercase transition-colors">
                  Close Report Window
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white text-stone-900 border-3 border-[var(--primary-color)] p-6 sm:p-8 rounded-[2rem] w-full max-w-sm shadow-[6px_6px_0px_var(--primary-dark)] relative select-text animate-scale-in">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-adventure text-2xl font-extrabold text-[var(--primary-color)] border-b-2 border-[var(--primary-subtle-border)] pb-3 mb-6 uppercase tracking-wider text-center">
              System Settings
            </h3>

            <div className="space-y-6">
              {/* Theme Switcher */}
              <div className="space-y-2.5 font-adventure border-b border-slate-100 pb-4">
                <span className="font-bold text-sm text-slate-700 block text-left font-sans">Interface Theme</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cyber-blue', name: 'Cyber Blue', emoji: '💙' },
                    { id: 'aurora', name: 'Aurora', emoji: '🩵' },
                    { id: 'rose', name: 'Rose', emoji: '💖' },
                    { id: 'emerald-tech', name: 'Emerald Tech', emoji: '💚' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-2.5 rounded-xl border-2 text-[10px] font-extrabold transition-all active:scale-95 ${
                        theme === t.id
                          ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-inner scale-[1.02]'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-xs">{t.emoji}</span>
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-semibold leading-relaxed border-t border-slate-100 pt-4 font-sans">
                <p className="font-bold text-[var(--primary-color)] mb-1 font-adventure uppercase tracking-wider">Theme Colors Details:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Cyber Blue theme aligns with the blue heart icon.</li>
                  <li>Aurora theme aligns with the teal heart icon.</li>
                  <li>Rose theme aligns with the pink heart icon.</li>
                  <li>Emerald Tech theme aligns with the green heart icon.</li>
                </ul>
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-3 bg-[var(--primary-color)] hover:bg-[var(--primary-light)] text-white border-b-4 border-[var(--primary-dark)] rounded-xl font-adventure font-extrabold text-sm uppercase tracking-wider transition-all shadow-md"
              >
                Return to Console
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
