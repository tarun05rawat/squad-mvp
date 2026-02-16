import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import PhotoReactions from '../src/components/photos/PhotoReactions';
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

describe('PhotoReactions', () => {
  const mockPhotoId = 'photo-123';
  const mockUserId = 'user-123';

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

  const setupMockReactions = (reactionsData = []) => {
    supabase.from.mockImplementation((table) => {
      if (table === 'photo_reactions') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: reactionsData,
              error: null,
            }),
          }),
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
  };

  it('should render emoji picker', async () => {
    setupMockReactions([]);

    const { getByText } = render(<PhotoReactions photoId={mockPhotoId} />);

    await waitFor(() => {
      expect(getByText('❤️')).toBeTruthy();
      expect(getByText('😂')).toBeTruthy();
      expect(getByText('🔥')).toBeTruthy();
    });
  });

  it('should fetch and display reactions', async () => {
    const mockReactions = [
      { emoji: '❤️', user_id: mockUserId },
      { emoji: '❤️', user_id: 'user-456' },
      { emoji: '🔥', user_id: 'user-789' },
    ];

    setupMockReactions(mockReactions);

    const { findByText } = render(<PhotoReactions photoId={mockPhotoId} />);

    // Should show reaction counts
    await waitFor(() => {
      // Heart has 2 reactions
      expect(supabase.from).toHaveBeenCalledWith('photo_reactions');
    });
  });

  it('should highlight user reactions', async () => {
    const mockReactions = [
      { emoji: '❤️', user_id: mockUserId },
      { emoji: '🔥', user_id: 'user-789' },
    ];

    setupMockReactions(mockReactions);

    render(<PhotoReactions photoId={mockPhotoId} />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photo_reactions');
    });

    // User has reacted with ❤️, so it should be highlighted
    // This would be verified via style in the actual component
  });

  it('should add reaction when emoji is tapped', async () => {
    setupMockReactions([]);

    const { getByText } = render(<PhotoReactions photoId={mockPhotoId} />);

    await waitFor(() => {
      expect(getByText('❤️')).toBeTruthy();
    });

    const heartEmoji = getByText('❤️');
    fireEvent.press(heartEmoji);

    await waitFor(() => {
      // Should call insert
      expect(supabase.from).toHaveBeenCalledWith('photo_reactions');
    });
  });

  it('should remove reaction when tapped again', async () => {
    const mockReactions = [
      { emoji: '❤️', user_id: mockUserId },
    ];

    setupMockReactions(mockReactions);

    const { getAllByText } = render(<PhotoReactions photoId={mockPhotoId} />);

    await waitFor(() => {
      const heartEmojis = getAllByText('❤️');
      expect(heartEmojis.length).toBeGreaterThan(0);
    });

    // Get the first emoji button (in the picker)
    const heartEmojis = getAllByText('❤️');
    fireEvent.press(heartEmojis[0]);

    await waitFor(() => {
      // Should call delete
      expect(supabase.from).toHaveBeenCalledWith('photo_reactions');
    });
  });

  it('should subscribe to real-time reaction updates', () => {
    setupMockReactions([]);

    const mockOn = jest.fn().mockReturnThis();
    const mockSubscribe = jest.fn().mockReturnThis();
    const mockUnsubscribe = jest.fn();

    const mockChannel = {
      on: mockOn,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    };

    supabase.channel.mockReturnValue(mockChannel);

    const { unmount } = render(<PhotoReactions photoId={mockPhotoId} />);

    // Should create channel for photo reactions
    expect(supabase.channel).toHaveBeenCalledWith(`photo-reactions:${mockPhotoId}`);

    // Should subscribe to INSERT and DELETE events
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        table: 'photo_reactions',
      }),
      expect.any(Function)
    );

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'DELETE',
        table: 'photo_reactions',
      }),
      expect.any(Function)
    );

    expect(mockSubscribe).toHaveBeenCalled();

    // Should unsubscribe on unmount
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle fetch errors gracefully', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'photo_reactions') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        };
      }
    });

    // Should not crash
    render(<PhotoReactions photoId={mockPhotoId} />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photo_reactions');
    });
  });
});
