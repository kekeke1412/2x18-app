// src/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Auth helpers ──────────────────────────────────────────
export const signUp = (email, password, meta) =>
  supabase.auth.signUp({ email, password, options: { data: meta } });

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getUser = () => supabase.auth.getUser();

// ── Database helpers ──────────────────────────────────────
export const db = {
  profiles:     () => supabase.from('profiles'),
  grades:       () => supabase.from('grades'),
  tasks:        () => supabase.from('tasks'),
  sme:          () => supabase.from('sme_assignments'),
  events:       () => supabase.from('calendar_events'),
  roadmap:      () => supabase.from('roadmap_events'),
  votes:        () => supabase.from('votes'),
  vote_choices: () => supabase.from('vote_choices'),
  attendance:   () => supabase.from('attendance'),
  docs:         () => supabase.from('documents'),
  notifications:() => supabase.from('notifications'),
  audit:        () => supabase.from('audit_log'),
};

/*
═══════════════════════════════════════════════════
   SUPABASE SQL SCHEMA — Chạy trong SQL Editor
═══════════════════════════════════════════════════

-- 1. PROFILES (extend auth.users)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mssv         TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  role         TEXT DEFAULT 'pending',     -- pending | member | core | super_admin
  gender       TEXT,
  dob          DATE,
  ethnicity    TEXT,
  blood_type   TEXT,
  pob          TEXT,
  cccd         TEXT,
  bank         TEXT,
  phone        TEXT,
  phone_family TEXT,
  mail_school  TEXT,
  mail_vnu     TEXT,
  mail_personal TEXT,
  facebook     TEXT,
  hometown     TEXT,
  permanent_address TEXT,
  current_address   TEXT,
  joined_youth DATE,
  joined_party DATE,
  contribution_points INT DEFAULT 0,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GRADES
CREATE TABLE grades (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  status     TEXT DEFAULT 'Chưa học',
  semester   INT,
  cc         NUMERIC(4,2),
  gk         NUMERIC(4,2),
  ck         NUMERIC(4,2),
  my_progress INT DEFAULT 0,
  UNIQUE(user_id, subject_id)
);

-- 3. SME ASSIGNMENTS
CREATE TABLE sme_assignments (
  subject_id TEXT PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TASKS
CREATE TABLE tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id  TEXT,
  task        TEXT NOT NULL,
  deadline    DATE,
  type        TEXT DEFAULT 'Cá nhân',
  done        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CALENDAR EVENTS
CREATE TABLE calendar_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  start_time  TEXT,
  end_time    TEXT,
  type        TEXT DEFAULT 'other',
  location    TEXT,
  description TEXT,
  guests      TEXT,
  all_day     BOOLEAN DEFAULT FALSE,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ROADMAP
CREATE TABLE roadmap_events (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year    INT NOT NULL,
  month   TEXT,
  level   TEXT,
  status  TEXT DEFAULT 'None',
  task    TEXT,
  pic     TEXT,
  goal    TEXT,
  checked BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0
);

-- 7. VOTES
CREATE TABLE votes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  creator_id   UUID REFERENCES profiles(id),
  deadline     TIMESTAMPTZ,
  multi_select BOOLEAN DEFAULT FALSE,
  closed       BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vote_options (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
  text    TEXT NOT NULL
);

CREATE TABLE vote_choices (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID REFERENCES vote_options(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES profiles(id),
  UNIQUE(option_id, user_id)
);

-- 8. ATTENDANCE
CREATE TABLE attendance_sessions (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title   TEXT NOT NULL,
  date    DATE NOT NULL,
  created_by UUID REFERENCES profiles(id)
);

CREATE TABLE attendance_records (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id),
  checked_in BOOLEAN DEFAULT FALSE,
  UNIQUE(session_id, user_id)
);

-- 9. DOCUMENTS
CREATE TABLE documents (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  type       TEXT,
  url        TEXT,
  drive_link TEXT,
  private    BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. NOTIFICATIONS
CREATE TABLE notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id),
  type       TEXT,
  message    TEXT NOT NULL,
  link       TEXT,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AUDIT LOG
CREATE TABLE audit_log (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id),
  action     TEXT NOT NULL,
  target     TEXT,
  detail     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sme_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_choices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- Helper: is_core()
CREATE OR REPLACE FUNCTION is_core()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT role IN ('core','super_admin')
  FROM profiles WHERE id = auth.uid()
$$;

-- Profiles: ai cũng xem được, chỉ sửa của mình / core sửa tất cả
CREATE POLICY "read_profiles"   ON profiles FOR SELECT USING (true);
CREATE POLICY "update_own"      ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "core_update_all" ON profiles FOR UPDATE USING (is_core());

-- Grades: chỉ xem của mình; core xem tất cả
CREATE POLICY "own_grades"      ON grades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "core_read_grades"ON grades FOR SELECT USING (is_core());

-- Tasks: own tasks; core all
CREATE POLICY "own_tasks"       ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "core_read_tasks" ON tasks FOR SELECT USING (is_core());

-- Calendar: authenticated users read; core write
CREATE POLICY "read_events"     ON calendar_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "core_write_events" ON calendar_events FOR ALL USING (is_core());
CREATE POLICY "own_event"       ON calendar_events FOR ALL USING (auth.uid() = created_by);

-- SME: read all; core write
CREATE POLICY "read_sme"        ON sme_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "core_write_sme"  ON sme_assignments FOR ALL USING (is_core());

-- Docs: read (non-private); SME write
CREATE POLICY "read_public_docs" ON documents FOR SELECT USING (private = false OR is_core());
CREATE POLICY "upload_docs"      ON documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications: own
CREATE POLICY "own_notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Roadmap: all read; core write
CREATE POLICY "read_roadmap"    ON roadmap_events FOR SELECT USING (true);
CREATE POLICY "core_roadmap"    ON roadmap_events FOR ALL USING (is_core());

-- Votes: all read; core create
CREATE POLICY "read_votes"      ON votes FOR SELECT USING (true);
CREATE POLICY "core_votes"      ON votes FOR INSERT WITH CHECK (is_core());
CREATE POLICY "vote_choices_own" ON vote_choices FOR ALL USING (auth.uid() = user_id);

-- Audit log: core read; system write
CREATE POLICY "core_audit"      ON audit_log FOR SELECT USING (is_core());
CREATE POLICY "insert_audit"    ON audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
*/
