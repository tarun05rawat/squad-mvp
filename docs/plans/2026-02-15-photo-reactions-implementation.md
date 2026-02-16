# Real-Time Photo Reactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time emoji reactions to photos with optimistic UI updates and real-time sync across all squad members.

**Architecture:** Custom React hook manages reactions state and real-time subscriptions per photo. Shared ReactionBar component displays grouped reactions. FeedItem and PhotoFullscreen integrate ReactionBar with toggle handlers. Optimistic updates provide instant feedback while Supabase broadcasts changes.

**Tech Stack:** React Native, Supabase real-time subscriptions, @testing-library/react-native, jest-expo

---

## Task 1: Create usePhotoReactions Hook (Core Logic)

**Files:**
- Create: `src/hooks/usePhotoReactions.js`
- Create: `__tests__/hooks/usePhotoReactions.test.js`

### Step 1: Write the failing test for fetching reactions

```javascript
// __tests__/hooks/usePhotoReactions.test.js
import { renderHook, waitFor } from '@testing-library/react-native';
import { usePhotoReactions } from '../../src/hooks/usePhotoReactions';
import { supabase } from '../../src/lib/supabase';

// Mock Supabase
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

// Mock AuthContext
jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

describe('usePhotoReactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch reactions on mount', async () => {
    const mockReactions = [
      { id: 'r1', photo_id: 'photo-1', user_id: 'user-456', emoji: '❤️', created_at: new Date().toISOString() },
      { id: 'r2', photo_id: 'photo-1', user_id: 'user-789', emoji: '❤️', created_at: new Date().toISOString() },
      { id: 'r3', photo_id: 'photo-1', user_id: 'user-123', emoji: '👍', created_at: new Date().toISOString() },
    ];

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockResolvedValue({ data: mockReactions, error: null });

    supabase.from.mockReturnValue({
      select: mockSelect,
    });

    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    const { result } = renderHook(() => usePhotoReactions('photo-1'));

    await waitFor(() => {
      expect(result.current.reactions).toHaveLength(3);
    });

    expect(supabase.from).toHaveBeenCalledWith('photo_reactions');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('photo_id', 'photo-1');
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: FAIL - "Cannot find module '../../src/hooks/usePhotoReactions'"

### Step 3: Create hook directory and minimal implementation

```javascript
// src/hooks/usePhotoReactions.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function usePhotoReactions(photoId) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!photoId) return;

    fetchReactions();
  }, [photoId]);

  const fetchReactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photo_reactions')
        .select('*')
        .eq('photo_id', photoId);

      if (error) throw error;
      setReactions(data || []);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    reactions,
    loading,
  };
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: PASS

### Step 5: Write test for real-time subscription setup

```javascript
// Add to __tests__/hooks/usePhotoReactions.test.js

it('should set up real-time subscription on mount', () => {
  const mockSubscribe = jest.fn();
  const mockOn = jest.fn().mockReturnThis();
  const mockChannel = jest.fn().mockReturnValue({
    on: mockOn,
    subscribe: mockSubscribe,
  });

  supabase.channel = mockChannel;

  const mockSelect = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockResolvedValue({ data: [], error: null });
  supabase.from.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq });

  renderHook(() => usePhotoReactions('photo-1'));

  expect(mockChannel).toHaveBeenCalledWith('reactions:photo-1');
  expect(mockOn).toHaveBeenCalledWith(
    'postgres_changes',
    expect.objectContaining({
      event: '*',
      schema: 'public',
      table: 'photo_reactions',
      filter: 'photo_id=eq.photo-1',
    }),
    expect.any(Function)
  );
  expect(mockSubscribe).toHaveBeenCalled();
});
```

### Step 6: Run test to verify it fails

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: FAIL - Subscription not set up

### Step 7: Add real-time subscription to hook

```javascript
// Update src/hooks/usePhotoReactions.js

useEffect(() => {
  if (!photoId) return;

  fetchReactions();

  // Set up real-time subscription
  const subscription = supabase
    .channel(`reactions:${photoId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'photo_reactions',
        filter: `photo_id=eq.${photoId}`,
      },
      (payload) => {
        handleRealtimeUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [photoId]);

