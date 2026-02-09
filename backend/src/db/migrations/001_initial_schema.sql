-- CalAnywhere initial schema

-- Users (for future auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(100) NOT NULL,
  bio VARCHAR(200),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved calendars with encrypted URLs (for future dashboard)
CREATE TABLE IF NOT EXISTS saved_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  encrypted_url TEXT NOT NULL,
  encryption_iv VARCHAR(255) NOT NULL,
  auth_tag VARCHAR(255) NOT NULL,
  calendar_type VARCHAR(20) DEFAULT 'ical',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduling pages (supports both anonymous and user-owned)
CREATE TABLE IF NOT EXISTS scheduling_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  slug VARCHAR(30) UNIQUE NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  owner_email VARCHAR(255) NOT NULL,
  bio VARCHAR(200),
  default_duration_minutes INT DEFAULT 30,
  buffer_minutes INT DEFAULT 0,
  date_range_days INT DEFAULT 60,
  min_notice_hours INT DEFAULT 8,
  include_weekends BOOLEAN DEFAULT FALSE,
  is_anonymous BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Calendar URLs for a scheduling page
CREATE TABLE IF NOT EXISTS page_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES scheduling_pages(id) ON DELETE CASCADE,
  saved_calendar_id UUID REFERENCES saved_calendars(id) ON DELETE CASCADE,
  raw_calendar_url TEXT
);

-- Pending email verification requests
CREATE TABLE IF NOT EXISTS pending_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  page_slug VARCHAR(30) NOT NULL,
  requester_name VARCHAR(100) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  start_iso VARCHAR(30) NOT NULL,
  end_iso VARCHAR(30) NOT NULL,
  timezone VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Confirmed bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES scheduling_pages(id) ON DELETE CASCADE,
  requester_name VARCHAR(100) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduling_pages_slug ON scheduling_pages(slug);
CREATE INDEX IF NOT EXISTS idx_scheduling_pages_expires ON scheduling_pages(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_requests_token ON pending_requests(token);
CREATE INDEX IF NOT EXISTS idx_pending_requests_expires ON pending_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_saved_calendars_user ON saved_calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_page ON bookings(page_id);
