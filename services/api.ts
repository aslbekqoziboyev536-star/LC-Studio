import { API_BASE_URL } from '../config';
import { User, Student, Course } from '../types';

// Helper for HTTP requests
const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      const errorMessage = data?.message || `Server xatosi: ${response.status}`;
      const error: any = new Error(errorMessage);
      error.data = data;
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error);
    // Xatoni yuqoriga uzatamiz, shunda UI (Dashboard.tsx) buni ushlab foydalanuvchiga ko'rsata oladi
    throw error; 
  }
};

export const api = {
  // Auth
  login: (credentials: any) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  getMe: () => request('/auth/me'),

  // Users (Teachers/Admins)
  getUsers: () => request('/users'),
  createUser: (user: Partial<User>) => request('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  }),
  updateUser: (id: string, updates: Partial<User>) => request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),
  deleteUser: (id: string) => request(`/users/${id}`, {
    method: 'DELETE',
  }),

  // Courses
  getCourses: () => request('/courses'),
  createCourse: (course: Partial<Course>) => request('/courses', {
      method: 'POST',
      body: JSON.stringify(course)
  }),
  updateCourse: (id: string, updates: Partial<Course>) => request(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
  }),
  deleteCourse: (id: string) => request(`/courses/${id}`, {
      method: 'DELETE'
  }),

  // Students
  getStudents: () => request('/students'),
  createStudent: (student: Partial<Student>) => request('/students', {
    method: 'POST',
    body: JSON.stringify(student),
  }),
  updateStudent: (id: string, updates: Partial<Student>) => request(`/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),
  deleteStudent: (id: string) => request(`/students/${id}`, {
    method: 'DELETE',
  }),
  bulkUpdateStudents: (updates: any[]) => request('/students/bulk', {
    method: 'PUT',
    body: JSON.stringify({ updates })
  }),

  // Specific Actions
  logoutDevice: (userId: string, deviceId: string) => request(`/users/${userId}/devices/${deviceId}`, {
      method: 'DELETE'
  })
};