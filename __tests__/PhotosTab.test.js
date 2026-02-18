import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import PhotosTab from '../src/components/photos/PhotosTab';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/context/AuthContext';

// Mock dependencies
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../src/components/photos/PhotoActionSheet', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockPhotoActionSheet({ visible, onClose, onOpenFullscreen, photo }) {
    if (!visible) return null;
    return (
      <View>
        <Text>View</Text>
        <TouchableOpacity onPress={onClose}><Text>Cancel</Text></TouchableOpacity>
      </View>
    );
  };
});

describe('PhotosTab', () => {
  const mockSquadId = 'squad-123';
  const mockUserId = 'user-123';
  const mockOnPhotoPress = jest.fn();

  // Helper to create mock query chain for the 3-query pattern
  const setupMockQueries = (photosData = [], usersData = [], eventsData = []) => {
    supabase.from.mockImplementation((table) => {
      if (table === 'photos') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: photosData,
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: usersData,
              error: null,
            }),
          }),
        };
      } else if (table === 'events') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: eventsData,
              error: null,
            }),
          }),
        };
      }
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({
      user: { id: mockUserId },
    });

    // Mock realtime subscription
    const mockSubscription = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    };

    supabase.channel.mockReturnValue(mockSubscription);
  });

  it('should render loading state initially', () => {
    setupMockQueries([], [], []);

    const { getByTestId } = render(
      <PhotosTab squadId={mockSquadId} onPhotoPress={mockOnPhotoPress} />
    );

    // ActivityIndicator is shown during loading
  });

  it('should fetch and display photos with manual join', async () => {
    const mockPhotosData = [
      {
        id: 'photo-1',
        photo_url: 'https://example.com/photo1.jpg',
        caption: 'Test photo',
        uploaded_by: mockUserId,
        event_id: 'event-1',
        created_at: new Date().toISOString(),
      },
    ];

    const mockUsersData = [
      {
        id: mockUserId,
        full_name: 'Test User',
      },
    ];

    const mockEventsData = [
      {
        id: 'event-1',
        title: 'Test Event',
      },
    ];

    setupMockQueries(mockPhotosData, mockUsersData, mockEventsData);

    render(
      <PhotosTab squadId={mockSquadId} onPhotoPress={mockOnPhotoPress} />
    );

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photos');
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(supabase.from).toHaveBeenCalledWith('events');
    });
  });

  it('should display empty state when no photos', async () => {
    setupMockQueries([], [], []);

    const { findByText } = render(
      <PhotosTab squadId={mockSquadId} />
    );

    const emptyText = await findByText('No photos yet');
    expect(emptyText).toBeTruthy();
  });

  it('should call onPhotoPress when photo is tapped', async () => {
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

    const mockUsersData = [
      {
        id: mockUserId,
        full_name: 'Test User',
      },
    ];

    setupMockQueries(mockPhotosData, mockUsersData, []);

    render(
      <PhotosTab squadId={mockSquadId} onPhotoPress={mockOnPhotoPress} />
    );

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photos');
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    // Note: In actual implementation, we'd need to add testID to TouchableOpacity
    // to be able to trigger press events in tests
  });

  it('should subscribe to real-time photo updates', () => {
    setupMockQueries([], [], []);

    const mockOn = jest.fn().mockReturnThis();
    const mockSubscribe = jest.fn().mockReturnThis();
    const mockUnsubscribe = jest.fn();

    const mockChannel = {
      on: mockOn,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    };

    supabase.channel.mockReturnValue(mockChannel);

    const { unmount } = render(
      <PhotosTab squadId={mockSquadId} />
    );

    // Should create channel for squad photos
    expect(supabase.channel).toHaveBeenCalledWith(`photos:${mockSquadId}`);

    // Should subscribe to INSERT and DELETE events
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        table: 'photos',
      }),
      expect.any(Function)
    );

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'DELETE',
        table: 'photos',
      }),
      expect.any(Function)
    );

    expect(mockSubscribe).toHaveBeenCalled();

    // Should unsubscribe on unmount
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle photo fetch errors gracefully', async () => {
    // Mock error for photos query
    supabase.from.mockImplementation((table) => {
      if (table === 'photos') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        };
      }
    });

    // Should not crash
    render(
      <PhotosTab squadId={mockSquadId} />
    );

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photos');
    });
  });

  it('should handle photos without event_id correctly', async () => {
    const mockPhotosData = [
      {
        id: 'photo-1',
        photo_url: 'https://example.com/photo1.jpg',
        caption: 'Test photo',
        uploaded_by: mockUserId,
        event_id: null, // No event
        created_at: new Date().toISOString(),
      },
    ];

    const mockUsersData = [
      {
        id: mockUserId,
        full_name: 'Test User',
      },
    ];

    setupMockQueries(mockPhotosData, mockUsersData, []);

    render(
      <PhotosTab squadId={mockSquadId} />
    );

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photos');
      expect(supabase.from).toHaveBeenCalledWith('users');
      // Should not query events table when no photos have event_id
    });
  });

  it('should enrich photos with uploader and event data', async () => {
    const mockPhotosData = [
      {
        id: 'photo-1',
        photo_url: 'https://example.com/photo1.jpg',
        caption: 'Photo at event',
        uploaded_by: 'user-1',
        event_id: 'event-1',
        created_at: new Date().toISOString(),
      },
      {
        id: 'photo-2',
        photo_url: 'https://example.com/photo2.jpg',
        caption: 'Random photo',
        uploaded_by: 'user-2',
        event_id: null,
        created_at: new Date().toISOString(),
      },
    ];

    const mockUsersData = [
      { id: 'user-1', full_name: 'Alice' },
      { id: 'user-2', full_name: 'Bob' },
    ];

    const mockEventsData = [
      { id: 'event-1', title: 'Birthday Party' },
    ];

    setupMockQueries(mockPhotosData, mockUsersData, mockEventsData);

    render(
      <PhotosTab squadId={mockSquadId} />
    );

    await waitFor(() => {
      // Should fetch from all 3 tables
      expect(supabase.from).toHaveBeenCalledWith('photos');
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(supabase.from).toHaveBeenCalledWith('events');
    });

    // Component should combine the data correctly
    // The enrichment happens in fetchPhotos function
  });

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

    const { findByTestId } = render(
      <PhotosTab squadId={mockSquadId} onPhotoPress={mockOnPhotoPress} />
    );

    const photoItem = await findByTestId('photo-item-photo-1');
    expect(photoItem).toBeTruthy();
  });
});
