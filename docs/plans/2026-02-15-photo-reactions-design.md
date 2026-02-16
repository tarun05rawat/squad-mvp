# Real-Time Photo Reactions Design

**Date:** 2026-02-15
**Status:** Approved
**Author:** Claude Sonnet 4.5

## Overview

Add real-time emoji reactions to photos, visible in the feed and full-screen photo modal. Users can tap emojis to react instantly, with optimistic UI updates and real-time synchronization across all squad members.

## Goals

- Enable instant emoji reactions on photos (Instagram/Slack-like UX)
- Display reactions in feed items and photo fullscreen view
- Real-time sync across all users viewing the same photo
- Clean, performant implementation with proper race condition handling

## Non-Goals

- Custom emoji upload (predefined set only)
- Reaction animations beyond simple scale
- Reaction analytics or "top reactors" features
- Reactions on other entities (events, comments) - photos only

## Architecture

### Data Flow

```
User taps emoji
  ↓
Optimistic local update (instant UI feedback)
  ↓
Insert to photo_reactions table
  ↓
Real-time broadcast via Supabase channel
  ↓
All clients receive update & sync state
```

### State Ownership

**Component-level state:**
- Each component (FeedItem, PhotoFullscreen) maintains its own reactions array
- No global state needed - real-time subscriptions keep components in sync
- Source of truth: Supabase `photo_reactions` table

**Why not global state?**
- Photos may appear in multiple places (feed, fullscreen)
- Real-time subscriptions provide natural sync mechanism
- Simpler mental model - each component is self-contained

## Subscription Strategy

### Per-Photo Channels

```javascript
useEffect(() => {
  const subscription = supabase
    .channel(`reactions:${photoId}`)
    .on('postgres_changes', {
      event: '*',  // INSERT, DELETE
      schema: 'public',
      table: 'photo_reactions',
      filter: `photo_id=eq.${photoId}`
    }, handleReactionChange)
    .subscribe();

  return () => subscription.unsubscribe();
}, [photoId]);
```

**Design decisions:**
- **Per-photo channels** (not per-squad): More granular, auto-cleanup on unmount
- **Wildcard events** (`*`): Catch INSERT and DELETE in one handler
- **Filter at DB level**: Only relevant reactions transmitted
- **Cleanup on unmount**: Prevents memory leaks and stale subscriptions

### Race Condition Prevention

**Database constraint:**
```sql
UNIQUE(photo_id, user_id, emoji)
```

**Optimistic update logic:**
```javascript
// Before adding reaction:
1. Check if user already has this emoji reaction locally
2. If yes, remove it (toggle off)
3. If no, add it (toggle on)
4. Apply to database
5. If DB insert fails (duplicate), ignore - UI already correct
```

**Race conditions handled:**
- User rapid-taps same emoji: Debounce or disable during API call
- Multiple users react simultaneously: Real-time sync resolves automatically
- User reacts offline then comes online: Supabase queues and syncs

## Component Design

### FeedItem (photo_uploaded type)

**Display:**
```
[❤️ 3] [👍 2] [😂 1]  +
```

**Behavior:**
- Show grouped emoji with counts
- Highlight user's own reactions (bold/colored)
- Tap emoji to toggle reaction
- Tap `+` to show emoji picker

**Updates:**
- Modify existing FeedItem component
- Only show reactions for `type: 'photo_uploaded'` items
- Fetch initial reactions on mount
- Subscribe to real-time updates

### PhotoFullscreen

**Display:**
```
[Photo displayed full-screen]

Reactions: [❤️ 3] [👍 2] [😂 1]

Emoji Picker:
[😀 😂 ❤️ 👍 🎉 ➕]  ← Always visible at bottom
```

**Behavior:**
- Same grouped display at top
- Permanent emoji picker bar at bottom
- Tap emoji to add/remove instantly
- Optimistic updates with animation

**Updates:**
- Read PhotoFullscreen component (may need creation)
- Add reactions display section
- Add emoji picker bar
- Wire up real-time subscriptions

### Shared Component: ReactionBar

**Reusable component for both FeedItem and PhotoFullscreen:**

```javascript
<ReactionBar
  photoId={photoId}
  onReactionPress={handleReaction}
  currentUserId={userId}
  compact={true/false}  // Compact for feed, full for modal
/>
```

**Responsibilities:**
- Display grouped reactions with counts
- Highlight current user's reactions
- Handle tap events (bubbles up to parent)
- Real-time subscription management

## UI Specifications

### Emoji Set

Predefined emojis (avoid full keyboard complexity):
```javascript
const REACTION_EMOJIS = ['❤️', '👍', '😂', '🎉', '😍', '🔥'];
```

Can expand later if needed, but start simple.

### Visual Feedback

**Optimistic update:**
- Emoji appears immediately with scale animation (0.8 → 1.0)
- Count increments instantly
- No loading spinners on success path

**User's reactions:**
- Bold text or colored border to distinguish
- Example: `[❤️ 3]` vs **[❤️ 3]** (user reacted)

**Loading/Error states:**
- Only show toast on permanent failure: "Couldn't add reaction"
- Silent retry in background (Supabase auto-retries)
- Rollback optimistic update if failure confirmed

### Layout

**FeedItem reactions:**
- Below photo preview, above caption
- Horizontal scrollable if many reactions
- Max height: 40px

**PhotoFullscreen reactions:**
- Grouped display: Below photo, 60px from top
- Emoji picker: Fixed at bottom, 80px height
- Tappable area: 44x44pt minimum (iOS guidelines)

## Data Schema

### Existing Table

```sql
CREATE TABLE photo_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, user_id, emoji)
);
```

