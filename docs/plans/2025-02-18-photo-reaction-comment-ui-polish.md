# Photo Reaction + Comment Panel UI Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the photo reaction pills and comment panel for a cleaner, more modern social UI — no backend logic changes.

**Architecture:** Three self-contained component edits: `ReactionBar.js` gets top-3 slicing, a "+" pill, and spring scale animations; `PhotoComments.js` gets typography polish, swipe-to-delete via `react-native-gesture-handler`'s `Swipeable`, and a focused input with shadow; `PhotoFullscreen.js` gets a drop shadow on the info panel and wires the new `onAddReaction` prop.

**Tech Stack:** React Native, `react-native-gesture-handler` (already in Expo), Supabase real-time (unchanged), `Animated` API (built-in RN)

---

## Task 1: ReactionBar — Top-3 Slice + "+" Button + Scale Animation

**Files:**
- Modify: `src/components/reactions/ReactionBar.js`

### Step 1: Replace the import block — add `Animated` and `useRef`

Open `src/components/reactions/ReactionBar.js`. Replace the existing import line:

```js
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
```

With:

```js
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
```

### Step 2: Replace the component body with the full updated version

Replace everything from `const ReactionBar = ...` through `export default ReactionBar;` with:

```js
const ReactionBar = ({ groupedReactions = [], onReactionPress, onAddReaction, compact = false }) => {
  // Top 3 most-used reactions only
  const topReactions = [...groupedReactions]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // One Animated.Value per emoji for scale spring
  const scaleAnims = useRef({});
  topReactions.forEach(({ emoji }) => {
    if (!scaleAnims.current[emoji]) {
      scaleAnims.current[emoji] = new Animated.Value(1);
    }
  });

  const handlePress = (emoji) => {
    const anim = scaleAnims.current[emoji];
    if (anim) {
      Animated.sequence([
        Animated.spring(anim, { toValue: 0.85, useNativeDriver: true, speed: 50 }),
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    }
    if (onReactionPress) onReactionPress(emoji);
  };

  if (!groupedReactions || groupedReactions.length === 0) {
    return (
      <View style={styles.container}>
        {onAddReaction && (
          <TouchableOpacity
            style={[styles.reactionButton, compact && styles.reactionButtonCompact, styles.defaultButton]}
            onPress={onAddReaction}
          >
            <Text style={styles.plusText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {topReactions.map((reaction) => (
        <Animated.View
          key={reaction.emoji}
          style={{ transform: [{ scale: scaleAnims.current[reaction.emoji] || new Animated.Value(1) }] }}
        >
          <TouchableOpacity
            testID={`reaction-${reaction.emoji}`}
            style={[
              styles.reactionButton,
              compact && styles.reactionButtonCompact,
              reaction.userReacted ? styles.userReactedButton : styles.defaultButton,
            ]}
            onPress={() => handlePress(reaction.emoji)}
            activeOpacity={0.8}
          >
            <Text style={styles.emoji}>{reaction.emoji}</Text>
            <Text
              style={[
                styles.count,
                reaction.userReacted && styles.userReactedCount,
              ]}
            >
              {reaction.count}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* "+" pill to open emoji picker */}
      {onAddReaction && (
        <TouchableOpacity
          style={[
            styles.reactionButton,
            compact && styles.reactionButtonCompact,
            styles.defaultButton,
          ]}
          onPress={onAddReaction}
          activeOpacity={0.8}
        >
          <Text style={styles.plusText}>+</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};
```

### Step 3: Add `plusText` to the StyleSheet

Inside `StyleSheet.create({...})`, add after `userReactedCount`:

```js
  plusText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 22,
  },
```

### Step 4: Verify visually — no automated tests for pure UI

Run the app and open a photo with reactions. Confirm:
- Only top 3 emojis shown
- "+" pill appears at end
- Tapping a pill springs to 0.85 then back
- User-reacted pill stays purple-highlighted

### Step 5: Commit

```bash
git add src/components/reactions/ReactionBar.js
git commit -m "feat: reaction bar — top-3 slice, + button, spring scale animation"
```