const handleRealtimeUpdate = (payload) => {
  if (payload.eventType === 'INSERT') {
    setReactions((prev) => [...prev, payload.new]);
  } else if (payload.eventType === 'DELETE') {
    setReactions((prev) => prev.filter((r) => r.id !== payload.old.id));
  }
};
```

### Step 8: Run test to verify it passes

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: PASS

### Step 9: Write test for optimistic addReaction

```javascript
// Add to __tests__/hooks/usePhotoReactions.test.js

it('should optimistically add reaction and sync with database', async () => {
  const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
  const mockSelect = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockResolvedValue({ data: [], error: null });

  supabase.from.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
  });
  mockSelect.mockReturnValue({ eq: mockEq });

  const mockChannel = jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  });
  supabase.channel = mockChannel;

  const { result } = renderHook(() => usePhotoReactions('photo-1'));

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  // Add reaction
  await result.current.addReaction('❤️');

  // Check optimistic update
  await waitFor(() => {
    expect(result.current.reactions).toHaveLength(1);
  });

  const addedReaction = result.current.reactions[0];
  expect(addedReaction.emoji).toBe('❤️');
  expect(addedReaction.user_id).toBe('user-123');

  // Verify database insert
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({
      photo_id: 'photo-1',
      user_id: 'user-123',
      emoji: '❤️',
    })
  );
});
```

### Step 10: Run test to verify it fails

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: FAIL - addReaction function not defined

### Step 11: Implement addReaction with optimistic update

```javascript
// Update src/hooks/usePhotoReactions.js

const addReaction = async (emoji) => {
  try {
    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(
      (r) => r.user_id === user.id && r.emoji === emoji
    );

    if (existingReaction) {
      // Toggle off - remove reaction
      await removeReaction(existingReaction.id);
      return;
    }

    // Optimistic update
    const optimisticReaction = {
      id: `temp-${Date.now()}`,
      photo_id: photoId,
      user_id: user.id,
      emoji,
      created_at: new Date().toISOString(),
    };

    setReactions((prev) => [...prev, optimisticReaction]);

    // Insert to database
    const { error } = await supabase.from('photo_reactions').insert({
      photo_id: photoId,
      user_id: user.id,
      emoji,
    });

    if (error) {
      // Rollback on error
      setReactions((prev) =>
        prev.filter((r) => r.id !== optimisticReaction.id)
      );
      throw error;
    }
  } catch (error) {
    console.error('Error adding reaction:', error);
    // Could show toast notification here
  }
};

return {
  reactions,
  loading,
  addReaction,
};
```

### Step 12: Run test to verify it passes

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: PASS

### Step 13: Write test for removeReaction

```javascript
// Add to __tests__/hooks/usePhotoReactions.test.js

it('should optimistically remove reaction and sync with database', async () => {
  const existingReaction = {
    id: 'r1',
    photo_id: 'photo-1',
    user_id: 'user-123',
    emoji: '❤️',
    created_at: new Date().toISOString(),
  };

  const mockDelete = jest.fn().mockResolvedValue({ error: null });
  const mockEq = jest.fn().mockReturnValue({ delete: mockDelete });
  const mockSelect = jest.fn().mockReturnThis();
  const mockEqSelect = jest.fn().mockResolvedValue({
    data: [existingReaction],
    error: null,
  });

  supabase.from.mockReturnValue({
    select: mockSelect,
    delete: jest.fn().mockReturnThis(),
  });
  mockSelect.mockReturnValue({ eq: mockEqSelect });

  const mockFrom = supabase.from;
  mockFrom.mockImplementation((table) => {
    if (table === 'photo_reactions') {
      return {
        select: () => ({
          eq: mockEqSelect,
        }),
        delete: () => ({
          eq: mockEq,
        }),
      };
    }
  });

  const mockChannel = jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  });
  supabase.channel = mockChannel;

  const { result } = renderHook(() => usePhotoReactions('photo-1'));

  await waitFor(() => {
    expect(result.current.reactions).toHaveLength(1);
  });

  // Remove reaction
  await result.current.removeReaction('r1');

  // Check optimistic removal
  await waitFor(() => {
    expect(result.current.reactions).toHaveLength(0);
  });

  // Verify database delete
  expect(mockDelete).toHaveBeenCalled();
});
```

### Step 14: Run test to verify it fails

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: FAIL - removeReaction function not defined

### Step 15: Implement removeReaction

```javascript
// Update src/hooks/usePhotoReactions.js

