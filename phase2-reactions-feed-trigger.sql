-- Phase 2: Add Photo Reactions to Feed System
-- Run this in Supabase SQL Editor after running phase1-photos-feed-schema.sql

-- ============================================
-- UPDATE FEED ITEM TYPES
-- ============================================

-- First, drop the existing constraint
ALTER TABLE feed_items
DROP CONSTRAINT IF EXISTS feed_items_type_check;

-- Add new constraint with photo_reacted type
ALTER TABLE feed_items
ADD CONSTRAINT feed_items_type_check
CHECK (type IN ('event_created', 'voting_decided', 'photo_uploaded', 'comment_added', 'photo_reacted'));

-- ============================================
-- FEED AUTO-INSERTION FOR REACTIONS
-- ============================================

-- Function to create feed item for first reaction on a photo
CREATE OR REPLACE FUNCTION create_feed_item_for_first_reaction()
RETURNS TRIGGER AS $$
DECLARE
  reaction_count INTEGER;
  photo_squad_id UUID;
  photo_uploader_id UUID;
BEGIN
  -- Count existing reactions on this photo
  SELECT COUNT(*) INTO reaction_count
  FROM photo_reactions
  WHERE photo_id = NEW.photo_id;

  -- Only create feed item if this is the first reaction
  IF reaction_count = 1 THEN
    -- Get squad_id and uploader from photo
    SELECT squad_id, uploaded_by INTO photo_squad_id, photo_uploader_id
    FROM photos
    WHERE id = NEW.photo_id;

    -- Only create feed item if reactor is NOT the photo uploader
    -- (Don't notify when you react to your own photo)
    IF NEW.user_id != photo_uploader_id THEN
      INSERT INTO feed_items (squad_id, type, entity_id, created_by, created_at)
      VALUES (photo_squad_id, 'photo_reacted', NEW.id, NEW.user_id, NEW.created_at);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_feed_item_first_reaction ON photo_reactions;

-- Create trigger
CREATE TRIGGER trigger_feed_item_first_reaction
  AFTER INSERT ON photo_reactions
  FOR EACH ROW
  EXECUTE FUNCTION create_feed_item_for_first_reaction();

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the feed_items type constraint was updated
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
  AND constraint_name = 'feed_items_type_check';

-- Verify triggers are created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('photo_reactions')
ORDER BY event_object_table, trigger_name;

-- Test query: Count reactions by photo
SELECT
  p.id as photo_id,
  p.caption,
  COUNT(pr.id) as reaction_count,
  COUNT(DISTINCT pr.emoji) as unique_emojis
FROM photos p
LEFT JOIN photo_reactions pr ON pr.photo_id = p.id
GROUP BY p.id, p.caption
ORDER BY reaction_count DESC
LIMIT 5;
