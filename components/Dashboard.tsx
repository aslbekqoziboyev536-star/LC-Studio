import React, { useState, useEffect } from 'react';
import { AppView, User, Student, Notification, Role, Course } from '../types';
import Sidebar from './Sidebar';
import Button from './Button';
import Modal from './Modal';
import { api } from '../services/api'; // Use API service
import { Users, Bell, DollarSign, Calendar, Shield, Smartphone, Menu, CheckCircle, XCircle, Trash2, LogOut, Plus, UserPlus, Settings as SettingsIcon, Search, Hexagon, Edit, UserX, UserCheck, ArrowRight, Clock } from 'lucide-react';

// --- Helper Functions ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('uz-UZ');
};

const Dashboard: React.FC = () => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(localStorage.getItem('currentDeviceId'));
  const [theme, setTheme] = useState<'light' | 'dark'>((localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  
  // Date Filter State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Login & Register Inputs
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  // Register Form State
  const [registerData, setRegisterData] = useState({
    centerName: '',
    fullName: '',
    username: '',
    password: ''
  });

  // Modals
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [newLesson, setNewLesson] = useState({ date: new Date().toISOString().split('T')[0], topic: '' });
  const [pendingAttendance, setPendingAttendance] = useState<Record<string, Record<string, any>>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceReasonModal, setAttendanceReasonModal] = useState<{studentId: string, date: string} | null>(null);
  const [tempReason, setTempReason] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  
  // Salary Edit Modal State
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [newSalaryAmount, setNewSalaryAmount] = useState('');

  // Form States
  const [newTeacher, setNewTeacher] = useState<Partial<User>>({
    role: 'TEACHER',
    name: '',
    username: '',
    password: '',
    courseName: '',
    coursePrice: 0,
    monthlySalary: 0,
    joinDate: new Date().toISOString().split('T')[0],
    isLeft: false,
    salaryPaid: false,
    devices: []
  });

  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    teacherId: '',
    paid: false
  });

  const [newCourse, setNewCourse] = useState<Partial<Course>>({
      name: '',
      teacherId: '',
      schedule: '',
      price: 0
  });

  const [settingsForm, setSettingsForm] = useState({
    centerName: '',
    username: '',
    password: ''
  });

  // --- API Loaders ---

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedStudents, fetchedCourses] = await Promise.all([
        api.getUsers(),
        api.getStudents(),
        api.getCourses()
      ]);
      setUsers(fetchedUsers);
      setStudents(fetchedStudents);
      setCourses(fetchedCourses);
      return fetchedUsers;
    } catch (error) {
      console.error("Failed to load data", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // --- Effects ---

  // Check system status and restore session
  useEffect(() => {
      // Apply theme
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
      const checkInit = async () => {
          setIsLoading(true);
          try {
              // 1. Restore session if token exists
              const token = localStorage.getItem('token');
              if (token) {
                  try {
                      const response = await api.getMe();
                      if (response.user) {
                          setCurrentUser(response.user);
                          setCurrentView(AppView.DASHBOARD);
                      }
                  } catch (err) {
                      console.error("Session restoration failed", err);
                      localStorage.removeItem('token');
                      localStorage.removeItem('currentDeviceId');
                  }
              }

              // 2. Check if system is empty (for initial registration)
              const users = await api.getUsers();
              if (users.length === 0) {
                  setIsRegistering(true);
              }
          } catch (e) {
              console.error("Connection error");
          } finally {
              setIsLoading(false);
          }
      };
      checkInit();
  }, []);

  // Initialize settings form
  useEffect(() => {
    if (currentUser) {
      setSettingsForm({
        centerName: currentUser.centerName || '',
        username: currentUser.username,
        password: currentUser.password || ''
      });
      loadData(); // Load data on successful login
    }
  }, [currentUser]);

  // Salary Notification Logic (Calculated on Frontend based on User Data)
  useEffect(() => {
    if (currentUser && currentUser.role === 'SUPER_ADMIN') {
      const today = new Date();
      const dayOfMonth = today.getDate();
      
      let updatedNotifications = [...notifications];

      users.filter(u => u.role === 'TEACHER' && !u.isLeft).forEach(teacher => {
        if (!teacher.joinDate) return;
        const joinDate = new Date(teacher.joinDate);
        const payDay = joinDate.getDate(); 
        const tId = teacher._id || teacher.id || 'unknown';

        let diff = payDay - dayOfMonth;
        if (diff < 0) diff += 30; 

        const existingActiveNote = updatedNotifications.find(n => n.id.startsWith(`pay-${tId}`) && n.status === 'active');

        if (!teacher.salaryPaid && diff <= 7 && diff >= 2) {
           if (!existingActiveNote) {
             updatedNotifications.push({
               id: `pay-warn-${tId}-${Date.now()}`,
               userId: currentUser._id || currentUser.id || 'admin',
               type: 'warning',
               message: `O‘qituvchi ${teacher.name}ning ${teacher.courseName} kursi uchun oylik maosh to‘lanish vaqti kelyabdi! (${diff} kun qoldi)`,
               date: new Date().toISOString(),
               isRead: false,
               status: 'active'
             });
           }
        } 
        else if (!teacher.salaryPaid && diff === 0) {
            updatedNotifications = updatedNotifications.filter(n => !n.id.includes(`pay-warn-${tId}`));
            const existingCritical = updatedNotifications.find(n => n.id.startsWith(`pay-crit-${tId}`) && n.status === 'active');
            if (!existingCritical) {
              updatedNotifications.push({
                id: `pay-crit-${tId}-${Date.now()}`,
                userId: currentUser._id || currentUser.id || 'admin',
                type: 'critical',
                message: `Bugun o‘qituvchi ${teacher.name}ning ${teacher.courseName} kursi uchun oylik maoshni to‘lashni unutmang!`,
                date: new Date().toISOString(),
                isRead: false,
                status: 'active'
              });
            }
        }
        else if (teacher.salaryPaid && existingActiveNote) {
             updatedNotifications = updatedNotifications.map(n => 
                (n.id === existingActiveNote.id) 
                  ? { ...n, status: 'resolved', type: 'success', message: `To'landi: ${n.message}` } 
                  : n
             );
        }
      });
      
      if (JSON.stringify(updatedNotifications) !== JSON.stringify(notifications)) {
          setNotifications(updatedNotifications);
      }
    }
  }, [currentUser, users, notifications]); 

  // --- Handlers ---

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      setUsernameSuggestions([]);
      if (!registerData.centerName || !registerData.fullName || !registerData.username || !registerData.password) {
          setLoginError("Barcha maydonlarni to'ldiring");
          return;
      }

      setIsLoading(true);
      try {
          // 1. Create Super Admin User
          await api.createUser({
              role: 'SUPER_ADMIN',
              name: registerData.fullName,
              username: registerData.username.trim(),
              password: registerData.password.trim(),
              centerName: registerData.centerName,
              devices: []
          });

          // 2. Auto Login
          const response = await api.login({ username: registerData.username.trim(), password: registerData.password.trim() });
          localStorage.setItem('token', response.token);
          localStorage.setItem('currentDeviceId', response.currentDeviceId);
          setCurrentDeviceId(response.currentDeviceId);
          setCurrentUser(response.user);
          setCurrentView(AppView.DASHBOARD);
      } catch (e: any) {
          if (e.data?.suggestions) {
              setUsernameSuggestions(e.data.suggestions);
          }
          setLoginError(e.message || "Xatolik yuz berdi");
      } finally {
          setIsLoading(false);
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const response = await api.login({ username: username.trim(), password: password.trim() });
      
      if (response.user.role === 'TEACHER' && response.user.isLeft) {
          setLoginError('Siz ushbu o‘quv markazidan ketgansiz.');
          setIsLoading(false);
          return;
      }
      
      // Store token
      localStorage.setItem('token', response.token);
      localStorage.setItem('currentDeviceId', response.currentDeviceId);
      setCurrentDeviceId(response.currentDeviceId);
      
      // Set current user with device info from backend
      setCurrentUser(response.user);
      setCurrentView(AppView.DASHBOARD);
    } catch (error: any) {
      setLoginError('Login yoki parol noto‘g‘ri yoki server bilan aloqa yo\'q');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (currentUser && currentDeviceId) {
        try {
            const userId = currentUser._id || currentUser.id;
            if (userId) {
                await api.logoutDevice(userId, currentDeviceId);
            }
        } catch (e) {
            console.error("Logout device error", e);
        }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('currentDeviceId');
    setCurrentDeviceId(null);
    setCurrentUser(null);
    setCurrentView(AppView.LOGIN);
    setUsername('');
    setPassword('');
    setUsers([]);
    setStudents([]);
    setCourses([]);
  };

  const openTeacherModal = () => {
    setLoginError('');
    setUsernameSuggestions([]);
    setIsTeacherModalOpen(true);
  };

  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.username || !newTeacher.password) return;
    setIsLoading(true);
    setUsernameSuggestions([]);
    try {
        await api.createUser({
            ...newTeacher,
            username: newTeacher.username?.trim(),
            password: newTeacher.password?.trim(),
            centerName: currentUser?.centerName // Inherit center name
        });
        await loadData(); // Refresh list
        setIsTeacherModalOpen(false);
        setNewTeacher({ role: 'TEACHER', name: '', username: '', password: '', joinDate: new Date().toISOString().split('T')[0], isLeft: false, salaryPaid: false, devices: [] });
    } catch (e: any) {
        if (e.data?.suggestions) {
            setUsernameSuggestions(e.data.suggestions);
        }
        setLoginError(e.message || "Xatolik yuz berdi");
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddCourse = async () => {
      if (!newCourse.name || !newCourse.schedule) return;
      setIsLoading(true);
      try {
          await api.createCourse(newCourse);
          await loadData();
          setIsCourseModalOpen(false);
          setNewCourse({ name: '', teacherId: '', schedule: '', price: 0 });
      } catch (e) {
          alert("Xatolik yuz berdi");
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleRemoveCourse = async (courseId: string) => {
      if(confirm('Kursni o\'chirmoqchimisiz?')) {
          try {
              await api.deleteCourse(courseId);
              loadData();
          } catch(e) { alert("Xatolik"); }
      }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.teacherId) return;
    const teacher = users.find(u => (u._id === newStudent.teacherId || u.id === newStudent.teacherId));
    
    const studentData: Partial<Student> = {
        name: newStudent.name!,
        teacherId: newStudent.teacherId!,
        courseName: teacher?.courseName || 'Unknown',
        paid: newStudent.paid || false,
        attendance: {},
        centerName: currentUser?.centerName
    };

    setIsLoading(true);
    try {
        await api.createStudent(studentData);
        await loadData();
        setIsStudentModalOpen(false);
        setNewStudent({ name: '', teacherId: '', paid: false });
    } catch (e) {
        alert("Xatolik yuz berdi");
    } finally {
        setIsLoading(false);
    }
  };

  const toggleTeacherSalary = async (teacherId: string, currentStatus: boolean) => {
    try {
        await api.updateUser(teacherId, { salaryPaid: !currentStatus });
        // Optimistic update
        setUsers(users.map(u => (u._id === teacherId || u.id === teacherId) ? { ...u, salaryPaid: !currentStatus } : u));
    } catch (e) { alert("Xatolik"); }
  };

  const handleTeacherLeft = async (teacherId: string, status: boolean) => {
     try {
        await api.updateUser(teacherId, { isLeft: status });
        loadData();
     } catch (e) { alert("Xatolik"); }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
     if(confirm('O‘qituvchini o‘chirmoqchimisiz?')) {
         try {
            await api.deleteUser(teacherId);
            loadData();
         } catch(e) { alert("Xatolik"); }
     }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if(confirm('O‘quvchini o‘chirmoqchimisiz?')) {
        try {
           await api.deleteStudent(studentId);
           await loadData();
        } catch(e: any) { 
            alert(e.message || "Xatolik yuz berdi"); 
        }
    }
 };
  
  // -- Salary Update Handlers --
  const openSalaryModal = (teacher: User) => {
      setEditingTeacher(teacher);
      setNewSalaryAmount(teacher.monthlySalary ? teacher.monthlySalary.toString() : '');
      setIsSalaryModalOpen(true);
  };

  const handleUpdateSalary = async () => {
      if (!editingTeacher) return;
      const tId = editingTeacher._id || editingTeacher.id;
      if (!tId) return;

      try {
          await api.updateUser(tId, { monthlySalary: Number(newSalaryAmount) });
           // Optimistic update
          setUsers(users.map(u => (u._id === tId || u.id === tId) ? { ...u, monthlySalary: Number(newSalaryAmount) } : u));
          setIsSalaryModalOpen(false);
      } catch (e) { alert("Xatolik"); }
  };

  const handleSaveAttendance = async () => {
    if (Object.keys(pendingAttendance).length === 0) return;
    setIsSavingAttendance(true);
    try {
        const updates = Object.entries(pendingAttendance).map(([id, attendance]) => ({
            id,
            attendance
        }));
        await api.bulkUpdateStudents(updates);
        await loadData();
        setPendingAttendance({});
        alert("Davomat saqlandi!");
    } catch (e) {
        alert("Saqlashda xatolik yuz berdi");
    } finally {
        setIsSavingAttendance(false);
    }
  };

  const handleAddLesson = async () => {
      if (!newLesson.date || !newLesson.topic) return;
      
      // We need to know which course to add the lesson to.
      // If teacher, they have a courseName.
      // For now, let's find the course that matches the teacher's courseName or just use the first course if admin.
      let targetCourse = currentUser?.role === 'SUPER_ADMIN'
          ? courses.find(c => (c._id === selectedCourseId || c.id === selectedCourseId))
          : courses.find(c => c.teacherId === currentUser?._id || c.teacherId === currentUser?.id);
      
      if (!targetCourse) {
          alert("Kurs topilmadi. Avval kurs yarating.");
          return;
      }

      try {
          const updatedLessons = [...(targetCourse.lessons || []), { ...newLesson, createdAt: new Date().toISOString() }];
          await api.updateCourse(targetCourse._id || targetCourse.id!, { lessons: updatedLessons });
          await loadData();
          setIsLessonModalOpen(false);
          setNewLesson({ date: new Date().toISOString().split('T')[0], topic: '' });
      } catch (e) {
          alert("Dars qo'shishda xatolik");
      }
  };

  const markAttendance = (studentId: string, date: string, status: 'B' | 'Y') => {
      // Check if it's locked (1 hour = 3600000 ms)
      // Actually, user said "1 sat" which I'll interpret as 1 hour for now, but let's check lesson creation time.
      // For simplicity, let's just allow editing for now or implement the lock if we have lesson data.
      
      const student = students.find(s => (s._id === studentId || s.id === studentId));
      if (!student) return;

      const lesson = courses.find(c => c.name === student.courseName)?.lessons?.find(l => l.date === date);
      if (lesson) {
          const createdTime = new Date(lesson.createdAt).getTime();
          const now = new Date().getTime();
          if (now - createdTime > 3600000) { // 1 hour lock
              alert("Ushbu dars davomati tahrirlash muddati tugagan (1 soat).");
              return;
          }
      }

      if (status === 'Y') {
          setAttendanceReasonModal({ studentId, date });
          setTempReason('');
      } else {
          setPendingAttendance(prev => ({
              ...prev,
              [studentId]: {
                  ...(prev[studentId] || {}),
                  [date]: { status: 'B', reason: '' }
              }
          }));
      }
  };

  const confirmAbsent = () => {
      if (!attendanceReasonModal) return;
      const { studentId, date } = attendanceReasonModal;
      setPendingAttendance(prev => ({
          ...prev,
          [studentId]: {
              ...(prev[studentId] || {}),
              [date]: { status: 'Y', reason: tempReason }
          }
      }));
      setAttendanceReasonModal(null);
  };

  const toggleStudentPayment = async (studentId: string, currentStatus: boolean) => {
    if (currentUser?.role !== 'SUPER_ADMIN') return;
    try {
        await api.updateStudent(studentId, { paid: !currentStatus });
        // Optimistic
        setStudents(students.map(s => (s._id === studentId || s.id === studentId) ? { ...s, paid: !currentStatus } : s));
    } catch (e) { alert("Xatolik"); }
  };

  const toggleAttendance = async (studentId: string, currentAttendance: any, date: string) => {
    // Safe check: If attendance is null or undefined, initialize as empty object
    const safeAttendance = currentAttendance || {};
    const currentStatus = safeAttendance[date];
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    
    // Create new object spread
    const updatedAttendance = { ...safeAttendance, [date]: newStatus };
    
    try {
        await api.updateStudent(studentId, { attendance: updatedAttendance });
         // Optimistic
        setStudents(students.map(s => {
            if (s._id !== studentId && s.id !== studentId) return s;
            return { ...s, attendance: updatedAttendance };
        }));
    } catch (e) { alert("Xatolik"); }
  };

  const handleUpdateSettings = async () => {
    if (!currentUser) return;
    try {
        const id = currentUser._id || currentUser.id;
        if (!id) return;
        
        const updated = await api.updateUser(id, { 
            centerName: settingsForm.centerName,
            username: settingsForm.username,
            password: settingsForm.password 
        });
        setCurrentUser(updated);
        alert('Sozlamalar saqlandi!');
    } catch (e) { alert("Xatolik"); }
  };

  const handleRemoteLogout = async (userId: string, deviceId: string) => {
      try {
          await api.logoutDevice(userId, deviceId);
          
          // If we removed a device from the CURRENT user's list (self-management), update currentUser state
          if (currentUser && (userId === currentUser._id || userId === currentUser.id)) {
              const updatedDevices = currentUser.devices.filter(d => d.id !== deviceId);
              setCurrentUser({ ...currentUser, devices: updatedDevices });
              
              // If we just logged out the CURRENT session
              if (deviceId === currentDeviceId) {
                  handleLogout();
                  return;
              }
          }

          // Always refresh the full user list for Admin view
          if (currentUser?.role === 'SUPER_ADMIN') {
              loadData();
          }
      } catch (e) { 
          console.error(e);
          alert("Xatolik yuz berdi"); 
      }
  };

  // --- Derived State ---
  const currentUserId = currentUser?._id || currentUser?.id;

  const filteredStudents = currentUser?.role === 'SUPER_ADMIN' 
    ? students 
    : students.filter(s => s.teacherId === currentUserId);

  const activeTeachers = users.filter(u => u.role === 'TEACHER');

  // --- Views ---

  if (currentView === AppView.LOGIN) {
    if (isRegistering) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
              <div className="text-center mb-6">
                <Hexagon className="mx-auto text-blue-600 mb-4" size={48} />
                <h1 className="text-2xl font-bold text-slate-900">Tizimni Sozlash</h1>
                <p className="text-slate-500 text-sm">Ilk foydalanuvchi (Super Admin) yaratish</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Markaz Nomi</label>
                  <input 
                    type="text" 
                    placeholder="Masalan: Kelajak Academy"
                    value={registerData.centerName}
                    onChange={(e) => setRegisterData({...registerData, centerName: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ism Familiya (Admin)</label>
                  <input 
                    type="text" 
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({...registerData, fullName: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Login</label>
                  <input 
                    type="text" 
                    value={registerData.username}
                    onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parol</label>
                  <input 
                    type="password" 
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
                
                {usernameSuggestions.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                        <p className="text-xs font-semibold text-blue-700 mb-2">Tavsiyalar:</p>
                        <div className="flex flex-wrap gap-2">
                            {usernameSuggestions.map(s => (
                                <button 
                                    key={s} 
                                    type="button"
                                    onClick={() => setRegisterData({...registerData, username: s})}
                                    className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 mt-2" isLoading={isLoading}>
                  Boshlash <ArrowRight size={20} className="ml-2" />
                </Button>
                <div className="text-center mt-4">
                    <button type="button" onClick={() => setIsRegistering(false)} className="text-sm text-slate-500 hover:text-slate-700">
                        Login sahifasiga qaytish
                    </button>
                </div>
              </form>
            </div>
          </div>
        )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <Hexagon className="mx-auto text-blue-600 mb-4" size={48} />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">EduCenter CRM</h1>
            <p className="text-slate-500">O‘quv Markazi Boshqaruv Tizimi</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Login</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Parol</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
            <Button className="w-full h-12 text-lg bg-slate-900 hover:bg-slate-800" isLoading={isLoading}>
              Kirish
            </Button>
            
            <div className="text-center pt-2">
                <button type="button" onClick={() => setIsRegistering(true)} className="text-sm text-blue-600 hover:underline">
                    Yangi markazni ro'yxatdan o'tkazish
                </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Bosh Sahifa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Jami O'quvchilar</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{filteredStudents.length}</h3>
                  </div>
                  <span className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400"><Users size={24} /></span>
                </div>
              </div>
              {currentUser?.role === 'SUPER_ADMIN' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">O'qituvchilar</p>
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{activeTeachers.filter(t => !t.isLeft).length}</h3>
                    </div>
                    <span className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400"><Calendar size={24} /></span>
                  </div>
                </div>
              )}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Mening Qurilmalarim</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{currentUser?.devices.length}</h3>
                  </div>
                  <span className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400"><Smartphone size={24} /></span>
                </div>
              </div>
            </div>
            
            {/* Notifications */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center">
                      <Bell className="text-slate-600 dark:text-slate-400 mr-2" size={20} />
                      <h3 className="font-semibold text-slate-900 dark:text-white">Eslatmalar</h3>
                  </div>
                  {notifications.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{notifications.filter(n => n.status === 'active').length}</span>}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                   {notifications.length === 0 ? (
                       <p className="p-6 text-center text-slate-400 dark:text-slate-500">Hozircha eslatmalar yo'q.</p>
                   ) : (
                       notifications.map(note => (
                         <div key={note.id} className={`p-4 flex items-center justify-between ${note.status === 'resolved' ? 'bg-slate-50 dark:bg-slate-800/30 opacity-70' : 'bg-white dark:bg-slate-900'}`}>
                           <div className="flex items-center">
                               {note.type === 'critical' ? <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span> :
                                note.type === 'success' ? <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span> :
                                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>}
                               <p className={`text-sm ${note.type === 'critical' ? 'text-red-700 dark:text-red-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{note.message}</p>
                           </div>
                           <span className="text-xs text-slate-400 dark:text-slate-500 ml-4 whitespace-nowrap">{formatDate(note.date)}</span>
                         </div>
                       ))
                   )}
                </div>
              </div>
          </div>
        );

      case AppView.TEACHERS:
        if (currentUser?.role !== 'SUPER_ADMIN') return null;
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">O'qituvchilar</h2>
              <Button onClick={openTeacherModal} icon={<Plus size={18} />}>O'qituvchi Qo'shish</Button>
            </div>
            {isLoading ? <p className="dark:text-slate-400">Yuklanmoqda...</p> : (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="p-4">Ism</th>
                    <th className="p-4">O'quvchilar</th>
                    <th className="p-4">Kurs Narxi</th>
                    <th className="p-4">Oylik Maosh</th>
                    <th className="p-4">Holat</th>
                    <th className="p-4">Maosh Holati</th>
                    <th className="p-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeTeachers.map(teacher => {
                    const tId = teacher._id || teacher.id || '';
                    const studentCount = students.filter(s => s.teacherId === tId).length;
                    return (
                        <tr key={tId} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${teacher.isLeft ? 'bg-slate-100 dark:bg-slate-800/30' : ''}`}>
                        <td className="p-4">
                            <div className={`font-medium ${teacher.isLeft ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>{teacher.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{teacher.courseName} | {formatDate(teacher.joinDate || '')}</div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                             <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 py-1 px-2 rounded-lg text-xs font-semibold">{studentCount} ta</span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{formatCurrency(teacher.coursePrice || 0)}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{formatCurrency(teacher.monthlySalary || 0)}</td>
                        <td className="p-4">
                            {teacher.isLeft ? (
                                <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2 py-1 rounded-full border border-slate-300 dark:border-slate-700">Ketgan</span>
                            ) : (
                                <span className="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded-full border border-green-200 dark:border-green-800">Faol</span>
                            )}
                        </td>
                        <td className="p-4">
                            {teacher.salaryPaid ? (
                            <span className="inline-flex items-center text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
                                <CheckCircle size={14} className="mr-1"/> To'langan
                            </span>
                            ) : (
                            <span className="inline-flex items-center text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full border border-red-200 dark:border-red-800">
                                <XCircle size={14} className="mr-1"/> To'lanmagan
                            </span>
                            )}
                        </td>
                        <td className="p-4 text-right space-x-2 flex justify-end">
                            {!teacher.isLeft && (
                            <>
                              <Button 
                                variant="ghost" 
                                className="py-1 px-2 text-xs h-8 text-blue-600 hover:bg-blue-50" 
                                onClick={() => openSalaryModal(teacher)}
                                title="Maoshni o'zgartirish"
                              >
                                <Edit size={14}/>
                              </Button>
                              <Button 
                                  variant={teacher.salaryPaid ? "secondary" : "primary"} 
                                  className="py-1 px-2 text-xs h-8" 
                                  onClick={() => toggleTeacherSalary(tId, teacher.salaryPaid || false)}
                              >
                                  {teacher.salaryPaid ? "Bekor qilish" : "To'lash"}
                              </Button>
                            </>
                            )}
                            <Button 
                                variant={teacher.isLeft ? "primary" : "ghost"} 
                                className={`py-1 px-2 text-xs h-8 ${!teacher.isLeft ? 'text-red-500 hover:bg-red-50 hover:text-red-600' : 'bg-slate-600 hover:bg-slate-700'}`}
                                onClick={() => handleTeacherLeft(tId, !teacher.isLeft)}
                                title={teacher.isLeft ? "Faoliyatini tiklash" : "Faoliyatini to'xtatish"}
                            >
                                {teacher.isLeft ? <UserCheck size={14} className="mr-1"/> : <UserX size={14} className="mr-1"/>}
                                {teacher.isLeft ? "Tiklash" : "Ketdi"}
                            </Button>
                            <Button variant="danger" className="py-1 px-2 text-xs h-8" onClick={() => handleRemoveTeacher(tId)}><Trash2 size={14}/></Button>
                        </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        );

      case AppView.COURSES:
        if (currentUser?.role !== 'SUPER_ADMIN') return null;
        return (
          <div className="space-y-6">
             <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mavjud Kurslar</h2>
                <Button onClick={() => setIsCourseModalOpen(true)} icon={<Plus size={18} />}>Kurs Qo'shish</Button>
             </div>
             {isLoading ? <p className="dark:text-slate-400">Yuklanmoqda...</p> : (
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                      <tr>
                         <th className="p-4">Kurs Nomi</th>
                         <th className="p-4">O'qituvchi</th>
                         <th className="p-4">Dars Jadvali</th>
                         <th className="p-4 text-right">Narxi</th>
                         <th className="p-4 text-right">Amallar</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {courses.map(course => {
                          const cId = course._id || course.id || '';
                          const teacher = users.find(u => (u._id === course.teacherId || u.id === course.teacherId));
                          return (
                             <tr key={cId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-4 font-medium text-slate-900 dark:text-white">{course.name}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">
                                   {teacher ? teacher.name : <span className="text-slate-400 dark:text-slate-500 italic">Biriktirilmagan</span>}
                                </td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center">
                                       <Clock size={16} className="mr-2 text-slate-400 dark:text-slate-500"/>
                                       {course.schedule}
                                    </div>
                                </td>
                                <td className="p-4 text-right font-medium text-slate-900 dark:text-white">
                                   {formatCurrency(course.price || 0)}
                                </td>
                                <td className="p-4 text-right">
                                   <Button variant="danger" className="py-1 px-2 text-xs h-8" onClick={() => handleRemoveCourse(cId)}><Trash2 size={14}/></Button>
                                </td>
                             </tr>
                          )
                      })}
                      {courses.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">Kurslar mavjud emas.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
             )}
          </div>
        );

      case AppView.STUDENTS:
        const currentTeacherCourse = courses.find(c => c.teacherId === currentUser?._id || c.teacherId === currentUser?.id);
        const selectedCourse = (currentUser?.role === 'SUPER_ADMIN' && selectedCourseId)
            ? courses.find(c => (c._id === selectedCourseId || c.id === selectedCourseId))
            : (currentUser?.role === 'TEACHER' ? currentTeacherCourse : undefined);
            
        const displayLessons = selectedCourse?.lessons || [];
        
        // Final list of students to show
        let displayStudents: Student[] = [];
        if (currentUser?.role === 'SUPER_ADMIN') {
            if (selectedCourse) {
                displayStudents = students.filter(s => s.courseName === selectedCourse.name);
            } else {
                displayStudents = students; // Show all for admin if no course selected
            }
        } else {
            displayStudents = filteredStudents; // Teacher's own students
        }

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">O'quvchilar Davomati</h2>
              <div className="flex items-center gap-3">
                  {currentUser?.role === 'SUPER_ADMIN' && (
                      <select 
                        value={selectedCourseId} 
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Barcha o'quvchilar</option>
                        {courses.map(c => (
                            <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                        ))}
                      </select>
                  )}
                  {(currentUser?.role === 'TEACHER' || (currentUser?.role === 'SUPER_ADMIN' && selectedCourse)) && (
                      <Button onClick={() => setIsLessonModalOpen(true)} icon={<Plus size={18} />}>Yangi Dars</Button>
                  )}
                  {currentUser?.role === 'SUPER_ADMIN' && (
                      <Button onClick={() => setIsStudentModalOpen(true)} icon={<UserPlus size={18} />}>O'quvchi Qo'shish</Button>
                  )}
              </div>
            </div>
            
            {isLoading ? <p className="dark:text-slate-400">Yuklanmoqda...</p> : (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="p-4 border-b dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[200px]">O'quvchi</th>
                    {displayLessons.map((lesson, idx) => (
                        <th key={idx} className="p-4 border-b dark:border-slate-800 text-center min-w-[100px]" title={lesson.topic}>
                            <div className="flex flex-col items-center">
                                <span>{lesson.date}</span>
                                <span className="text-[10px] lowercase font-normal text-slate-400 dark:text-slate-500 truncate max-w-[80px]">{lesson.topic}</span>
                            </div>
                        </th>
                    ))}
                    {!selectedCourse && <th className="p-4 border-b dark:border-slate-800">O'qituvchi / Kurs</th>}
                    <th className="p-4 border-b dark:border-slate-800 text-right min-w-[120px]">To'lov</th>
                    <th className="p-4 border-b dark:border-slate-800 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayStudents.map(student => {
                     const sId = student._id || student.id || '';
                     const teacher = users.find(u => (u._id === student.teacherId || u.id === student.teacherId));
                     return (
                        <tr key={sId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                            <td className="p-4 font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 border-r border-slate-100 dark:border-slate-800">
                                {student.name}
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{student.courseName}</div>
                            </td>
                            {displayLessons.map((lesson, idx) => {
                                const record = pendingAttendance[sId]?.[lesson.date] || student.attendance?.[lesson.date];
                                const isPending = !!pendingAttendance[sId]?.[lesson.date];
                                
                                let bgColor = 'bg-slate-100 dark:bg-slate-800';
                                let text = '';
                                if (record?.status === 'B') {
                                    bgColor = 'bg-green-500 text-white';
                                    text = 'B';
                                } else if (record?.status === 'Y') {
                                    bgColor = 'bg-red-500 text-white';
                                    text = 'Y';
                                }

                                return (
                                    <td key={idx} className="p-2 border-r border-slate-100 dark:border-slate-800 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div 
                                                onClick={() => {
                                                    const newStatus = record?.status === 'B' ? 'Y' : 'B';
                                                    markAttendance(sId, lesson.date, newStatus);
                                                }}
                                                className={`w-8 h-8 rounded flex items-center justify-center cursor-pointer transition-all hover:scale-110 shadow-sm ${bgColor} ${isPending ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                                            >
                                                {text}
                                            </div>
                                            {record?.status === 'Y' && record.reason && (
                                                <span className="text-[8px] text-slate-500 dark:text-slate-400 truncate max-w-[60px]" title={record.reason}>{record.reason}</span>
                                            )}
                                        </div>
                                    </td>
                                );
                            })}
                            {!selectedCourse && (
                                <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                                    {teacher?.name} <br/>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">{student.courseName}</span>
                                </td>
                            )}
                            <td className="p-4 text-right">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded border ${student.paid ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                                    {student.paid ? "OK" : "QARZ"}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {currentUser?.role === 'SUPER_ADMIN' && (
                                        <>
                                            <button 
                                                onClick={() => toggleStudentPayment(sId, student.paid)} 
                                                className={`p-1.5 rounded-full transition-colors ${student.paid ? 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                title="To'lov holatini o'zgartirish"
                                            >
                                                <DollarSign size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveStudent(sId)} 
                                                className="p-1.5 rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                     );
                  })}
                  {displayStudents.length === 0 && (
                      <tr>
                          <td colSpan={displayLessons.length + 4} className="p-12 text-center text-slate-400 dark:text-slate-500">
                              O'quvchilar topilmadi.
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}

            {Object.keys(pendingAttendance).length > 0 && (
                <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4">
                    <Button 
                        onClick={handleSaveAttendance} 
                        isLoading={isSavingAttendance}
                        className="shadow-2xl bg-green-600 hover:bg-green-700 px-8 py-4 text-lg rounded-full"
                        icon={<CheckCircle size={24} className="mr-2" />}
                    >
                        Saqlash
                    </Button>
                </div>
            )}
          </div>
        );
      
      case AppView.DEVICES:
        const devicesToShow = currentUser?.devices.map(d => ({ 
            ...d, 
            ownerName: 'Siz', 
            userId: currentUserId, 
            role: currentUser.role,
            isCurrent: d.id === currentDeviceId
        })) || [];

        return (
          <div className="space-y-6">
             <h2 className="text-2xl font-bold text-slate-800">Qurilmalar Monitoringi</h2>
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {devicesToShow.map((device, idx) => (
                    <div key={device.id + idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                        <div className={`p-3 rounded-full ${device.isCurrent ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900">{device.name}</h4>
                                {device.isCurrent && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">ONLINE</span>}
                            </div>
                            <p className="text-sm text-slate-600">
                                {device.ownerName} <span className="text-xs text-slate-400">({device.role})</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-1">IP: {device.ip} • Login: {formatDate(device.lastLogin)}</p>
                        </div>
                    </div>
                    {/* Updated: Button logic handles both Admin remove and self-remove. Button is now always visible unless it's current session */}
                    {!device.isCurrent && (
                        <Button 
                        variant="danger" 
                        className="text-xs h-9"
                        onClick={() => handleRemoteLogout(String(device.userId), device.id)}
                        icon={<LogOut size={14}/>}
                        >
                        Chiqarish
                        </Button>
                    )}
                    </div>
                ))}
             </div>
          </div>
        );

      case AppView.SETTINGS:
        if (currentUser?.role !== 'SUPER_ADMIN') return null;
        return (
             <div className="space-y-6">
               <h2 className="text-2xl font-bold text-slate-800">Tizim Sozlamalari</h2>
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-xl">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">O'quv Markaz Nomi</label>
                      <input 
                        type="text" 
                        value={settingsForm.centerName}
                        onChange={(e) => setSettingsForm({...settingsForm, centerName: e.target.value})}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                        <h4 className="text-md font-semibold text-slate-800 mb-3">Admin Hisobi</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Yangi Login</label>
                                <input 
                                    type="text" 
                                    value={settingsForm.username}
                                    onChange={(e) => setSettingsForm({...settingsForm, username: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Yangi Parol</label>
                                <input 
                                    type="password" 
                                    value={settingsForm.password}
                                    onChange={(e) => setSettingsForm({...settingsForm, password: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleUpdateSettings} className="w-full mt-2">Saqlash</Button>
                  </div>
               </div>
             </div>
          );

      default: // NOTIFICATIONS view if selected explicitly
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Barcha Eslatmalar</h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    {notifications.map(note => (
                         <div key={note.id} className="p-4 border-b border-slate-100 flex justify-between items-center">
                             <div>
                                <p className={`font-medium ${note.type === 'critical' ? 'text-red-600' : 'text-slate-800'}`}>{note.message}</p>
                                <span className="text-xs text-slate-400">{formatDate(note.date)} • {note.status}</span>
                             </div>
                         </div>
                    ))}
                    {notifications.length === 0 && <p className="p-8 text-center text-slate-500">Eslatmalar tarixi bo'sh.</p>}
                </div>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        userRole={currentUser?.role || 'TEACHER'}
        onLogout={handleLogout}
        centerName={currentUser?.centerName || 'EduCenter'}
        theme={theme}
        toggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />

      <div className={`lg:pl-64 transition-all duration-300`}>
        {/* Mobile Header */}
        <div className="lg:hidden h-16 bg-slate-900 flex items-center px-4 justify-between sticky top-0 z-10 shadow-md">
           <span className="text-white font-bold text-lg">{currentUser?.centerName || 'EduCenter'}</span>
           <button onClick={() => setSidebarOpen(true)} className="text-white p-2">
             <Menu size={24} />
           </button>
        </div>

        <main className="p-4 md:p-8 max-w-7xl mx-auto">
          {currentUser && renderContent()}
        </main>
      </div>

      {/* --- Modals --- */}
      
      {/* Add Teacher Modal */}
      <Modal isOpen={isTeacherModalOpen} onClose={() => setIsTeacherModalOpen(false)} title="Yangi O'qituvchi Qo'shish">
         <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Ism Familiya</label>
                <input 
                   type="text" 
                   className="w-full p-2 border rounded mt-1" 
                   value={newTeacher.name} 
                   onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} 
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Kurs Nomi</label>
                    <input type="text" className="w-full p-2 border rounded mt-1" value={newTeacher.courseName} onChange={e => setNewTeacher({...newTeacher, courseName: e.target.value})} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Kelgan Sanasi</label>
                    <input type="date" className="w-full p-2 border rounded mt-1" value={newTeacher.joinDate} onChange={e => setNewTeacher({...newTeacher, joinDate: e.target.value})} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Kurs Narxi (so'm)</label>
                    <input type="number" className="w-full p-2 border rounded mt-1" value={newTeacher.coursePrice} onChange={e => setNewTeacher({...newTeacher, coursePrice: Number(e.target.value)})} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Oylik Maosh (so'm)</label>
                    <input type="number" className="w-full p-2 border rounded mt-1" value={newTeacher.monthlySalary} onChange={e => setNewTeacher({...newTeacher, monthlySalary: Number(e.target.value)})} />
                </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold mb-2">Kirish Ma'lumotlari</h4>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Login" autoComplete="new-password" className="w-full p-2 border rounded" value={newTeacher.username} onChange={e => setNewTeacher({...newTeacher, username: e.target.value})} />
                    <input type="password" placeholder="Parol" autoComplete="new-password" className="w-full p-2 border rounded" value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} />
                </div>
                {usernameSuggestions.length > 0 && (
                    <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 mb-2">Tavsiyalar:</p>
                        <div className="flex flex-wrap gap-2">
                            {usernameSuggestions.map(s => (
                                <button 
                                    key={s} 
                                    type="button"
                                    onClick={() => setNewTeacher({...newTeacher, username: s})}
                                    className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {loginError && <p className="text-red-500 text-xs mt-2 text-center">{loginError}</p>}
            <Button className="w-full mt-2" onClick={handleAddTeacher}>Qo'shish</Button>
         </div>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal isOpen={isLessonModalOpen} onClose={() => setIsLessonModalOpen(false)} title="Yangi Dars Qo'shish">
         <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Dars Sanasi</label>
                <input 
                   type="date" 
                   className="w-full p-2 border rounded mt-1" 
                   value={newLesson.date} 
                   onChange={e => setNewLesson({...newLesson, date: e.target.value})} 
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Mavzu (Dars mavzusi)</label>
                <input 
                   type="text" 
                   placeholder="Masalan: O'tilgan mavzu takrorlash"
                   className="w-full p-2 border rounded mt-1" 
                   value={newLesson.topic} 
                   onChange={e => setNewLesson({...newLesson, topic: e.target.value})} 
                />
            </div>
            <Button className="w-full mt-2" onClick={handleAddLesson}>Darsni Qo'shish</Button>
         </div>
      </Modal>

      {/* Attendance Reason Modal */}
      <Modal isOpen={!!attendanceReasonModal} onClose={() => setAttendanceReasonModal(null)} title="Yo'qlik Sababi">
         <div className="space-y-4">
            <p className="text-sm text-slate-600">O'quvchi nima sababdan darsda qatnashmadi?</p>
            <textarea 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                placeholder="Sababni kiriting..."
                value={tempReason}
                onChange={e => setTempReason(e.target.value)}
            />
            <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setAttendanceReasonModal(null)}>Bekor qilish</Button>
                <Button className="flex-1" onClick={confirmAbsent}>Tasdiqlash (Y)</Button>
            </div>
         </div>
      </Modal>

      {/* Add Course Modal */}
      <Modal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} title="Yangi Kurs Qo'shish">
          <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700">Kurs Nomi</label>
                  <input 
                    type="text" 
                    placeholder="Masalan: IELTS Foundation"
                    className="w-full p-2 border rounded mt-1" 
                    value={newCourse.name}
                    onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700">O'qituvchi</label>
                  <select 
                    className="w-full p-2 border rounded mt-1 bg-white"
                    value={newCourse.teacherId}
                    onChange={e => setNewCourse({...newCourse, teacherId: e.target.value})}
                  >
                      <option value="">O'qituvchini tanlang (Ixtiyoriy)</option>
                      {activeTeachers.filter(t => !t.isLeft).map(t => (
                          <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>
                      ))}
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700">Dars Jadvali</label>
                  <input 
                    type="text" 
                    placeholder="Dushanba-Chorshanba-Juma 14:00"
                    className="w-full p-2 border rounded mt-1" 
                    value={newCourse.schedule}
                    onChange={e => setNewCourse({...newCourse, schedule: e.target.value})}
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700">Kurs Narxi</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded mt-1" 
                    value={newCourse.price || ''}
                    onChange={e => setNewCourse({...newCourse, price: Number(e.target.value)})}
                  />
              </div>
              <Button className="w-full mt-2" onClick={handleAddCourse}>Qo'shish</Button>
          </div>
      </Modal>

      {/* Add Student Modal */}
      <Modal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} title="Yangi O'quvchi Qo'shish">
         <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Ism Familiya</label>
                <input 
                   type="text" 
                   className="w-full p-2 border rounded mt-1" 
                   value={newStudent.name} 
                   onChange={e => setNewStudent({...newStudent, name: e.target.value})} 
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">O'qituvchi / Kurs</label>
                <select 
                   className="w-full p-2 border rounded mt-1 bg-white" 
                   value={newStudent.teacherId} 
                   onChange={e => setNewStudent({...newStudent, teacherId: e.target.value})}
                >
                    <option value="">Tanlang...</option>
                    {activeTeachers.filter(t => !t.isLeft).map(t => (
                        <option key={t._id || t.id} value={t._id || t.id}>{t.name} - {t.courseName}</option>
                    ))}
                </select>
            </div>
            <div className="flex items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                <input 
                   type="checkbox" 
                   id="paidCheck" 
                   className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 mr-3" 
                   checked={newStudent.paid} 
                   onChange={e => setNewStudent({...newStudent, paid: e.target.checked})} 
                />
                <label htmlFor="paidCheck" className="text-sm font-medium text-slate-700">
                    To'lov Statusi: {newStudent.paid ? <span className="text-green-600">To'langan</span> : <span className="text-red-500">To'lanmagan</span>}
                </label>
            </div>
            <Button className="w-full mt-2" onClick={handleAddStudent}>Qo'shish</Button>
         </div>
      </Modal>

      {/* Update Salary Modal */}
      <Modal isOpen={isSalaryModalOpen} onClose={() => setIsSalaryModalOpen(false)} title="Oylik Maoshni Tahrirlash">
          <div className="space-y-4">
              <p className="text-slate-600">O'qituvchi: <span className="font-semibold text-slate-900">{editingTeacher?.name}</span></p>
              <div>
                  <label className="block text-sm font-medium text-slate-700">Yangi Maosh Miqdori (so'm)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded mt-1" 
                    value={newSalaryAmount} 
                    onChange={e => setNewSalaryAmount(e.target.value)} 
                  />
              </div>
              <Button className="w-full mt-2" onClick={handleUpdateSalary}>Saqlash</Button>
          </div>
      </Modal>

    </div>
  );
};

export default Dashboard;