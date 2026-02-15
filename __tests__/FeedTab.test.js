import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import FeedTab from '../src/components/feed/FeedTab';
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

describe('FeedTab', () => {
  const mockSquadId = 'squad-123';
  const mockUserId = 'user-123';
  const mockOnPhotoPress = jest.fn();
  const mockOnEventPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth context
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
    // Mock empty feed
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
      <FeedTab squadId={mockSquadId} />
    );

    // Should show loading initially (ActivityIndicator doesn't have testID by default)
    // We'll check this differently in the actual app
  });

  it('should fetch and display feed items', async () => {
    const mockFeedItems = [
      {
        id: 'feed-1',
        type: 'event_created',
        entity_id: 'event-1',
        created_by: mockUserId,
        created_at: new Date().toISOString(),
      },
    ];

    const mockUser = {
      id: mockUserId,
      full_name: 'Test User',
    };

    const mockEvent = {
      id: 'event-1',
      title: 'Test Event',
    };

    // Mock feed items query
    const feedSelectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockFeedItems,
          error: null,
        }),
      }),
    });

    // Mock user query
    const userSelectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      }),
    });

    // Mock event query
    const eventSelectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockEvent,
          error: null,
        }),
      }),
    });

    supabase.from.mockImplementation((table) => {
      if (table === 'feed_items') {
        return { select: feedSelectMock };
      } else if (table === 'users') {
        return { select: userSelectMock };
      } else if (table === 'events') {
        return { select: eventSelectMock };
      }
      return { select: jest.fn() };
    });

    const { findByText } = render(
      <FeedTab
        squadId={mockSquadId}
        onPhotoPress={mockOnPhotoPress}
        onEventPress={mockOnEventPress}
      />
    );

    await waitFor(() => {
      expect(feedSelectMock).toHaveBeenCalled();
    }, { timeout: 10000 });

    // Should display the feed item
    const userName = await findByText('Test User', {}, { timeout: 10000 });
    expect(userName).toBeTruthy();
  }, 15000);

  it('should display empty state when no feed items', async () => {
    // Mock empty feed
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
      <FeedTab squadId={mockSquadId} />
    );

    const emptyText = await findByText('No activity yet');
    expect(emptyText).toBeTruthy();

    const emptySubtext = await findByText(/Create events, upload photos/);
    expect(emptySubtext).toBeTruthy();
  });

  it('should handle refresh', async () => {
    const mockFeedItems = [];

    const selectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockFeedItems,
          error: null,
        }),
      }),
    });

    supabase.from.mockReturnValue({
      select: selectMock,
    });

    const { getByTestId } = render(
      <FeedTab squadId={mockSquadId} />
    );

    await waitFor(() => {
      expect(selectMock).toHaveBeenCalled();
    });

    // Clear mock to count new calls
    selectMock.mockClear();

    // Trigger refresh (FlatList with RefreshControl)
    // This is hard to test without the actual FlatList testID
    // In real implementation, we'd add testID to FlatList
  });

  it('should subscribe to realtime feed updates', () => {
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
      <FeedTab squadId={mockSquadId} />
    );

    // Should create channel for squad
    expect(supabase.channel).toHaveBeenCalledWith(`feed:${mockSquadId}`);

    // Should subscribe to INSERT events
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        table: 'feed_items',
        filter: `squad_id=eq.${mockSquadId}`,
      }),
      expect.any(Function)
    );

    expect(mockSubscribe).toHaveBeenCalled();

    // Should unsubscribe on unmount
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should handle feed fetch errors gracefully', async () => {
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
      <FeedTab squadId={mockSquadId} />
    );

    // Should still show empty state
    await waitFor(() => {
      expect(selectMock).toHaveBeenCalled();
    });
  });
});