const removeReaction = async (reactionId) => {
  try {
    // Optimistic removal
    setReactions((prev) => prev.filter((r) => r.id !== reactionId));

    // Delete from database
    const { error } = await supabase
      .from('photo_reactions')
      .delete()
      .eq('id', reactionId);

    if (error) {
      // Rollback - re-fetch to restore state
      await fetchReactions();
      throw error;
    }
  } catch (error) {
    console.error('Error removing reaction:', error);
  }
};

// Update return statement
return {
  reactions,
  loading,
  addReaction,
  removeReaction,
};
```

### Step 16: Run test to verify it passes

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: PASS

### Step 17: Write test for grouped reactions helper

```javascript
// Add to __tests__/hooks/usePhotoReactions.test.js

it('should return grouped reactions with counts', async () => {
  const mockReactions = [
    { id: 'r1', photo_id: 'photo-1', user_id: 'user-1', emoji: '❤️' },
    { id: 'r2', photo_id: 'photo-1', user_id: 'user-2', emoji: '❤️' },
    { id: 'r3', photo_id: 'photo-1', user_id: 'user-3', emoji: '👍' },
    { id: 'r4', photo_id: 'photo-1', user_id: 'user-123', emoji: '😂' },
  ];

  const mockSelect = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockResolvedValue({
    data: mockReactions,
    error: null,
  });

  supabase.from.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ eq: mockEq });

  const mockChannel = jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  });
  supabase.channel = mockChannel;

  const { result } = renderHook(() => usePhotoReactions('photo-1'));

  await waitFor(() => {
    expect(result.current.groupedReactions).toHaveLength(3);
  });

  const grouped = result.current.groupedReactions;

  expect(grouped[0]).toEqual({
    emoji: '❤️',
    count: 2,
    userReacted: false,
  });

  expect(grouped[1]).toEqual({
    emoji: '👍',
    count: 1,
    userReacted: false,
  });

  expect(grouped[2]).toEqual({
    emoji: '😂',
    count: 1,
    userReacted: true,
  });
});
```

### Step 18: Run test to verify it fails

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: FAIL - groupedReactions not defined

### Step 19: Add groupedReactions computed value

```javascript
// Update src/hooks/usePhotoReactions.js
import { useState, useEffect, useMemo } from 'react';

// Add after reactions state
const groupedReactions = useMemo(() => {
  const groups = {};

  reactions.forEach((reaction) => {
    if (!groups[reaction.emoji]) {
      groups[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        userReacted: false,
      };
    }

    groups[reaction.emoji].count += 1;

    if (reaction.user_id === user?.id) {
      groups[reaction.emoji].userReacted = true;
    }
  });

  return Object.values(groups).sort((a, b) => b.count - a.count);
}, [reactions, user]);

// Update return statement
return {
  reactions,
  loading,
  addReaction,
  removeReaction,
  groupedReactions,
};
```

### Step 20: Run test to verify it passes

Run: `npm test -- __tests__/hooks/usePhotoReactions.test.js`

Expected: PASS (all tests)

### Step 21: Commit hook implementation

```bash
git add src/hooks/usePhotoReactions.js __tests__/hooks/usePhotoReactions.test.js
git commit -m "feat: add usePhotoReactions hook with optimistic updates

- Fetch reactions on mount
- Real-time subscription for INSERT/DELETE events
- Optimistic add/remove with rollback on error
- Grouped reactions with counts and user state
- Toggle behavior (tap to add, tap again to remove)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create ReactionBar Component

**Files:**
- Create: `src/components/reactions/ReactionBar.js`
- Create: `__tests__/components/reactions/ReactionBar.test.js`

### Step 1: Write the failing test for ReactionBar rendering

