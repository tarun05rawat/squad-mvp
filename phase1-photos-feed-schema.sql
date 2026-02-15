-- Phase 1: Photos + Feed System Schema
-- Run this in Supabase SQL Editor after running the base schema

-- ============================================
-- PHOTOS SYSTEM
-- ============================================

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE, -- nullable, can be squad-wide photos
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo reactions
CREATE TABLE IF NOT EXISTS photo_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, user_id, emoji) -- one emoji per user per photo
);

-- Photo comments
CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FEED SYSTEM
-- ============================================

-- Feed items table
CREATE TABLE IF NOT EXISTS feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('event_created', 'voting_decided', 'photo_uploaded', 'comment_added')),
  entity_id UUID NOT NULL, -- references events, photos, or comments
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast feed queries
CREATE INDEX IF NOT EXISTS idx_feed_items_squad_created
  ON feed_items(squad_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_squad
  ON photos(squad_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_event
  ON photos(event_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;

-- Photos: visible to all squad members
CREATE POLICY "Squad members can view photos" ON photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM squad_members sm
      WHERE sm.squad_id = photos.squad_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Squad members can upload photos" ON photos
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM squad_members sm
      WHERE sm.squad_id = photos.squad_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Uploaders can delete own photos" ON photos
  FOR DELETE USING (auth.uid() = uploaded_by);

-- Photo reactions: squad members can react
CREATE POLICY "Squad members can view reactions" ON photo_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photos p
      JOIN squad_members sm ON sm.squad_id = p.squad_id
      WHERE p.id = photo_reactions.photo_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Squad members can add reactions" ON photo_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM photos p
      JOIN squad_members sm ON sm.squad_id = p.squad_id
      WHERE p.id = photo_reactions.photo_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own reactions" ON photo_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Photo comments: squad members can comment
CREATE POLICY "Squad members can view comments" ON photo_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photos p
      JOIN squad_members sm ON sm.squad_id = p.squad_id
      WHERE p.id = photo_comments.photo_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Squad members can add comments" ON photo_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM photos p
      JOIN squad_members sm ON sm.squad_id = p.squad_id
      WHERE p.id = photo_comments.photo_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own comments" ON photo_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Feed items: squad members can view
CREATE POLICY "Squad members can view feed" ON feed_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM squad_members sm
      WHERE sm.squad_id = feed_items.squad_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert feed items" ON feed_items
  FOR INSERT WITH CHECK (true); -- triggers will insert

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, DELETE ON photos TO authenticated;
GRANT SELECT, INSERT, DELETE ON photo_reactions TO authenticated;
GRANT SELECT, INSERT, DELETE ON photo_comments TO authenticated;
GRANT SELECT ON feed_items TO authenticated;
GRANT INSERT ON feed_items TO authenticated; -- for triggers

-- ============================================
-- FEED AUTO-INSERTION TRIGGERS
-- ============================================

-- Function to create feed item for event creation
CREATE OR REPLACE FUNCTION create_feed_item_for_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feed_items (squad_id, type, entity_id, created_by, created_at)
  VALUES (NEW.squad_id, 'event_created', NEW.id, auth.uid(), NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create feed item when voting is decided
CREATE OR REPLACE FUNCTION create_feed_item_for_voting_decided()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create feed item when status changes to 'decided'
  IF OLD.status = 'voting' AND NEW.status = 'decided' THEN
    INSERT INTO feed_items (squad_id, type, entity_id, created_by, created_at)
    VALUES (NEW.squad_id, 'voting_decided', NEW.id, auth.uid(), NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create feed item for photo upload
CREATE OR REPLACE FUNCTION create_feed_item_for_photo()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feed_items (squad_id, type, entity_id, created_by, created_at)
  VALUES (NEW.squad_id, 'photo_uploaded', NEW.id, NEW.uploaded_by, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create feed item for first comment on a photo
CREATE OR REPLACE FUNCTION create_feed_item_for_first_comment()
RETURNS TRIGGER AS $$
DECLARE
  comment_count INTEGER;
  photo_squad_id UUID;
BEGIN
  -- Count existing comments on this photo
  SELECT COUNT(*) INTO comment_count
  FROM photo_comments
  WHERE photo_id = NEW.photo_id;

  -- Only create feed item if this is the first comment
  IF comment_count = 1 THEN
    -- Get squad_id from photo
    SELECT squad_id INTO photo_squad_id
    FROM photos
    WHERE id = NEW.photo_id;

    INSERT INTO feed_items (squad_id, type, entity_id, created_by, created_at)
    VALUES (photo_squad_id, 'comment_added', NEW.id, NEW.user_id, NEW.created_at);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_feed_item_event_created ON events;
DROP TRIGGER IF EXISTS trigger_feed_item_voting_decided ON events;
DROP TRIGGER IF EXISTS trigger_feed_item_photo_uploaded ON photos;
DROP TRIGGER IF EXISTS trigger_feed_item_first_comment ON photo_comments;

-- Create triggers
CREATE TRIGGER trigger_feed_item_event_created
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_feed_item_for_event();

CREATE TRIGGER trigger_feed_item_voting_decided
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_feed_item_for_voting_decided();

CREATE TRIGGER trigger_feed_item_photo_uploaded
  AFTER INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION create_feed_item_for_photo();

CREATE TRIGGER trigger_feed_item_first_comment
  AFTER INSERT ON photo_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_feed_item_for_first_comment();

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE photos;
ALTER PUBLICATION supabase_realtime ADD TABLE photo_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE photo_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE feed_items;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('photos', 'photo_reactions', 'photo_comments', 'feed_items')
ORDER BY table_name;