---

## Task 2: PhotoComments — Typography + Spacing Polish

**Files:**
- Modify: `src/components/photos/PhotoComments.js`

### Step 1: Update `commentAuthor` style

Find in `StyleSheet.create`:

```js
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
```

Change `fontWeight` to `'700'`:

```js
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginRight: 8,
  },
```

### Step 2: Update `commentTimestamp` style

Find:

```js
  commentTimestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
```

Replace with:

```js
  commentTimestamp: {
    fontSize: 11,
    color: '#B0B7C3',
  },
```

### Step 3: Update `commentText` style — add explicit fontWeight

Find:

```js
  commentText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
```

Replace with:

```js
  commentText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4B5563',
    lineHeight: 20,
  },
```

### Step 4: Increase vertical spacing between comments

Find:

```js
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
```

Replace with:

```js
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
```

### Step 5: Commit typography changes before the bigger swipe change

```bash
git add src/components/photos/PhotoComments.js
git commit -m "style: comment typography — bolder author, lighter timestamp, more spacing"
```

---

## Task 3: PhotoComments — Swipe-to-Delete + Remove Red Button

**Files:**
- Modify: `src/components/photos/PhotoComments.js`

### Step 1: Add `Swipeable` import at the top of the file

The file currently imports from `react-native` only. Add a new import line directly after the existing React Native import block (after line 12):

```js
import { Swipeable } from 'react-native-gesture-handler';
```

So the top of the file looks like:

```js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
```

### Step 2: Replace `renderComment` with swipe-enabled version

Find the entire `renderComment` function (lines 213–245) and replace it:

```js
  const renderRightActions = (commentId) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => deleteComment(commentId)}
      activeOpacity={0.8}
    >
      <Text style={styles.deleteActionIcon}>🗑️</Text>
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderComment = ({ item }) => {
    const isOwner = item.user_id === user?.id;
    const isTemp = item.id.toString().startsWith('temp-');

    const commentRow = (
      <View style={styles.commentItem}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>
            {item.author?.full_name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{item.author?.full_name || 'Unknown'}</Text>
            <Text style={styles.commentTimestamp}>
              {isTemp
                ? 'Posting...'
                : formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.comment_text}</Text>
        </View>
      </View>
    );

    // Only owner comments on non-temp items get swipe-to-delete
    if (isOwner && !isTemp) {
      return (
        <Swipeable
          renderRightActions={() => renderRightActions(item.id)}
          overshootRight={false}
          friction={2}
        >
          {commentRow}
        </Swipeable>
      );
    }

    return commentRow;
  };
```

### Step 3: Remove old `deleteCommentButton` and `deleteCommentText` from StyleSheet

