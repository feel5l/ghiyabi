import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string || '').trim().replace(/['"]/g, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string || '').trim().replace(/['"]/g, '');

// Validate that the URL looks like a real Supabase URL
const isValidUrl = supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://');

if (!isValidUrl || !supabaseAnonKey) {
  console.warn(`Supabase config missing or invalid. URL: "${supabaseUrl}"`);
}

export const supabase = createClient(
  isValidUrl ? supabaseUrl : 'https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
);

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface Class {
  id: string;
  name: string;
  grade_level: string;
  teacher_phone: string | null;
}

export interface Teacher {
  phone: string;
  name: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  full_name: string;
  class_id: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  is_active: boolean;
}

export interface Session {
  id: string;
  date: string;
  period: string;
  subject: string;
  class_id: string | null;
  teacher_phone: string;
  classes?: Class;
}

export interface AttendanceLog {
  id: string;
  student_id: string;
  session_id: string;
  status: AttendanceStatus;
  marked_at: string;
  note: string | null;
  students?: Student;
}
