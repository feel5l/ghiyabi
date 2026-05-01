-- =============================================================
-- Ghiyabi (غيابي) — School Attendance System
-- Supabase schema for Zaid Bin Thabit Primary School
-- =============================================================
-- Login model:
--   * Admin: email + password (Supabase auth).
--   * Teacher: phone-only. The admin pre-provisions teachers via the
--     provision-teacher Edge Function. Teachers sign in via the
--     teacher-login Edge Function which exchanges their phone for a
--     real Supabase session.
-- =============================================================

-- 1. classes
CREATE TABLE IF NOT EXISTS classes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  grade_level   TEXT NOT NULL,
  teacher_email TEXT,                                -- legacy column, kept for safe migration
  teacher_id    UUID                                  -- FK added below
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
  period        TEXT NOT NULL,
  subject       TEXT NOT NULL,
  class_id      UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_email TEXT,                                 -- legacy column, kept for safe migration
  teacher_id    UUID                                  -- FK added below
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
  UNIQUE(student_id, session_id)
);

-- 5. admins (email-keyed)
CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY
);

-- 6. teachers (phone-keyed, id matches auth.users.id)
CREATE TABLE IF NOT EXISTS teachers (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE classes  DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;
ALTER TABLE classes  ADD CONSTRAINT classes_teacher_id_fkey  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_teacher_id_fkey;
ALTER TABLE sessions ADD CONSTRAINT sessions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE classes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers        ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE email = auth.email());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_teacher_id()
RETURNS UUID AS $$
  SELECT id FROM teachers WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----- classes -----
DROP POLICY IF EXISTS admins_all_classes        ON classes;
DROP POLICY IF EXISTS teachers_read_own_classes ON classes;

CREATE POLICY admins_all_classes ON classes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY teachers_read_own_classes ON classes
  FOR SELECT USING (
    NOT is_admin() AND (
      teacher_id = current_teacher_id()
      OR id IN (SELECT class_id FROM sessions WHERE teacher_id = current_teacher_id())
    )
  );

-- ----- students -----
DROP POLICY IF EXISTS admins_all_students          ON students;
DROP POLICY IF EXISTS teachers_read_class_students ON students;

CREATE POLICY admins_all_students ON students
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY teachers_read_class_students ON students
  FOR SELECT USING (
    NOT is_admin() AND class_id IN (
      SELECT id FROM classes WHERE teacher_id = current_teacher_id()
      UNION
      SELECT class_id FROM sessions WHERE teacher_id = current_teacher_id()
    )
  );

-- ----- sessions -----
DROP POLICY IF EXISTS admins_all_sessions  ON sessions;
DROP POLICY IF EXISTS teachers_own_sessions ON sessions;

CREATE POLICY admins_all_sessions ON sessions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY teachers_own_sessions ON sessions
  FOR ALL
  USING (teacher_id = current_teacher_id())
  WITH CHECK (teacher_id = current_teacher_id());

-- ----- attendance_log -----
DROP POLICY IF EXISTS admins_all_attendance              ON attendance_log;
DROP POLICY IF EXISTS teachers_own_session_attendance    ON attendance_log;

CREATE POLICY admins_all_attendance ON attendance_log
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY teachers_own_session_attendance ON attendance_log
  FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE teacher_id = current_teacher_id()))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE teacher_id = current_teacher_id()));

-- ----- admins -----
DROP POLICY IF EXISTS admins_read_admins  ON admins;
DROP POLICY IF EXISTS admins_write_admins ON admins;

CREATE POLICY admins_read_admins ON admins
  FOR SELECT USING (is_admin() OR email = auth.email());

CREATE POLICY admins_write_admins ON admins
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ----- teachers -----
DROP POLICY IF EXISTS admins_all_teachers ON teachers;
DROP POLICY IF EXISTS teachers_read_self  ON teachers;

CREATE POLICY admins_all_teachers ON teachers
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY teachers_read_self ON teachers
  FOR SELECT USING (id = auth.uid());

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_students_class_id     ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active    ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_date         ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher      ON sessions(teacher_email);
CREATE INDEX IF NOT EXISTS idx_sessions_class_id     ON sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id   ON sessions(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id    ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance_log(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_log(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status     ON attendance_log(status);
