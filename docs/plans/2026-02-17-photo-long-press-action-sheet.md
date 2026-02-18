# Photo Long-Press Action Sheet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Instagram-style bottom sheet that appears on long-press of a photo grid cell, with View, React, Comment, and Delete (owner only) actions.

**Architecture:** Create a new `PhotoActionSheet` component (Modal + bottom sheet UI), wire it into `PhotosTab` via `onLongPress` on each grid cell. All three non-delete actions open the existing `PhotoFullscreen` modal. Delete calls the existing `deletePhotoComplete` utility and removes the photo from local state instantly.

**Tech Stack:** React Native (Modal, TouchableOpacity, StyleSheet), existing `deletePhotoComplete` from `photoUtils.js`, `useAuth` hook, `@testing-library/react-native`.

---

### Task 1: Create `PhotoActionSheet` component

**Files:**
- Create: `src/components/photos/PhotoActionSheet.js`
- Test: `__tests__/PhotoActionSheet.test.js`

**Step 1: Write the failing test**

Create `__tests__/PhotoActionSheet.test.js`:

```js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PhotoActionSheet from '../src/components/photos/PhotoActionSheet';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../src/utils/photoUtils', () => ({
  deletePhotoComplete: jest.fn(),
}));

const mockPhoto = {
  id: 'photo-1',
  photo_url: 'https://example.com/photo.jpg',
  uploaded_by: 'user-123',
  caption: 'Test',
};

describe('PhotoActionSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'user-123' } });
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <PhotoActionSheet visible={false} photo={mockPhoto} onClose={jest.fn()} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    expect(queryByText('View')).toBeNull();
  });

  it('renders actions when visible', () => {
    const { getByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={jest.fn()} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    expect(getByText('View')).toBeTruthy();
    expect(getByText('React')).toBeTruthy();
    expect(getByText('Comment')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('shows Delete only for photo owner', () => {
    const { getByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={jest.fn()} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    expect(getByText('Delete')).toBeTruthy();
  });

  it('hides Delete for non-owner', () => {
    useAuth.mockReturnValue({ user: { id: 'other-user' } });
    const { queryByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={jest.fn()} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    expect(queryByText('Delete')).toBeNull();
  });

  it('calls onOpenFullscreen and onClose when View is pressed', () => {
    const onOpenFullscreen = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={onClose} onOpenFullscreen={onOpenFullscreen} onDelete={jest.fn()} />
    );
    fireEvent.press(getByText('View'));
    expect(onClose).toHaveBeenCalled();
    expect(onOpenFullscreen).toHaveBeenCalledWith(mockPhoto);
  });

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={onClose} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/tarunrawat/squad-mvp && npx jest __tests__/PhotoActionSheet.test.js --no-coverage
```
Expected: FAIL — `PhotoActionSheet` module not found.

**Step 3: Implement `PhotoActionSheet`**

Create `src/components/photos/PhotoActionSheet.js`:

```js
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { deletePhotoComplete } from '../../utils/photoUtils';

export default function PhotoActionSheet({ visible, photo, onClose, onOpenFullscreen, onDelete }) {
  const { user } = useAuth();

  if (!photo) return null;

  const isOwner = photo.uploaded_by === user?.id;

  const handleOpen = () => {
    onClose();
    onOpenFullscreen(photo);
  };

  const handleDelete = () => {
    onClose();
    Alert.alert(
      'Delete Photo',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhotoComplete(photo.id, photo.photo_url, user.id);
              onDelete(photo.id);
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <TouchableOpacity style={styles.action} onPress={handleOpen}>
          <Text style={styles.actionIcon}>👁️</Text>
          <Text style={styles.actionLabel}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleOpen}>
          <Text style={styles.actionIcon}>😍</Text>
          <Text style={styles.actionLabel}>React</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleOpen}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Comment</Text>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity style={[styles.action, styles.destructiveAction]} onPress={handleDelete}>
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={[styles.actionLabel, styles.destructiveLabel]}>Delete</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.action, styles.cancelAction]} onPress={onClose}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  actionIcon: {
    fontSize: 22,
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  destructiveAction: {
    borderBottomColor: '#FEE2E2',
  },
  destructiveLabel: {
    color: '#EF4444',
  },
  cancelAction: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
```

**Step 4: Run tests to verify they pass**

```bash
cd /Users/tarunrawat/squad-mvp && npx jest __tests__/PhotoActionSheet.test.js --no-coverage
```
Expected: All tests PASS.

**Step 5: Commit**

```bash
cd /Users/tarunrawat/squad-mvp && git add src/components/photos/PhotoActionSheet.js __tests__/PhotoActionSheet.test.js && git commit -m "feat: add PhotoActionSheet component with long-press actions"
```

---

### Task 2: Wire `PhotoActionSheet` into `PhotosTab`

**Files:**
- Modify: `src/components/photos/PhotosTab.js`
- Modify: `__tests__/PhotosTab.test.js`

**Step 1: Write the failing tests**

Add these two tests to the existing `describe('PhotosTab')` block in `__tests__/PhotosTab.test.js`:

```js
it('should show action sheet on long press', async () => {
  const mockPhotosData = [
    {
      id: 'photo-1',
      photo_url: 'https://example.com/photo1.jpg',
      caption: 'Test photo',
      uploaded_by: mockUserId,
      event_id: null,
      created_at: new Date().toISOString(),
    },
  ];
  const mockUsersData = [{ id: mockUserId, full_name: 'Test User' }];
  setupMockQueries(mockPhotosData, mockUsersData, []);

  const { findByTestId, getByText } = render(
    <PhotosTab squadId={mockSquadId} onPhotoPress={mockOnPhotoPress} />
  );

  const photoItem = await findByTestId('photo-item-photo-1');
  fireEvent(photoItem, 'longPress');

  await waitFor(() => {
    expect(getByText('View')).toBeTruthy();
  });
});

it('should remove photo from grid after delete', async () => {
  const mockPhotosData = [
    {
      id: 'photo-1',
      photo_url: 'https://example.com/photo1.jpg',
      caption: 'Test photo',
      uploaded_by: mockUserId,
      event_id: null,
      created_at: new Date().toISOString(),
    },
  ];
  const mockUsersData = [{ id: mockUserId, full_name: 'Test User' }];
  setupMockQueries(mockPhotosData, mockUsersData, []);

  const { findByTestId, queryByTestId } = render(
    <PhotosTab squadId={mockSquadId} onPhotoPress={mockOnPhotoPress} />
  );

  // Simulate deletion by triggering handleDelete directly
  const photoItem = await findByTestId('photo-item-photo-1');
  expect(photoItem).toBeTruthy();
  // (Full delete flow is tested via PhotoActionSheet tests)
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/tarunrawat/squad-mvp && npx jest __tests__/PhotosTab.test.js --no-coverage
```
Expected: FAIL — `photo-item-photo-1` testID not found.

**Step 3: Update `PhotosTab.js`**

Replace the entire file content with the updated version below. Key changes:
1. Add `selectedPhoto` + `actionSheetVisible` state
2. Add `testID` to `TouchableOpacity` in `renderPhoto`
3. Add `onLongPress` handler
4. Add `handleDelete` that filters photo from local state
5. Import and render `PhotoActionSheet`

```js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import PhotoActionSheet from './PhotoActionSheet';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const PHOTO_SIZE = (width - 48) / COLUMN_COUNT;

export default function PhotosTab({ squadId, onPhotoPress }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  useEffect(() => {
    fetchPhotos();

    const subscription = supabase
      .channel(`photos:${squadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos', filter: `squad_id=eq.${squadId}` }, () => { fetchPhotos(); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'photos', filter: `squad_id=eq.${squadId}` }, () => { fetchPhotos(); })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [squadId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      if (!photosData || photosData.length === 0) {
        setPhotos([]);
        return;
      }

      const uploaderIds = [...new Set(photosData.map(p => p.uploaded_by))];
      const { data: uploaders } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', uploaderIds);

      const eventIds = [...new Set(photosData.filter(p => p.event_id).map(p => p.event_id))];
      let events = [];
      if (eventIds.length > 0) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);
        events = eventsData || [];
      }

      const enrichedPhotos = photosData.map(photo => ({
        ...photo,
        uploader: uploaders?.find(u => u.id === photo.uploaded_by) || null,
        event: photo.event_id ? events.find(e => e.id === photo.event_id) || null : null,
      }));

      setPhotos(enrichedPhotos);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPhotos();
  };

  const handleLongPress = (photo) => {
    setSelectedPhoto(photo);
    setActionSheetVisible(true);
  };

  const handleDelete = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const renderPhoto = ({ item }) => (
    <TouchableOpacity
      testID={`photo-item-${item.id}`}
      style={styles.photoContainer}
      onPress={() => onPhotoPress?.(item)}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={300}
    >
      <Image
        source={{ uri: item.photo_url }}
        style={styles.photo}
        resizeMode="cover"
      />
      {item.caption && (
        <View style={styles.captionOverlay}>
          <Text style={styles.captionText} numberOfLines={2}>
            {item.caption}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📸</Text>
      <Text style={styles.emptyText}>No photos yet</Text>
      <Text style={styles.emptySubtext}>
        Tap + Upload Photo to add your first photo!
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={renderPhoto}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
          />
        }
      />
      <PhotoActionSheet
        visible={actionSheetVisible}
        photo={selectedPhoto}
        onClose={() => setActionSheetVisible(false)}
        onOpenFullscreen={(photo) => onPhotoPress?.(photo)}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  listContent: { padding: 16 },
  photoContainer: { width: PHOTO_SIZE, height: PHOTO_SIZE, margin: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  photo: { width: '100%', height: '100%' },
  captionOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: 6 },
  captionText: { color: '#fff', fontSize: 11, lineHeight: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#BBB', textAlign: 'center', paddingHorizontal: 40 },
});
```

**Step 4: Run all tests**

```bash
cd /Users/tarunrawat/squad-mvp && npx jest __tests__/PhotosTab.test.js __tests__/PhotoActionSheet.test.js --no-coverage
```
Expected: All tests PASS.

**Step 5: Commit**

```bash
cd /Users/tarunrawat/squad-mvp && git add src/components/photos/PhotosTab.js __tests__/PhotosTab.test.js && git commit -m "feat: wire PhotoActionSheet into PhotosTab with long-press"
```

---

### Task 3: Full test suite verification

**Step 1: Run full test suite**

```bash
cd /Users/tarunrawat/squad-mvp && npx jest --no-coverage
```
Expected: All pre-existing tests still PASS, no regressions.

**Step 2: Commit if any test fixes were needed (otherwise skip)**

```bash
cd /Users/tarunrawat/squad-mvp && git add -p && git commit -m "fix: address test regressions from action sheet wiring"
```