```javascript
// __tests__/components/reactions/ReactionBar.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReactionBar from '../../../src/components/reactions/ReactionBar';

describe('ReactionBar', () => {
  const mockOnReactionPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render grouped reactions with counts', () => {
    const groupedReactions = [
      { emoji: '❤️', count: 3, userReacted: false },
      { emoji: '👍', count: 2, userReacted: true },
      { emoji: '😂', count: 1, userReacted: false },
    ];

    const { getByText } = render(
      <ReactionBar
        groupedReactions={groupedReactions}
        onReactionPress={mockOnReactionPress}
      />
    );

    expect(getByText('❤️ 3')).toBeTruthy();
    expect(getByText('👍 2')).toBeTruthy();
    expect(getByText('😂 1')).toBeTruthy();
  });

  it('should highlight user reactions', () => {
    const groupedReactions = [
      { emoji: '❤️', count: 3, userReacted: true },
      { emoji: '👍', count: 2, userReacted: false },
    ];

    const { getByTestId } = render(
      <ReactionBar
        groupedReactions={groupedReactions}
        onReactionPress={mockOnReactionPress}
      />
    );

    const heartReaction = getByTestId('reaction-❤️');
    const thumbsReaction = getByTestId('reaction-👍');

    // User reacted to heart should have different style
    expect(heartReaction.props.style).toContainEqual(
      expect.objectContaining({ borderColor: '#8B5CF6' })
    );

    // Thumbs should have default style
    expect(thumbsReaction.props.style).toContainEqual(
      expect.objectContaining({ borderColor: '#E5E7EB' })
    );
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- __tests__/components/reactions/ReactionBar.test.js`

Expected: FAIL - "Cannot find module '../../../src/components/reactions/ReactionBar'"

### Step 3: Create ReactionBar component

```javascript
// src/components/reactions/ReactionBar.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function ReactionBar({ groupedReactions, onReactionPress, compact = false }) {
  if (!groupedReactions || groupedReactions.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {groupedReactions.map((reaction) => (
        <TouchableOpacity
          key={reaction.emoji}
          testID={`reaction-${reaction.emoji}`}
          style={[
            styles.reactionButton,
            reaction.userReacted && styles.reactionButtonActive,
            compact && styles.reactionButtonCompact,
          ]}
          onPress={() => onReactionPress?.(reaction.emoji)}
        >
          <Text style={styles.reactionText}>
            {reaction.emoji} {reaction.count}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  reactionButtonActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  reactionButtonCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionText: {
    fontSize: 14,
    color: '#333',
  },
});
```

### Step 4: Run test to verify it passes

Run: `npm test -- __tests__/components/reactions/ReactionBar.test.js`

Expected: PASS

### Step 5: Write test for reaction press events

```javascript
// Add to __tests__/components/reactions/ReactionBar.test.js

it('should call onReactionPress when reaction is tapped', () => {
  const groupedReactions = [
    { emoji: '❤️', count: 3, userReacted: false },
    { emoji: '👍', count: 2, userReacted: false },
  ];

  const { getByText } = render(
    <ReactionBar
      groupedReactions={groupedReactions}
      onReactionPress={mockOnReactionPress}
    />
  );

  fireEvent.press(getByText('❤️ 3'));

  expect(mockOnReactionPress).toHaveBeenCalledWith('❤️');
});

it('should not render if groupedReactions is empty', () => {
  const { container } = render(
    <ReactionBar groupedReactions={[]} onReactionPress={mockOnReactionPress} />
  );

  expect(container).toMatchSnapshot();
});
```

### Step 6: Run test to verify it passes

Run: `npm test -- __tests__/components/reactions/ReactionBar.test.js`

Expected: PASS (all tests)

### Step 7: Commit ReactionBar component

```bash
git add src/components/reactions/ReactionBar.js __tests__/components/reactions/ReactionBar.test.js
git commit -m "feat: add ReactionBar component for displaying grouped reactions

- Renders emoji with counts in horizontal scroll
- Highlights user's reactions with purple border
- Compact mode for smaller displays
- Emits press events to parent

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create EmojiPicker Component

**Files:**
- Create: `src/components/reactions/EmojiPicker.js`
- Create: `__tests__/components/reactions/EmojiPicker.test.js`

### Step 1: Write the failing test for EmojiPicker

```javascript
// __tests__/components/reactions/EmojiPicker.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmojiPicker from '../../../src/components/reactions/EmojiPicker';

