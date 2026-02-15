# Phase 1: Feed Tab Implementation Progress

## ✅ Completed

### 1. Database Schema
- Created `phase1-photos-feed-schema.sql` with:
  - `photos` table (with squad_id, event_id, uploaded_by, photo_url, caption)
  - `photo_reactions` table (emoji reactions on photos)
  - `photo_comments` table (comments on photos)
  - `feed_items` table (unified activity feed)
  - Database triggers to auto-create feed items for:
    - `event_created` (when new event is created)
    - `voting_decided` (when voting ends)
    - `photo_uploaded` (when photo is uploaded)
    - `comment_added` (when first comment is added to a photo)
  - RLS policies for all tables
  - Realtime subscriptions enabled

### 2. Storage Setup
- Created `STORAGE_SETUP_GUIDE.md` with instructions for:
  - Creating `squad-photos` public bucket
  - Setting up storage policies (upload, read, delete)
  - File structure: `squad-photos/{user_id}/{photo_id}.jpg`
  - 10MB file size limit

### 3. Photo Utilities
- Created `src/utils/photoUtils.js` with functions:
  - `uploadPhoto()` - Upload to Supabase Storage
  - `deletePhoto()` - Remove from storage
  - `createPhotoRecord()` - Create DB record
  - `uploadPhotoComplete()` - Complete upload flow (storage + DB)
  - `deletePhotoComplete()` - Complete deletion (DB + storage)

### 4. Feed UI Components
- Created `src/components/feed/FeedItem.js`:
  - Renders different UI based on feed item type
  - Handles 4 feed types: event_created, voting_decided, photo_uploaded, comment_added
  - Includes photo previews and captions
  - Timestamp formatting with "2 hours ago" style
  - Clickable to navigate to events or photos

- Created `src/components/feed/FeedTab.js`:
  - Displays chronological feed (newest first)
  - Real-time subscriptions for new feed items
  - Pull-to-refresh functionality
  - Loading states
  - Empty state when no activity
  - Enriches feed items with actor names, event names, photo data

### 5. SquadDetailScreen Updates
- Updated `src/screens/squads/SquadDetailScreen.js`:
  - Changed from 2 tabs to 4 tabs: **Feed | Events | Photos | Members**
  - Feed tab is now the default tab (first tab)
  - Integrated FeedTab component
  - Added placeholder for Photos tab (coming next)
  - Added handlers for photo and event navigation from feed

### 6. Dependencies
- Installed `date-fns` for timestamp formatting

---

## 🚧 Next Steps (To Complete Phase 1)

### 1. Photos Tab Implementation
- [ ] Create `src/components/photos/PhotosTab.js`:
  - Grid layout (2-3 columns)
  - Show all squad photos (both event-specific and general)
  - Filter by event (optional)
  - Tap to open fullscreen view
  - Show photo count badge

### 2. Fullscreen Photo View
- [ ] Create `src/components/photos/PhotoFullscreen.js`:
  - Fullscreen photo viewer
  - Swipe between photos
  - Show caption
  - Reactions UI:
    - Double-tap or heart button for ❤️
    - Show reaction count
    - Toggle reaction (add/remove)
  - Comments UI:
    - Swipe up or comment button to view comments
    - Bottom sheet with comment list
    - Add comment input
    - Real-time comment updates
  - Delete button (only for uploader)
  - Back button to close

### 3. Photo Upload UI
- [ ] Create `src/components/photos/PhotoUploadButton.js`:
  - Image picker integration (Expo ImagePicker)
  - Photo preview before upload
  - Caption input (optional)
  - Upload progress indicator
  - Error handling

### 4. Event Result Screen Integration
- [ ] Update `src/screens/events/EventResultScreen.js`:
  - Add "Upload Photo" button
  - Show photos uploaded for this event
  - Photo count badge
  - Link to Photos tab filtered by this event

### 5. Database Triggers for Existing Events
- [ ] Update database to create feed items for existing events:
  - Backfill feed_items for events already created
  - Ensure voting_decided trigger works correctly