**No schema changes needed** - table already exists with correct constraints.

### Real-time Configuration

Already enabled in schema:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE photo_reactions;
```

## Error Handling

### Network Failures

**Scenario:** User reacts while offline
- Optimistic update stays visible
- Supabase queues insert for when connection returns
- If permanent failure: Toast + rollback

**Implementation:**
```javascript
try {
  // Optimistic update already applied
  await supabase.from('photo_reactions').insert({...});
} catch (error) {
  // Rollback optimistic update
  setReactions(prev => prev.filter(r => r.id !== optimisticId));
  showToast('Couldn\'t add reaction');
}
```

### Duplicate Prevention

**Local check:**
```javascript
const userReaction = reactions.find(
  r => r.user_id === userId && r.emoji === emoji
);

if (userReaction) {
  // Toggle off - remove reaction
  await removeReaction(userReaction.id);
} else {
  // Toggle on - add reaction
  await addReaction(photoId, emoji);
}
```

**Database constraint:**
- `UNIQUE(photo_id, user_id, emoji)` prevents duplicates
- If insert fails with conflict: Ignore silently, UI already correct

### Photo Deletion

- Real-time subscription auto-unsubscribes on component unmount
- Database cascade delete removes reactions: `ON DELETE CASCADE`
- No orphaned subscriptions or reactions

## Implementation Plan (High-Level)

1. **Create shared hook:** `usePhotoReactions(photoId)`
   - Manages reactions state
   - Handles real-time subscriptions
   - Provides add/remove functions with optimistic updates

2. **Create ReactionBar component**
   - Displays grouped reactions
   - Highlights user's reactions
   - Emits events on tap

3. **Update FeedItem**
   - Add ReactionBar for photo_uploaded items
   - Fetch reactions on mount
   - Wire up toggle handler

4. **Update/Create PhotoFullscreen**
   - Add ReactionBar at top
   - Add emoji picker bar at bottom
   - Wire up real-time sync

5. **Add tests**
   - Unit tests for usePhotoReactions hook
   - Integration tests for FeedItem and PhotoFullscreen
   - Manual testing checklist

## Testing Strategy

### Unit Tests

**usePhotoReactions hook:**
- ✓ Optimistic add reaction
- ✓ Optimistic remove reaction
- ✓ Real-time subscription updates
- ✓ Duplicate prevention logic
- ✓ Error rollback

**ReactionBar component:**
- ✓ Renders grouped counts correctly
- ✓ Highlights user reactions
- ✓ Tap events emit correctly

### Integration Tests

**FeedItem:**
- ✓ Reactions display for photo_uploaded items
- ✓ Toggle reaction updates UI
- ✓ Real-time updates from other users

**PhotoFullscreen:**
- ✓ Emoji picker shows all options
- ✓ Tap emoji adds/removes reaction
- ✓ Multiple users see updates

### Manual Testing Checklist

- [ ] Add reaction → appears instantly
- [ ] Remove reaction → disappears instantly
- [ ] Multiple users react → all see updates
- [ ] Toggle same emoji → adds then removes
- [ ] Network offline → graceful degradation
- [ ] Rapid tapping → no duplicate reactions
- [ ] Photo deleted → subscriptions clean up

### Out of Scope (Initially)

- Load testing with hundreds of reactions
- Complex offline sync edge cases
- Reaction animation performance
- Analytics and metrics

## Security Considerations

### Row-Level Security

Existing RLS policies (already in schema):

```sql
-- Users can view reactions if they're squad members
CREATE POLICY "Squad members can view reactions" ON photo_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photos p
      JOIN squad_members sm ON sm.squad_id = p.squad_id
      WHERE p.id = photo_reactions.photo_id
      AND sm.user_id = auth.uid()
    )
  );

-- Users can only add reactions as themselves
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

-- Users can only delete their own reactions
CREATE POLICY "Users can delete own reactions" ON photo_reactions
  FOR DELETE USING (auth.uid() = user_id);
```

**No RLS changes needed** - existing policies are sufficient.

### Client-Side Validation

- Verify user_id matches auth.uid() before insert
- Validate emoji is in allowed set
- Check squad membership (though RLS enforces)

## Performance Considerations

### Subscription Efficiency

- Per-photo channels (not per-squad) reduce irrelevant messages
- Filter at database level: `filter: 'photo_id=eq.${photoId}'`
- Auto-cleanup on unmount prevents memory leaks

### Query Optimization

**Fetching reactions:**
```javascript
// Efficient: Fetch only for visible photo
const { data } = await supabase
  .from('photo_reactions')
  .select('*, user:users(full_name)')
  .eq('photo_id', photoId);
```

**Indexes (already exist):**
- Primary key on `id`
- Unique index on `(photo_id, user_id, emoji)`

### Rendering Performance

- Group reactions before rendering (reduce DOM nodes)
- Virtualize feed list (already implemented)
- Debounce rapid taps (prevent spam)

## Future Enhancements (Not in V1)

- Reaction notifications ("X reacted to your photo")
- Custom emoji upload
- Animated reaction effects (fireworks, confetti)
- "Who reacted" detail view (tap count to see users)
- Reaction trends/analytics

## Success Metrics

**Functional:**
- ✓ Users can add/remove reactions
- ✓ Reactions sync in real-time (<1s latency)
- ✓ No duplicate reactions possible
- ✓ Graceful offline handling

**Non-Functional:**
- ✓ Feels instant (<100ms optimistic update)
- ✓ No memory leaks (subscriptions clean up)
- ✓ Works on 3G networks (optimistic UI)

## Approval

Design approved: Yes
Ready for implementation planning: Yes
