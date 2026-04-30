import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface Class {
  id: string;
  name: string;
  grade_level: string;
  teacher_email: string | null;
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
  teacher_email: string;
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