### 6. Testing Checklist
After completing all above:
- [ ] Run database migration: `phase1-photos-feed-schema.sql`
- [ ] Set up Supabase Storage bucket (follow STORAGE_SETUP_GUIDE.md)
- [ ] Create a new event → Check feed shows "event_created"
- [ ] Vote and wait for voting to close → Check feed shows "voting_decided"
- [ ] Upload a photo → Check feed shows "photo_uploaded"
- [ ] Add a comment to photo → Check feed shows "comment_added"
- [ ] Test photo reactions (double-tap ❤️)
- [ ] Test photo comments (swipe up)
- [ ] Test photo deletion (only uploader can delete)
- [ ] Test real-time feed updates
- [ ] Test pull-to-refresh on feed
- [ ] Verify Photos tab shows all squad photos
- [ ] Verify photo count badge on events

---

## 📋 Database Setup Instructions

Before testing the Feed tab, you MUST run these in Supabase SQL Editor:

1. **Create tables and triggers:**
   - Run `phase1-photos-feed-schema.sql` in Supabase SQL Editor

2. **Set up storage:**
   - Follow instructions in `STORAGE_SETUP_GUIDE.md`

3. **Verify setup:**
   ```sql
   -- Check tables exist
   SELECT * FROM feed_items LIMIT 1;
   SELECT * FROM photos LIMIT 1;

   -- Check triggers exist
   SELECT tgname FROM pg_trigger WHERE tgname LIKE 'feed_%';
   ```

---

## 🎨 UI/UX Notes

### Feed Tab
- Shows newest items first (chronological reverse order)
- Real-time updates when new activity happens
- Different visual styles for each feed type
- Photos get large previews in feed
- Comments get small photo thumbnails
- Event names are purple (#8B5CF6) to match brand
- Winner text is green (#10B981) for positive feedback

### Photos Tab (Planned)
- Grid layout for easy browsing
- 2-3 columns depending on screen size
- Tap to fullscreen
- Event filter dropdown (optional)

### Fullscreen Photo View (Planned)
- Immersive fullscreen experience
- Double-tap to react with ❤️
- Swipe up to see comments
- Bottom sheet for comments (doesn't cover photo)
- Delete button only for uploader

---

## 🔧 Technical Implementation Details

### Real-time Feed Updates
- FeedTab subscribes to `feed_items` table changes
- When new feed item is inserted, component automatically refetches feed
- Only listens to squad-specific feed items (filter by squad_id)

### Feed Item Enrichment
- Feed items are enriched with additional data from related tables
- Each feed type loads different related data:
  - `event_created` → loads event name
  - `voting_decided` → loads event name + winning_option
  - `photo_uploaded` → loads photo URL, caption, event name
  - `comment_added` → loads comment text, photo URL, event name

### Photo Storage Structure
```
squad-photos/
  {user_id}/
    {photo_id}.{ext}
```

- Public bucket (all squad members can read)
- RLS on database enforces squad membership
- 10MB file size limit
- Supported formats: JPG, PNG, HEIC

### Database Triggers
- Automatic feed item creation via PostgreSQL triggers
- Runs in SECURITY DEFINER mode (bypasses RLS for insertion)
- No need for client-side feed insertion logic
- Ensures data consistency

---

## 📦 Files Created/Modified

### New Files
1. `phase1-photos-feed-schema.sql` - Database schema
2. `STORAGE_SETUP_GUIDE.md` - Storage setup instructions
3. `src/utils/photoUtils.js` - Photo utilities
4. `src/components/feed/FeedItem.js` - Feed item component
5. `src/components/feed/FeedTab.js` - Feed tab component
6. `PHASE1_FEED_PROGRESS.md` - This file

### Modified Files
1. `src/screens/squads/SquadDetailScreen.js` - Added 4 tabs with Feed integration

### Dependencies Added
- `date-fns` - Timestamp formatting

---

## 🚀 Ready to Test

The Feed tab is now functional! To test:

1. Run the database migration
2. Set up storage bucket
3. Create events, vote, upload photos
4. Watch the feed populate in real-time!

The Photos tab UI and photo upload functionality are next priorities.
