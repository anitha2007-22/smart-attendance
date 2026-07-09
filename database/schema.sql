-- ============================================================
-- Smart Student Attendance Monitoring & Analytics System
-- PostgreSQL Schema (3NF Normalized)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'student');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE attendance_method AS ENUM ('qr', 'manual');
CREATE TYPE session_status AS ENUM ('active', 'closed');
CREATE TYPE trust_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE notification_type AS ENUM (
  'low_attendance', 'attendance_shortage', 'leave_approved',
  'leave_rejected', 'session_started', 'general'
);
CREATE TYPE day_of_week AS ENUM (
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
);

-- ------------------------------------------------------------
-- DEPARTMENTS
-- ------------------------------------------------------------
CREATE TABLE departments (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL UNIQUE,
  code          VARCHAR(20)  NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- USERS (base auth table for all roles)
-- ------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  role          user_role NOT NULL,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         VARCHAR(20),
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ------------------------------------------------------------
-- STUDENTS (extends users)
-- ------------------------------------------------------------
CREATE TABLE students (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  roll_no        VARCHAR(30) NOT NULL UNIQUE,
  department_id  INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  semester       INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 12),
  batch_year     INTEGER NOT NULL,
  parent_contact VARCHAR(20),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_students_department ON students(department_id);
CREATE INDEX idx_students_roll_no ON students(roll_no);

-- ------------------------------------------------------------
-- FACULTY (extends users)
-- ------------------------------------------------------------
CREATE TABLE faculty (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  department_id  INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  designation    VARCHAR(100),
  employee_code  VARCHAR(30) NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_faculty_department ON faculty(department_id);

-- ------------------------------------------------------------
-- SUBJECTS
-- ------------------------------------------------------------
CREATE TABLE subjects (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  code           VARCHAR(30) NOT NULL UNIQUE,
  department_id  INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  semester       INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 12),
  credits        INTEGER NOT NULL DEFAULT 3,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subjects_department ON subjects(department_id);

-- ------------------------------------------------------------
-- FACULTY_SUBJECTS (many-to-many assignment)
-- ------------------------------------------------------------
CREATE TABLE faculty_subjects (
  id           SERIAL PRIMARY KEY,
  faculty_id   INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  subject_id   INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (faculty_id, subject_id)
);

-- ------------------------------------------------------------
-- TIMETABLE
-- ------------------------------------------------------------
CREATE TABLE timetable (
  id             SERIAL PRIMARY KEY,
  subject_id     INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id     INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  department_id  INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  semester       INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 12),
  day_of_week    day_of_week NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  room_no        VARCHAR(30),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);
CREATE INDEX idx_timetable_faculty ON timetable(faculty_id);
CREATE INDEX idx_timetable_department_sem ON timetable(department_id, semester);
CREATE INDEX idx_timetable_day ON timetable(day_of_week);

-- ------------------------------------------------------------
-- ATTENDANCE SESSIONS (one per class instance)
-- ------------------------------------------------------------
CREATE TABLE attendance_sessions (
  id             SERIAL PRIMARY KEY,
  timetable_id   INTEGER REFERENCES timetable(id) ON DELETE SET NULL,
  faculty_id     INTEGER NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  subject_id     INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  department_id  INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  semester       INTEGER NOT NULL,
  session_date   DATE NOT NULL,
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ,
  status         session_status NOT NULL DEFAULT 'active',
  qr_secret      TEXT,                     -- rotating token base secret
  qr_expires_at  TIMESTAMPTZ,
  active_short_code VARCHAR(6),
  is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_faculty ON attendance_sessions(faculty_id);
CREATE INDEX idx_sessions_subject ON attendance_sessions(subject_id);
CREATE INDEX idx_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_sessions_status ON attendance_sessions(status);

-- ------------------------------------------------------------
-- ATTENDANCE RECORDS
-- ------------------------------------------------------------
CREATE TABLE attendance_records (
  id            SERIAL PRIMARY KEY,
  session_id    INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status        attendance_status NOT NULL DEFAULT 'present',
  method        attendance_method NOT NULL DEFAULT 'qr',
  marked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trust_score   INTEGER NOT NULL DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
  trust_level   trust_level NOT NULL DEFAULT 'high',
  is_flagged    BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason   TEXT,
  device_info   TEXT,
  ip_address    VARCHAR(64),
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)   -- prevents duplicate attendance
);
CREATE INDEX idx_records_student ON attendance_records(student_id);
CREATE INDEX idx_records_session ON attendance_records(session_id);
CREATE INDEX idx_records_flagged ON attendance_records(is_flagged);
CREATE INDEX idx_records_status ON attendance_records(status);

-- ------------------------------------------------------------
-- LEAVE REQUESTS
-- ------------------------------------------------------------
CREATE TABLE leave_requests (
  id            SERIAL PRIMARY KEY,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_date     DATE NOT NULL,
  to_date       DATE NOT NULL,
  reason        TEXT NOT NULL,
  status        leave_status NOT NULL DEFAULT 'pending',
  reviewed_by   INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  review_comment TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (to_date >= from_date)
);
CREATE INDEX idx_leave_student ON leave_requests(student_id);
CREATE INDEX idx_leave_status ON leave_requests(status);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        notification_type NOT NULL DEFAULT 'general',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ------------------------------------------------------------
-- REFRESH TOKENS (for JWT refresh rotation / logout)
-- ------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ------------------------------------------------------------
-- AUDIT LOGS
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(100),
  entity_id   INTEGER,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);

-- ------------------------------------------------------------
-- AUTO-UPDATE updated_at TRIGGER FUNCTION
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['departments','users','students','faculty','subjects',
                            'timetable','attendance_sessions','leave_requests']
  LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
                     FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();', t);
  END LOOP;
END $$;
