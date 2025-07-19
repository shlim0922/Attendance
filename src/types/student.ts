export interface Student {
  id: string;
  name: string;
  email: string;
  studentNumber: string;
  country: string;
  qrCode: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
  notes?: string;
}

export interface AttendanceSession {
  id: string;
  date: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}