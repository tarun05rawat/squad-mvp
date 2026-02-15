-- Squad MVP Database Schema
-- Run this in your Supabase SQL Editor (https://app.supabase.com → SQL Editor)

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Squads table
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Squad members (many-to-many)
CREATE TABLE IF NOT EXISTS squad_members (
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (squad_id, user_id)
);

-- Add foreign key to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'squad_members_user_id_fkey_users'
  ) THEN
    ALTER TABLE squad_members
    ADD CONSTRAINT squad_members_user_id_fkey_users
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  voting_closes_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'voting' CHECK (status IN ('voting', 'decided')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event options
CREATE TABLE IF NOT EXISTS event_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  option_name TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0
);

-- Event votes (one vote per user per option)
CREATE TABLE IF NOT EXISTS event_votes (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  option_id UUID REFERENCES event_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, option_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: can read all users, can update own profile
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Squads: members can view their squads, anyone authenticated can create
CREATE POLICY "Authenticated users can view squads" ON squads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create squads" ON squads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Squad members: can view members of squads they belong to, can join squads
CREATE POLICY "View squad members" ON squad_members FOR SELECT USING (true);
CREATE POLICY "Join squads" ON squad_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Events: members can view events in their squads, members can create events
CREATE POLICY "View events" ON events FOR SELECT USING (true);
CREATE POLICY "Create events" ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update events" ON events FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Event options: viewable by all authenticated, creatable by event creators
CREATE POLICY "View options" ON event_options FOR SELECT USING (true);
CREATE POLICY "Create options" ON event_options FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Update options" ON event_options FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Event votes: one vote per user per option
CREATE POLICY "View votes" ON event_votes FOR SELECT USING (true);
CREATE POLICY "Cast votes" ON event_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT ON users TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;

GRANT SELECT ON squads TO authenticated;
GRANT INSERT ON squads TO authenticated;

GRANT SELECT ON squad_members TO authenticated;
GRANT INSERT ON squad_members TO authenticated;

GRANT SELECT ON events TO authenticated;
GRANT INSERT ON events TO authenticated;
GRANT UPDATE ON events TO authenticated;

GRANT SELECT ON event_options TO authenticated;
GRANT INSERT ON event_options TO authenticated;
GRANT UPDATE ON event_options TO authenticated;

GRANT SELECT ON event_votes TO authenticated;
GRANT INSERT ON event_votes TO authenticated;

-- Enable realtime for event_options (for live vote counts)
ALTER PUBLICATION supabase_realtime ADD TABLE event_options;