describe('EmojiPicker', () => {
  const mockOnEmojiPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all emoji options', () => {
    const { getByText } = render(<EmojiPicker onEmojiPress={mockOnEmojiPress} />);

    expect(getByText('❤️')).toBeTruthy();
    expect(getByText('👍')).toBeTruthy();
    expect(getByText('😂')).toBeTruthy();
    expect(getByText('🎉')).toBeTruthy();
    expect(getByText('😍')).toBeTruthy();
    expect(getByText('🔥')).toBeTruthy();
  });

  it('should call onEmojiPress when emoji is tapped', () => {
    const { getByText } = render(<EmojiPicker onEmojiPress={mockOnEmojiPress} />);

    fireEvent.press(getByText('❤️'));

    expect(mockOnEmojiPress).toHaveBeenCalledWith('❤️');
  });

  it('should render in compact mode', () => {
    const { getByTestId } = render(
      <EmojiPicker onEmojiPress={mockOnEmojiPress} compact={true} />
    );

    const container = getByTestId('emoji-picker-container');
    expect(container.props.style).toContainEqual(
      expect.objectContaining({ paddingVertical: 4 })
    );
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- __tests__/components/reactions/EmojiPicker.test.js`

Expected: FAIL - Module not found

### Step 3: Create EmojiPicker component

```javascript
// src/components/reactions/EmojiPicker.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '🎉', '😍', '🔥'];

export default function EmojiPicker({ onEmojiPress, compact = false }) {
  return (
    <View
      testID="emoji-picker-container"
      style={[styles.container, compact && styles.containerCompact]}
    >
      {EMOJI_OPTIONS.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          style={[styles.emojiButton, compact && styles.emojiButtonCompact]}
          onPress={() => onEmojiPress?.(emoji)}
        >
          <Text style={[styles.emoji, compact && styles.emojiCompact]}>
            {emoji}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  containerCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emojiButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  emoji: {
    fontSize: 24,
  },
  emojiCompact: {
    fontSize: 18,
  },
});
```

### Step 4: Run test to verify it passes

Run: `npm test -- __tests__/components/reactions/EmojiPicker.test.js`

Expected: PASS (all tests)

### Step 5: Commit EmojiPicker component

```bash
git add src/components/reactions/EmojiPicker.js __tests__/components/reactions/EmojiPicker.test.js
git commit -m "feat: add EmojiPicker component with predefined emoji set

- 6 predefined emojis: ❤️👍😂🎉😍🔥
- Compact mode for smaller displays
- Emits emoji selection to parent
- Clean grid layout with touch targets

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update FeedItem to Show Reactions

**Files:**
- Modify: `src/components/feed/FeedItem.js`
- Modify: `__tests__/FeedItem.test.js`

### Step 1: Write failing test for FeedItem reactions display

```javascript
// Add to __tests__/FeedItem.test.js

describe('photo_uploaded with reactions', () => {
  it('should render ReactionBar for photos', () => {
    const item = {
      id: 'feed-3',
      type: 'photo_uploaded',
      entity_id: 'photo-123',
      actor_name: 'Jane Smith',
      photo: {
        id: 'photo-123',
        photo_url: 'https://example.com/photo.jpg',
      },
      created_at: new Date().toISOString(),
    };

    const { getByTestId } = render(
      <FeedItem item={item} onPhotoPress={jest.fn()} />
    );

    expect(getByTestId('reaction-bar-photo-123')).toBeTruthy();
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- __tests__/FeedItem.test.js`

Expected: FAIL - Cannot find element with testID reaction-bar-photo-123

### Step 3: Update FeedItem to include ReactionBar

```javascript
// Update src/components/feed/FeedItem.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { formatDistanceToNow } from "date-fns";
import ReactionBar from "../reactions/ReactionBar";
import { usePhotoReactions } from "../../hooks/usePhotoReactions";

export default function FeedItem({ item, onPhotoPress, onEventPress }) {
  const renderFeedContent = () => {
    switch (item.type) {
      // ... existing cases ...

      case "photo_uploaded":
        return <PhotoUploadedContent item={item} onPhotoPress={onPhotoPress} />;

      default:
        return null;
    }
  };

  return (
    <View style={styles.feedItem}>
      <View style={styles.header}>
        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>
      {renderFeedContent()}
    </View>
  );
}

function PhotoUploadedContent({ item, onPhotoPress }) {
  const photoId = item.photo?.id || item.entity_id;
  const { groupedReactions, addReaction } = usePhotoReactions(photoId);

  return (
    <TouchableOpacity onPress={() => onPhotoPress?.(item.photo)}>
      <View style={styles.contentContainer}>
        <Text style={styles.actorName}>{item.actor_name}</Text>
        <Text style={styles.actionText}> uploaded a photo</Text>
        {item.event_name && (
          <Text style={styles.eventContext}> to {item.event_name}</Text>
        )}
      </View>
      {item.photo?.photo_url && (
        <Image
          source={{ uri: item.photo.photo_url }}
          style={styles.photoPreview}
          resizeMode="cover"
        />
      )}
      {item.photo?.caption && (
        <Text style={styles.caption}>{item.photo.caption}</Text>
      )}
      <View testID={`reaction-bar-${photoId}`}>
        <ReactionBar
          groupedReactions={groupedReactions}
          onReactionPress={addReaction}
          compact={true}
        />
      </View>
    </TouchableOpacity>
  );
}

// ... existing styles ...
```

### Step 4: Run test to verify it passes

Run: `npm test -- __tests__/FeedItem.test.js`

Expected: PASS

### Step 5: Write test for reaction interaction

```javascript
// Add to __tests__/FeedItem.test.js

it('should handle reaction press on photo', async () => {
  const mockAddReaction = jest.fn();

  // Mock the hook
  jest.mock('../../src/hooks/usePhotoReactions', () => ({
    usePhotoReactions: () => ({
      groupedReactions: [{ emoji: '❤️', count: 2, userReacted: false }],
      addReaction: mockAddReaction,
    }),
  }));

  const item = {
    id: 'feed-3',
    type: 'photo_uploaded',
    entity_id: 'photo-123',
    actor_name: 'Jane Smith',
    photo: {
      id: 'photo-123',
      photo_url: 'https://example.com/photo.jpg',
    },
    created_at: new Date().toISOString(),
  };

  const { getByText } = render(
    <FeedItem item={item} onPhotoPress={jest.fn()} />
  );

  fireEvent.press(getByText('❤️ 2'));

  expect(mockAddReaction).toHaveBeenCalledWith('❤️');
});
```

### Step 6: Run test to verify it passes

Run: `npm test -- __tests__/FeedItem.test.js`

Expected: PASS (all tests)

### Step 7: Commit FeedItem reactions integration

```bash
git add src/components/feed/FeedItem.js __tests__/FeedItem.test.js
git commit -m "feat: add reactions display to photo_uploaded feed items

- Extract PhotoUploadedContent component
- Integrate usePhotoReactions hook
- Display ReactionBar with compact mode
- Toggle reactions on tap

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update PhotoFullscreen with Reactions

**Files:**
- Modify: `src/components/photos/PhotoFullscreen.js`
- Create: `__tests__/components/photos/PhotoFullscreen.test.js`

### Step 1: Write failing test for PhotoFullscreen reactions

```javascript
// __tests__/components/photos/PhotoFullscreen.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PhotoFullscreen from '../../../src/components/photos/PhotoFullscreen';

// Mock dependencies
jest.mock('../../../src/utils/photoUtils');
jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));
jest.mock('../../../src/hooks/usePhotoReactions', () => ({
  usePhotoReactions: () => ({
    groupedReactions: [
      { emoji: '❤️', count: 3, userReacted: true },
      { emoji: '👍', count: 1, userReacted: false },
    ],
    addReaction: jest.fn(),
  }),
}));

describe('PhotoFullscreen', () => {
  const mockPhoto = {
    id: 'photo-123',
    photo_url: 'https://example.com/photo.jpg',
    caption: 'Test caption',
    uploaded_by: 'user-123',
    created_at: new Date().toISOString(),
    uploader: { full_name: 'Test User' },
  };

  it('should render ReactionBar with grouped reactions', () => {
    const { getByText } = render(
      <PhotoFullscreen
        visible={true}
        photo={mockPhoto}
        onClose={jest.fn()}
      />
    );

    expect(getByText('❤️ 3')).toBeTruthy();
    expect(getByText('👍 1')).toBeTruthy();
  });

  it('should render EmojiPicker at bottom', () => {
    const { getByTestId } = render(
      <PhotoFullscreen
        visible={true}
        photo={mockPhoto}
        onClose={jest.fn()}
      />
    );

    expect(getByTestId('emoji-picker-container')).toBeTruthy();
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- __tests__/components/photos/PhotoFullscreen.test.js`

Expected: FAIL - Elements not found

### Step 3: Update PhotoFullscreen to include reactions

```javascript
// Update src/components/photos/PhotoFullscreen.js
import React from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { deletePhotoComplete } from '../../utils/photoUtils';
import { useAuth } from '../../context/AuthContext';
import ReactionBar from '../reactions/ReactionBar';
import EmojiPicker from '../reactions/EmojiPicker';
import { usePhotoReactions } from '../../hooks/usePhotoReactions';

const { width, height } = Dimensions.get('window');

export default function PhotoFullscreen({ visible, photo, onClose, onDelete }) {
  const { user } = useAuth();
  const { groupedReactions, addReaction } = usePhotoReactions(photo?.id);

  if (!photo) return null;

  const isOwner = photo.uploaded_by === user?.id;

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhotoComplete(photo.id, photo.photo_url, user.id);
              Alert.alert('Success', 'Photo deleted');
              onDelete?.(photo.id);
              onClose();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', error.message || 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Photo */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photo.photo_url }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Info panel */}
        <View style={styles.infoPanel}>
          <ScrollView style={styles.infoScroll} contentContainerStyle={styles.infoContent}>
            {/* Uploader */}
            <View style={styles.uploaderRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {photo.uploader?.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.uploaderInfo}>
                <Text style={styles.uploaderName}>
                  {photo.uploader?.full_name || 'Unknown User'}
                </Text>
                <Text style={styles.timestamp}>
                  {formatDistanceToNow(new Date(photo.created_at), { addSuffix: true })}
                </Text>
              </View>

              {/* Delete button (owner only) */}
              {isOwner && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Event link */}
            {photo.event && (
              <View style={styles.eventTag}>
                <Text style={styles.eventTagText}>📅 {photo.event.title}</Text>
              </View>
            )}

            {/* Caption */}
            {photo.caption && (
              <View style={styles.captionSection}>
                <Text style={styles.caption}>{photo.caption}</Text>
              </View>
            )}

            {/* Reactions */}
            <View style={styles.reactionsSection}>
              <ReactionBar
                groupedReactions={groupedReactions}
                onReactionPress={addReaction}
              />
            </View>
          </ScrollView>

          {/* Emoji Picker - Fixed at bottom */}
          <EmojiPicker onEmojiPress={addReaction} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height * 0.6,
  },
  infoPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.4,
  },
  infoScroll: {
    flex: 1,
  },
  infoContent: {
    padding: 20,
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploaderInfo: {
    flex: 1,
  },
  uploaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 24,
  },
  eventTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  eventTagText: {
    fontSize: 14,
    color: '#6B7280',
  },
  captionSection: {
    marginBottom: 16,
  },
  caption: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  reactionsSection: {
    marginTop: 8,
  },
});
```

### Step 4: Run test to verify it passes

Run: `npm test -- __tests__/components/photos/PhotoFullscreen.test.js`

Expected: PASS (all tests)

### Step 5: Commit PhotoFullscreen reactions integration

```bash
git add src/components/photos/PhotoFullscreen.js __tests__/components/photos/PhotoFullscreen.test.js
git commit -m "feat: add reactions to PhotoFullscreen modal

- Display ReactionBar above emoji picker
- Fixed EmojiPicker at bottom of info panel
- Wire up addReaction handler
- Remove placeholder reactions text

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Manual Testing & Refinement

**Files:**
- N/A (manual testing phase)

### Step 1: Start development server

Run: `npm start`

Expected: Expo dev server starts

### Step 2: Test adding reactions in feed

**Actions:**
1. Navigate to a squad with photos
2. Find a photo_uploaded feed item
3. Tap an emoji in the ReactionBar
4. Verify it appears instantly (optimistic update)
5. Check another device to confirm real-time sync

**Expected:**
- Emoji appears immediately with count
- Border turns purple for user's reaction
- Other users see the reaction within 1-2 seconds

### Step 3: Test removing reactions

**Actions:**
1. Tap the same emoji again
2. Verify it disappears instantly

**Expected:**
- Reaction removed immediately
- Real-time sync removes it for all users

### Step 4: Test reactions in PhotoFullscreen

**Actions:**
1. Tap a photo to open fullscreen
2. Tap emojis in the picker at bottom
3. Verify reactions appear in ReactionBar above
4. Try toggling reactions on/off

**Expected:**
- Instant feedback
- No UI lag
- Smooth animations

### Step 5: Test real-time sync

**Actions:**
1. Open same photo on two devices
2. Add reaction on device A
3. Verify it appears on device B

**Expected:**
- Reaction appears on device B within 1-2 seconds
- Count updates correctly

### Step 6: Test offline behavior

**Actions:**
1. Enable airplane mode
2. Try adding reaction
3. Verify it appears optimistically
4. Re-enable network
5. Check if reaction persists

**Expected:**
- Optimistic update shows immediately
- Syncs when back online
- If sync fails after timeout, shows error toast

### Step 7: Test edge cases

**Actions:**
1. Rapid tap same emoji multiple times
2. Delete a photo with reactions
3. Multiple users react with same emoji simultaneously

**Expected:**
- No duplicate reactions created
- Photo deletion removes reactions
- Counts update correctly with concurrent reactions

### Step 8: Visual polish check

**Verify:**
- [ ] Reaction buttons have sufficient touch targets (44x44pt)
- [ ] Spacing is consistent
- [ ] Colors match design system
- [ ] Animations feel smooth
- [ ] No layout shifts when reactions load

### Step 9: Document any issues found

Create GitHub issues for:
- Bugs discovered
- UX improvements needed
- Performance concerns

### Step 10: Final commit for manual testing fixes

```bash
git add .
git commit -m "fix: manual testing refinements for reactions

- Adjust touch target sizes
- Fix layout shift on reaction load
- Improve error handling for offline mode

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Performance Verification

**Files:**
- N/A (performance testing)

### Step 1: Test with many reactions

**Actions:**
1. Create a photo with 20+ reactions from different users
2. Scroll through feed
3. Monitor for lag or jank

**Expected:**
- Smooth scrolling
- No noticeable performance degradation

### Step 2: Test subscription cleanup

**Actions:**
1. Open React DevTools
2. Navigate between screens with photos
3. Check for memory leaks or lingering subscriptions

**Expected:**
- Subscriptions unsubscribe on component unmount
- No memory leaks

### Step 3: Test real-time message volume

**Actions:**
1. Have 5+ users react to same photo simultaneously
2. Monitor network tab for message frequency

**Expected:**
- Messages arrive efficiently
- No duplicate or excessive re-renders

### Step 4: Profile render performance

Run: React DevTools Profiler while adding reactions

**Expected:**
- Reaction add: < 16ms render time
- No unnecessary re-renders of parent components

---

## Success Criteria

### Functional Requirements
- ✅ Users can add reactions by tapping emojis
- ✅ Users can remove reactions by tapping again (toggle)
- ✅ Reactions display in feed (photo_uploaded items)
- ✅ Reactions display in PhotoFullscreen modal
- ✅ Real-time sync across all users (< 2s latency)
- ✅ Optimistic updates feel instant (< 100ms)
- ✅ No duplicate reactions possible

### Non-Functional Requirements
- ✅ Works offline with graceful degradation
- ✅ No memory leaks from subscriptions
- ✅ Smooth performance with 20+ reactions
- ✅ Accessible touch targets (44x44pt minimum)

### Code Quality
- ✅ All tests passing
- ✅ DRY: Shared hook and components
- ✅ YAGNI: No over-engineering
- ✅ TDD: Tests written before implementation
- ✅ Frequent commits with clear messages

---

## Future Enhancements (Not in This Plan)

- Reaction notifications
- "Who reacted" detail view
- Custom emoji upload
- Animated reaction effects
- Reaction analytics
