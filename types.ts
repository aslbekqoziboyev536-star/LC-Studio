import React from 'react';

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  TEACHERS = 'TEACHERS',
  STUDENTS = 'STUDENTS',
  COURSES = 'COURSES',
  NOTIFICATIONS = 'NOTIFICATIONS',
  DEVICES = 'DEVICES',
  SETTINGS = 'SETTINGS'
}

export type Role = 'SUPER_ADMIN' | 'TEACHER';

export interface Device {
  id: string; // MongoDB might imply manual ID or generated
  name: string;
  lastLogin: string;
  ip: string;
  isCurrent: boolean;
}

export interface User {
  _id?: string; // MongoDB ID
  id?: string;  // Frontend ID fallback
  role: Role;
  name: string;
  username: string;
  password?: string;
  courseName?: string; 
  coursePrice?: number;
  monthlySalary?: number;
  salaryPaid?: boolean;
  joinDate?: string; 
  isLeft?: boolean;
  devices: Device[];
  centerName?: string;
}

export interface Lesson {
  date: string;
  topic: string;
  createdAt: string;
}

export interface Course {
  _id?: string;
  id?: string;
  name: string;
  teacherId?: string; // Links to User (Teacher)
  schedule: string; // e.g., "Mon-Wed-Fri 14:00"
  price?: number;
  lessons?: Lesson[];
}

export interface AttendanceRecord {
  status: 'B' | 'Y';
  reason?: string;
}

export interface Student {
  _id?: string;
  id?: string;
  name: string;
  teacherId: string;
  courseName: string;
  paid: boolean;
  attendance: Record<string, AttendanceRecord>; 
  centerName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'warning' | 'info' | 'critical' | 'success';
  date: string;
  isRead: boolean;
  status: 'active' | 'resolved';
}

export interface SidebarItem {
  id: AppView;
  label: string;
  icon: React.ReactNode;
  allowedRoles: Role[];
}