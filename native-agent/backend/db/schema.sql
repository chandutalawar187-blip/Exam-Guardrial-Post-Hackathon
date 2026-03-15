-- ==========================================
-- EXAMGUARDRAIL DATABASE SCHEMA
-- Run in Supabase SQL Editor
-- ==========================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ORGANISATIONS (multi-tenant)
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_tier TEXT DEFAULT 'free',  -- free | growth | university | enterprise
  custom_rubric_json JSONB DEFAULT '{}',
  branding_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXAM SESSIONS
CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  student_name TEXT,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  exam_name TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',    -- active | completed | terminated
  credibility_score INTEGER DEFAULT 100,
  verdict TEXT DEFAULT 'CLEAR',    -- CLEAR | UNDER_REVIEW | SUSPICIOUS | FLAGGED
  platform TEXT,                   -- windows | macos | android | ios | chromeos
  device_type TEXT                 -- laptop | tablet | phone
);

-- BEHAVIORAL EVENTS
CREATE TABLE behavioral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,          -- CRITICAL | HIGH | MEDIUM | LOW
  score_delta INTEGER NOT NULL DEFAULT 0,
  platform TEXT,
  device_type TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- CREDIBILITY REPORTS
CREATE TABLE credibility_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL,
  executive_summary TEXT,
  flags_json JSONB DEFAULT '[]',
  recommendation TEXT,
  confidence FLOAT DEFAULT 0.0,
  generated_by TEXT DEFAULT 'claude-sonnet-4-6',
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NATIVE AGENT HEARTBEAT
CREATE TABLE native_agent_heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES exam_sessions(id),
  platform TEXT,
  os_version TEXT,
  agent_version TEXT DEFAULT '1.0.0',
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE credibility_reports ENABLE ROW LEVEL SECURITY;

-- REALTIME (enable for live dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE behavioral_events;

-- INDEXES for performance
CREATE INDEX idx_events_session ON behavioral_events(session_id);
CREATE INDEX idx_events_timestamp ON behavioral_events(timestamp DESC);
CREATE INDEX idx_sessions_org ON exam_sessions(org_id);
CREATE INDEX idx_sessions_status ON exam_sessions(status);

-- Insert a default test organisation
INSERT INTO organisations (name, plan_tier)
VALUES ('Test University', 'university');
