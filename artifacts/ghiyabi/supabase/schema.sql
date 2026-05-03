-- =============================================================
-- Ghiyabi (غيابي) — School Attendance System
-- Supabase Schema for Zaid Bin Thabit Primary School
-- =============================================================

-- 1. classes
CREATE TABLE IF NOT EXISTS classes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,          -- e.g. "3-A"
  grade_level   TEXT NOT NULL,          -- e.g. "Grade 3"
  teacher_phone TEXT
);

-- 2. students
CREATE TABLE IF NOT EXISTS students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  class_id      UUID REFERENCES classes(id) ON DELETE SET NULL,
  parent_email  TEXT,
  parent_phone  TEXT,
  is_active     BOOLEAN DEFAULT true
);

-- 3. sessions
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  period        TEXT NOT NULL,           -- "P1".."P6"
  subject       TEXT NOT NULL,
  class_id      UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_phone TEXT NOT NULL
);

-- 4. attendance_log
CREATE TABLE IF NOT EXISTS attendance_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID REFERENCES students(id) ON DELETE CASCADE,
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'Present'
              CHECK (status IN ('Present','Absent','Late','Excused')),
  marked_at   TIMESTAMPTZ DEFAULT now(),
  note        TEXT,
  UNIQUE(student_id, session_id)       -- prevent duplicates
);

-- 5. admins
CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY
);

-- 6. teachers
CREATE TABLE IF NOT EXISTS teachers (
  phone      TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT false
);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE classes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers        ENABLE ROW LEVEL SECURITY;

-- Helper function: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE email = auth.email()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----- classes -----

-- Admins: full access
CREATE POLICY "admins_all_classes" ON classes
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anyone (including unauthenticated / teacher sessions): read all classes
CREATE POLICY "public_read_classes" ON classes
  FOR SELECT
  USING (NOT is_admin());

-- ----- students -----

-- Admins: full access
CREATE POLICY "admins_all_students" ON students
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anyone: read all active students
CREATE POLICY "public_read_students" ON students
  FOR SELECT
  USING (NOT is_admin());

-- ----- sessions -----

-- Admins: full access
CREATE POLICY "admins_all_sessions" ON sessions
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anyone: read all sessions
CREATE POLICY "public_read_sessions" ON sessions
  FOR SELECT
  USING (NOT is_admin());

-- ----- attendance_log -----

-- Admins: full access
CREATE POLICY "admins_all_attendance" ON attendance_log
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anyone: read and write attendance (teachers mark attendance without Supabase Auth)
CREATE POLICY "public_read_attendance" ON attendance_log
  FOR SELECT
  USING (NOT is_admin());

CREATE POLICY "public_write_attendance" ON attendance_log
  FOR INSERT
  WITH CHECK (NOT is_admin());

CREATE POLICY "public_update_attendance" ON attendance_log
  FOR UPDATE
  USING (NOT is_admin())
  WITH CHECK (NOT is_admin());

-- ----- admins -----

-- Only admins can read the admins table
CREATE POLICY "admins_read_admins" ON admins
  FOR SELECT
  USING (is_admin() OR email = auth.email());

-- Only admins can modify admins table
CREATE POLICY "admins_write_admins" ON admins
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----- teachers -----

-- Admins: full access
CREATE POLICY "admins_all_teachers" ON teachers
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anyone: read active teachers (needed for login check)
CREATE POLICY "public_read_teachers" ON teachers
  FOR SELECT
  USING (true);

-- =============================================================
-- INDEXES for performance
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_students_class_id     ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active    ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_date         ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher      ON sessions(teacher_phone);
CREATE INDEX IF NOT EXISTS idx_sessions_class_id     ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance_log(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_log(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status     ON attendance_log(status);