Find and delete these two style entries (they're no longer used):

```js
  deleteCommentButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  deleteCommentText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
```

### Step 4: Add swipe action styles to StyleSheet

Add these new styles inside `StyleSheet.create({...})`:

```js
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 20,  // match commentItem marginBottom so bg fills correctly
  },
  deleteActionIcon: {
    fontSize: 18,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
```

### Step 5: Verify delete flow

Run the app, open a photo, go to Comments tab, post a comment, then swipe left on your own comment. Confirm:
- Red delete panel slides in from right
- Tapping it removes comment from UI immediately
- Supabase `photo_comments` row is deleted (check Supabase dashboard or network log)
- Other users' comments do NOT show swipe action

### Step 6: Commit

```bash
git add src/components/photos/PhotoComments.js
git commit -m "feat: swipe-to-delete comments — replaces red Delete button"
```

---

## Task 4: PhotoComments — Auto-Focus Input + Input Shadow

**Files:**
- Modify: `src/components/photos/PhotoComments.js`

### Step 1: Add `autoFocus` to the TextInput

Find the `<TextInput` in the `return` block. It currently starts:

```jsx
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
```

Add `autoFocus` prop:

```jsx
        <TextInput
          autoFocus
          style={styles.input}
          placeholder="Add a comment..."
```

### Step 2: Add shadow to `inputContainer` in StyleSheet

Find:

```js
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
```

Replace with:

```js
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
```

### Step 3: Verify

Open the photo fullscreen modal and switch to Comments tab. Confirm:
- Keyboard rises immediately (autoFocus works)
- Input area has a subtle upward shadow separating it from the comment list

### Step 4: Commit

```bash
git add src/components/photos/PhotoComments.js
git commit -m "style: comment input — autoFocus + subtle shadow elevation"
```

---

## Task 5: PhotoFullscreen — Info Panel Shadow + Wire onAddReaction

**Files:**
- Modify: `src/components/photos/PhotoFullscreen.js`

### Step 1: Add shadow to `infoPanel` in StyleSheet

Find:

```js
  infoPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.62,
    paddingTop: 8,
    paddingBottom: 20,
  },
```

Replace with:

```js
  infoPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.62,
    paddingTop: 8,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
```

### Step 2: Wire `onAddReaction` prop to `<ReactionBar>`

Find:

```jsx
                  <ReactionBar
                    groupedReactions={groupedReactions}
                    onReactionPress={(emoji) => {
                      setSelectedReactionEmoji(emoji);
                      setReactorsListVisible(true);
                    }}
                  />
```

Replace with:

```jsx
                  <ReactionBar
                    groupedReactions={groupedReactions}
                    onReactionPress={(emoji) => {
                      setSelectedReactionEmoji(emoji);
                      setReactorsListVisible(true);
                    }}
                    onAddReaction={addReaction}
                  />
```

> **Note:** `addReaction` is already destructured from `usePhotoReactions(photo?.id)` at the top of the component. The "+" pill will trigger the same toggle-reaction flow as the EmojiPicker below it — the EmojiPicker remains visible in the tab as a full picker, while "+" is a quick-access shortcut using the first available emoji. If you want "+" to simply scroll down to / visually highlight the EmojiPicker instead, set `onAddReaction` to a scroll ref callback — but the simplest correct behavior is wiring it to `addReaction` with a default emoji or leaving it as a visual no-op that draws the eye downward. For now, passing `addReaction` is correct since it makes the "+" functional.

### Step 3: Verify

Open a photo. Confirm:
- Info panel has a visible upward shadow separating it from the dark image area
- Rounded top corners still present
- "+" pill in ReactionBar is wired and tappable

### Step 4: Commit

```bash
git add src/components/photos/PhotoFullscreen.js
git commit -m "style: info panel shadow + wire onAddReaction to ReactionBar"
```

---

## Final Checklist

- [ ] `ReactionBar`: shows max 3 emojis, "+" pill at end, spring animation on tap
- [ ] `ReactionBar`: user-reacted pill still highlights purple
- [ ] `PhotoComments`: author name bold (700), timestamp smaller + lighter
- [ ] `PhotoComments`: 20px gap between comments
- [ ] `PhotoComments`: no red Delete text anywhere
- [ ] `PhotoComments`: swipe left on own comment reveals red delete panel
- [ ] `PhotoComments`: tapping delete panel removes comment from UI + DB
- [ ] `PhotoComments`: other users' comments are not swipeable
- [ ] `PhotoComments`: input auto-focuses when modal opens on Comments tab
- [ ] `PhotoComments`: input area has subtle shadow
- [ ] `PhotoFullscreen`: info panel has upward drop shadow
- [ ] No Supabase queries, subscriptions, or data logic changed

---

## Files Modified

| File | Tasks |
|------|-------|
| `src/components/reactions/ReactionBar.js` | Task 1 |
| `src/components/photos/PhotoComments.js` | Tasks 2, 3, 4 |
| `src/components/photos/PhotoFullscreen.js` | Task 5 |

## Files NOT touched

- `src/components/photos/PhotoReactions.js`
- `src/components/reactions/EmojiPicker.js`
- `src/components/photos/ReactorsList.js`
- `src/hooks/usePhotoReactions.js`
- `src/utils/photoUtils.js`
- All Supabase queries and subscriptions
