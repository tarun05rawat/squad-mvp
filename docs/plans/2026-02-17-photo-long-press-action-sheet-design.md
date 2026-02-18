# Photo Long-Press Action Sheet Design

**Date:** 2026-02-17
**Status:** Approved

## Overview

Add a long-press gesture to photo grid cells that presents an Instagram-style bottom sheet with contextual actions: View, React, Comment, and Delete (owner only).

## Interaction Model

- **Tap** → opens `PhotoFullscreen` modal (existing behaviour, unchanged)
- **Long-press** → shows `PhotoActionSheet` sliding up from bottom with dimmed backdrop

## New Component: `PhotoActionSheet`

**File:** `src/components/photos/PhotoActionSheet.js`

A React Native `Modal` (transparent, slide animation) with:
- Semi-transparent dark backdrop (tappable to dismiss)
- White bottom sheet with rounded top corners
- Action rows with icon + label

### Actions

| Action | Icon | Audience | Behaviour |
|--------|------|----------|-----------|
| View | 👁️ | Everyone | Dismiss sheet → open `PhotoFullscreen` |
| React | 😍 | Everyone | Dismiss sheet → open `PhotoFullscreen` |
| Comment | 💬 | Everyone | Dismiss sheet → open `PhotoFullscreen` |
| Delete | 🗑️ | Owner only | Confirm alert → `deletePhotoComplete` → remove from grid |
| Cancel | — | Everyone | Dismiss sheet |

View, React, and Comment all navigate to the fullscreen modal since reactions and comments already live there.

Delete is styled in red, shown only when `photo.uploaded_by === user.id`, and guarded by a confirmation Alert before calling the existing `deletePhotoComplete` utility.

## Changes to `PhotosTab.js`

- Add `selectedPhoto` and `actionSheetVisible` state
- Change grid item `TouchableOpacity` to add `onLongPress` handler
- `onLongPress` sets `selectedPhoto` and opens the action sheet
- Add `handleDelete` callback that filters deleted photo out of local `photos` state (instant UI update, no refetch needed)
- Render `<PhotoActionSheet>` at the bottom of the component

## What Doesn't Change

- `PhotoFullscreen.js` — no modifications needed
- `photoUtils.js` — delete logic already exists
- Database schema — no changes needed
- Existing tap-to-open behaviour

## Files Touched

1. `src/components/photos/PhotoActionSheet.js` — new file
2. `src/components/photos/PhotosTab.js` — add long-press + action sheet wiring
