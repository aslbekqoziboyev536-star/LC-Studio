import { User, Student, Device, Course } from './types';

// Mock Data Generation
const generateDevice = (name: string, isCurrent: boolean = false): Device => ({
  id: Math.random().toString(36).substr(2, 9),
  name,
  lastLogin: new Date().toISOString(),
  ip: '192.168.1.' + Math.floor(Math.random() * 255),
  isCurrent
});

export const MODEL_CHAT = 'gemini-3-flash-preview';
export const MODEL_IMAGE = 'gemini-2.5-flash-image';
export const SYSTEM_INSTRUCTION_CHAT = 'You are a helpful assistant for an educational center management system.';

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    role: 'SUPER_ADMIN',
    name: 'Director Admin',
    username: 'admin',
    password: '123',
    centerName: 'Kelajak Academy',
    devices: [generateDevice('MacBook Pro', true), generateDevice('iPhone 13')]
  },
  {
    id: 'u2',
    role: 'TEACHER',
    name: 'Azizbek Tursunov',
    username: 'aziz',
    password: '123',
    courseName: 'Frontend React',
    coursePrice: 800000,
    monthlySalary: 5000000,
    salaryPaid: false,
    joinDate: '2023-10-15', // Payday is 15th
    isLeft: false,
    devices: [generateDevice('Windows Laptop')]
  },
  {
    id: 'u3',
    role: 'TEACHER',
    name: 'Malika Karimova',
    username: 'malika',
    password: '123',
    courseName: 'General English',
    coursePrice: 600000,
    monthlySalary: 4000000,
    salaryPaid: true,
    joinDate: '2023-09-01', // Payday is 1st
    isLeft: false,
    devices: [generateDevice('Samsung S21')]
  }
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    name: 'Frontend React',
    teacherId: 'u2',
    schedule: 'Mon-Wed-Fri 14:00',
    price: 800000
  },
  {
    id: 'c2',
    name: 'General English',
    teacherId: 'u3',
    schedule: 'Tue-Thu-Sat 10:00',
    price: 600000
  },
  {
    id: 'c3',
    name: 'Foundation Math',
    teacherId: '', 
    schedule: 'Mon-Wed-Fri 16:00',
    price: 500000
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 's1',
    name: 'Otabek Nurmatov',
    teacherId: 'u2',
    courseName: 'Frontend React',
    paid: true,
    attendance: { 
      '2023-10-25': { status: 'B' }, 
      '2023-10-27': { status: 'B' } 
    }
  },
  {
    id: 's2',
    name: 'Sardor Rahimov',
    teacherId: 'u2',
    courseName: 'Frontend React',
    paid: false,
    attendance: { 
      '2023-10-25': { status: 'Y', reason: 'Kasal' }, 
      '2023-10-27': { status: 'B' } 
    }
  },
  {
    id: 's3',
    name: 'Zarina Aliyeva',
    teacherId: 'u3',
    courseName: 'General English',
    paid: true,
    attendance: { 
      '2023-10-26': { status: 'B' } 
    }
  }
];