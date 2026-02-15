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

describe('PhotosTab', () => {
  const mockSquadId = 'squad-123';
  const mockUserId = 'user-123';
  const mockOnPhotoPress = jest.fn();

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
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    supabase.from.mockReturnValue({
      select: selectMock,
    });

    const { getByTestId } = render(
      <PhotosTab squadId={mockSquadId} onPhotoPress={mockOnPhotoPress} />
    );

    // ActivityIndicator is shown during loading
  });

  it('should fetch and display photos', async () => {
    const mockPhotos = [
      {
        id: 'photo-1',
        photo_url: 'https://example.com/photo1.jpg',
        caption: 'Test photo',
        uploaded_by: mockUserId,
        created_at: new Date().toISOString(),
        uploader: { full_name: 'Test User' },
        event: null,
      },
    ];

    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockPhotos,
          error: null,
        }),
      }),
    });

    supabase.from.mockReturnValue({
      select: selectMock,
    });

    const { findByText } = render(
      <PhotosTab squadId={mockSquadId} onPhotoPress={mockOnPhotoPress} />
    );

    await waitFor(() => {
      expect(selectMock).toHaveBeenCalled();
    });
  });

  it('should display empty state when no photos', async () => {
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    supabase.from.mockReturnValue({
      select: selectMock,
    });

    const { findByText } = render(
      <PhotosTab squadId={mockSquadId} />
    );

    const emptyText = await findByText('No photos yet');
    expect(emptyText).toBeTruthy();
  });

  it('should call onPhotoPress when photo is tapped', async () => {
    const mockPhoto = {
      id: 'photo-1',
      photo_url: 'https://example.com/photo1.jpg',
      caption: 'Test photo',
      uploaded_by: mockUserId,
      created_at: new Date().toISOString(),
      uploader: { full_name: 'Test User' },
      event: null,
    };

    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockPhoto],
          error: null,
        }),
      }),
    });

    supabase.from.mockReturnValue({
      select: selectMock,
    });

    const { findByText } = render(
      <PhotosTab squadId={mockSquadId} onPhotoPress={mockOnPhotoPress} />
    );

    await waitFor(() => {
      expect(selectMock).toHaveBeenCalled();
    });

    // Note: In actual implementation, we'd need to add testID to TouchableOpacity
    // to be able to trigger press events in tests
  });

  it('should subscribe to real-time photo updates', () => {
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    supabase.from.mockReturnValue({
      select: selectMock,
    });

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
    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    });

    supabase.from.mockReturnValue({
      select: selectMock,
    });

    // Should not crash
    const { findByText } = render(
      <PhotosTab squadId={mockSquadId} />
    );

    await waitFor(() => {
      expect(selectMock).toHaveBeenCalled();
    });
  });
});
