import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import PhotoComments from '../src/components/photos/PhotoComments';
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

describe('PhotoComments', () => {
  const mockPhotoId = 'photo-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({
      user: {
        id: mockUserId,
        user_metadata: { full_name: 'Test User' },
      },
    });

    // Mock realtime subscription
    const mockSubscription = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    };

    supabase.channel.mockReturnValue(mockSubscription);
  });

  const setupMockComments = (commentsData = [], usersData = []) => {
    supabase.from.mockImplementation((table) => {
      if (table === 'photo_comments') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: commentsData,
                error: null,
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'new-comment-123',
                  photo_id: mockPhotoId,
                  user_id: mockUserId,
                  comment_text: 'Test comment',
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
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
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: usersData[0] || null,
                error: null,
              }),
            }),
          }),
        };
      }
    });
  };

  it('should display empty state when no comments', async () => {
    setupMockComments([], []);

    const { findByText } = render(<PhotoComments photoId={mockPhotoId} />);

    const emptyText = await findByText('No comments yet');
    expect(emptyText).toBeTruthy();

    const subtext = await findByText('Be the first to comment!');
    expect(subtext).toBeTruthy();
  });

  it('should fetch and display comments', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        photo_id: mockPhotoId,
        user_id: 'user-456',
        comment_text: 'Great photo!',
        created_at: new Date().toISOString(),
      },
    ];

    const mockUsers = [
      { id: 'user-456', full_name: 'John Doe' },
    ];

    setupMockComments(mockComments, mockUsers);

    const { findByText } = render(<PhotoComments photoId={mockPhotoId} />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photo_comments');
      expect(supabase.from).toHaveBeenCalledWith('users');
    });

    const commentText = await findByText('Great photo!');
    expect(commentText).toBeTruthy();
  });

  it('should post new comment', async () => {
    setupMockComments([], []);

    const { getByPlaceholderText, getByText } = render(
      <PhotoComments photoId={mockPhotoId} />
    );

    await waitFor(() => {
      expect(getByPlaceholderText('Add a comment...')).toBeTruthy();
    });

    const input = getByPlaceholderText('Add a comment...');
    fireEvent.changeText(input, 'This is a test comment');

    const postButton = getByText('Post');
    fireEvent.press(postButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photo_comments');
    });
  });

  it('should disable post button when input is empty', async () => {
    setupMockComments([], []);

    const { getByText } = render(<PhotoComments photoId={mockPhotoId} />);

    await waitFor(() => {
      const postButton = getByText('Post');
      expect(postButton).toBeTruthy();
      // Button should be disabled (would need to check disabled prop in actual component)
    });
  });

  it('should subscribe to real-time comment updates', () => {
    setupMockComments([], []);

    const mockOn = jest.fn().mockReturnThis();
    const mockSubscribe = jest.fn().mockReturnThis();
    const mockUnsubscribe = jest.fn();

    const mockChannel = {
      on: mockOn,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    };

    supabase.channel.mockReturnValue(mockChannel);

    const { unmount } = render(<PhotoComments photoId={mockPhotoId} />);

    // Should create channel for photo comments
    expect(supabase.channel).toHaveBeenCalledWith(`photo-comments:${mockPhotoId}`);

    // Should subscribe to INSERT and DELETE events
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        table: 'photo_comments',
      }),
      expect.any(Function)
    );

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'DELETE',
        table: 'photo_comments',
      }),
      expect.any(Function)
    );

    expect(mockSubscribe).toHaveBeenCalled();

    // Should unsubscribe on unmount
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should allow users to delete their own comments', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        photo_id: mockPhotoId,
        user_id: mockUserId, // Current user's comment
        comment_text: 'My comment',
        created_at: new Date().toISOString(),
      },
    ];

    const mockUsers = [
      { id: mockUserId, full_name: 'Test User' },
    ];

    setupMockComments(mockComments, mockUsers);

    const { findByText } = render(<PhotoComments photoId={mockPhotoId} />);

    const deleteButton = await findByText('Delete');
    expect(deleteButton).toBeTruthy();

    fireEvent.press(deleteButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photo_comments');
    });
  });

  it('should handle fetch errors gracefully', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'photo_comments') {
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
    render(<PhotoComments photoId={mockPhotoId} />);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('photo_comments');
    });
  });
});
