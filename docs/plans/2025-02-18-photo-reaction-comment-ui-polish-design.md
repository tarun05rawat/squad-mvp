# Photo Reaction + Comment Panel UI Polish — Design Doc

**Date:** 2025-02-18
**Scope:** Pure UX/UI polish — no backend logic changes
**Files modified:** 3 component files

---

## Goals

- Cleaner reaction display with top-3 emoji + "+" picker button
- Better comment hierarchy (typography, spacing, swipe-to-delete)
- Reduced visual clutter (remove red Delete text)
- More modern social feel (animations, shadows, auto-focus)

---

## 1. Reactions — `src/components/reactions/ReactionBar.js`

### Changes
- **Top-3 slice:** Sort `groupedReactions` by `count` descending, take first 3 before rendering pills
- **"+" button:** Render a `"+"` pill at the end of the row; calls `onAddReaction` prop (new optional prop)
- **Scale animation:** Each pill wrapped in `Animated.View` with a spring scale (1 → 0.85 → 1) on press using `useRef(new Animated.Value(1))`; one `Animated.Value` per emoji key
- **Highlighted state:** Already works via `userReacted` → `#F3E8FF` background + `#8B5CF6` border — no change needed

### New props
| Prop | Type | Description |
|------|------|-------------|
| `onAddReaction` | `() => void` | Called when "+" pill is tapped — optional |

---

## 2. Comments — `src/components/photos/PhotoComments.js`

### Typography
| Style | Before | After |
|-------|--------|-------|
| `commentAuthor` fontWeight | `'600'` | `'700'` |
| `commentText` fontWeight | implicit `'400'` | explicit `'400'` |
| `commentTimestamp` fontSize | `12` | `11` |
| `commentTimestamp` color | `'#9CA3AF'` | `'#B0B7C3'` |

### Spacing
- `commentItem` `marginBottom`: `16` → `20`

### Delete — Remove red button, add swipe-to-delete
- **Remove** the red `<TouchableOpacity>Delete</TouchableOpacity>` block from `renderComment`
- **Add** `Swipeable` from `react-native-gesture-handler` wrapping each comment row
- `renderRightActions` returns a red `#EF4444` delete button (🗑 icon + "Delete" label), 80px wide
- `onSwipeableOpen` triggers `deleteComment(item.id)` — existing function unchanged
- Swipeable **disabled** when `isTemp === true` (mid-post optimistic comment)

### Delete flow (both frontend + DB)
```
onSwipeableOpen
  → deleteComment(commentId)              // existing fn
      → supabase.delete().eq('id', id)   // DB delete
      → real-time DELETE fires
          → handleCommentDelete(payload.old)
              → setComments(prev => prev.filter(c => c.id !== id))  // frontend remove
```
The existing real-time subscription already handles the frontend removal — no duplication needed.

### Input area
- Add `autoFocus` to `TextInput` (focuses when modal tab is active)
- Add subtle shadow to `inputContainer`:
  ```js
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 4,
  ```
- Post button color-toggle already implemented — no change

---

## 3. Info Panel — `src/components/photos/PhotoFullscreen.js`

### Changes
- Add shadow to `infoPanel` for depth:
  ```js
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -3 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 8,
  ```
- Pass `onAddReaction` to `<ReactionBar>` — since `EmojiPicker` is always visible below the pills in the reactions tab, "+" is wired to `addReaction` as a no-op visual affordance (picker already shown)
- `autoFocus` on the `TextInput` inside `PhotoComments` handles comment tab focus directly — no prop threading needed

---

## Files Modified Summary

| File | What changes |
|------|-------------|
| `src/components/reactions/ReactionBar.js` | Top-3 slice, "+" button, scale animation per pill |
| `src/components/photos/PhotoComments.js` | Typography, spacing, swipe-to-delete, remove red Delete, autoFocus, input shadow |
| `src/components/photos/PhotoFullscreen.js` | Shadow on info panel, wire `onAddReaction` to ReactionBar |

## Files NOT modified
- `PhotoReactions.js` — grid-level state, untouched
- `EmojiPicker.js` — no UI changes needed
- `ReactorsList.js` — no changes
- `usePhotoReactions.js` — backend hook, untouched
- All Supabase queries, subscriptions, and data logic

---

## Dependencies
- `react-native-gesture-handler` — already present in Expo; no new install needed
- No new packages required

---

## Non-goals
- No backend logic changes
- No schema changes
- No new screens or navigation changes
