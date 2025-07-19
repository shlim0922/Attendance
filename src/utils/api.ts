import { projectId, publicAnonKey } from './supabase/info';
import { Student, AttendanceRecord } from '../types/student';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-9e330fc8`;

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      
      // Enhanced error handling for specific cases
      if (response.status === 404 && endpoint.includes('/attendance/checkin')) {
        throw new Error('Student not found with this QR code');
      } else if (response.status === 409 && endpoint.includes('/attendance/checkin')) {
        throw new Error(error.message || 'Student already checked in today');
      } else {
        throw new Error(error.error || error.message || `Server error: ${response.status}`);
      }
    }

    return response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network connection failed. Please check your internet connection.');
    }
    
    throw error;
  }
};

export const studentAPI = {
  getAll: async (): Promise<Student[]> => {
    try {
      const response = await apiRequest('/students');
      const students = response.students || [];
      // Filter out any null or invalid students
      return students.filter((student: any) => 
        student && student.id && student.name && student.email
      );
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  },

  create: async (student: Omit<Student, 'id' | 'qrCode' | 'createdAt'>): Promise<Student> => {
    const response = await apiRequest('/students', {
      method: 'POST',
      body: JSON.stringify(student),
    });
    return response.student;
  },

  update: async (id: string, updates: Partial<Student>): Promise<Student> => {
    const response = await apiRequest(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.student;
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest(`/students/${id}`, {
      method: 'DELETE',
    });
  },
};

export const attendanceAPI = {
  getAll: async (): Promise<AttendanceRecord[]> => {
    try {
      const response = await apiRequest('/attendance');
      const records = response.attendanceRecords || [];
      // Filter out any null or invalid records
      return records.filter((record: any) => 
        record && record.id && record.studentId && record.timestamp
      );
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      return [];
    }
  },

  getToday: async (): Promise<AttendanceRecord[]> => {
    try {
      const response = await apiRequest('/attendance/today');
      const records = response.attendanceRecords || [];
      // Filter out any null or invalid records
      return records.filter((record: any) => 
        record && record.id && record.studentId && record.timestamp
      );
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      return [];
    }
  },

  checkIn: async (qrCode: string): Promise<{ success: boolean; message: string; student: Student; attendanceRecord?: AttendanceRecord }> => {
    const response = await apiRequest('/attendance/checkin', {
      method: 'POST',
      body: JSON.stringify({ qrCode }),
    });
    return response;
  },
};

export const initializeAPI = {
  sampleData: async (): Promise<void> => {
    await apiRequest('/init-sample-data', {
      method: 'POST',
    });
  },

  health: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await apiRequest('/health');
    return response;
  },
};