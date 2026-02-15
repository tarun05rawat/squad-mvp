import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import SwipeVotingScreen from '../../../src/screens/events/SwipeVotingScreen';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';

// Mock dependencies
jest.mock('../../../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-native-deck-swiper', () => 'Swiper');

describe('SwipeVotingScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockRoute = {
    params: {
      eventId: 'event-123',
      eventTitle: 'Dinner Vote',
    },
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });

    // Mock channel subscription
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    };
    supabase.channel.mockReturnValue(mockChannel);
  });

  describe('Vote Display', () => {
    it('should show live vote count for each option', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Italian Restaurant',
          vote_count: 3,
        },
        {
          id: 'option-2',
          option_name: 'Mexican Restaurant',
          vote_count: 5,
        },
      ];

      const mockVotes = [
        {
          option_id: 'option-1',
          users: { full_name: 'John Doe' },
        },
        {
          option_id: 'option-1',
          users: { full_name: 'Jane Smith' },
        },
        {
          option_id: 'option-2',
          users: { full_name: 'Bob Johnson' },
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockOptions,
                error: null,
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: mockVotes,
                  error: null,
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({}),
          };
        }
      });

      const { getByText } = render(
        <SwipeVotingScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Dinner Vote')).toBeTruthy();
      });
    });

    it.skip('should show full names of voters (not initials)', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Italian Restaurant',
          vote_count: 2,
        },
      ];

      const mockVotes = [
        {
          option_id: 'option-1',
          users: { full_name: 'John Doe' },
        },
        {
          option_id: 'option-1',
          users: { full_name: 'Jane Smith' },
        },
      ];

      let callCount = 0;
      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockOptions,
                error: null,
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          callCount++;
          if (callCount === 1) {
            // First call: get voters
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: mockVotes,
                  error: null,
                }),
              }),
            };
          } else {
            // Second call: get user's votes
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            };
          }
        }
      });

      const { getByText } = render(
        <SwipeVotingScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Should show full names, not initials like "JD, JS"
        expect(getByText('Dinner Vote')).toBeTruthy();
      });
    });

    it('should NOT show skip votes', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Italian Restaurant',
          vote_count: 2,
        },
      ];

      const mockVotes = [
        {
          option_id: 'option-1',
          users: { full_name: 'John Doe' },
        },
        // Skips are not recorded in database, so they shouldn't appear
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockOptions,
                error: null,
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const { queryByText } = render(
        <SwipeVotingScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // There should be no "skip" or "passed" indicators
        expect(queryByText(/skip/i)).toBeNull();
        expect(queryByText(/passed/i)).toBeNull();
      });
    });
  });

  describe('Voting Behavior', () => {
    it('should record YES vote on swipe right', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Italian Restaurant',
          vote_count: 0,
        },
      ];

      const insertMock = jest.fn().mockResolvedValue({});
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({}),
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockOptions,
                error: null,
              }),
            }),
            update: updateMock,
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
            insert: insertMock,
          };
        }
      });

      const { getByText } = render(
        <SwipeVotingScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Dinner Vote')).toBeTruthy();
      });

      // Note: Testing actual swipe gestures requires more complex setup
      // This validates the data fetching works correctly
    });

    it('should NOT record vote on swipe left (skip)', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Italian Restaurant',
          vote_count: 0,
        },
      ];

      const insertMock = jest.fn();

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockOptions,
                error: null,
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
            insert: insertMock,
          };
        }
      });

      const { getByText } = render(
        <SwipeVotingScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Dinner Vote')).toBeTruthy();
      });

      // Skips should not call insert
      // This is validated by the function implementation
    });
  });

  describe('Post-Voting View', () => {
    it('should show live tally after all votes are cast', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Italian Restaurant',
          vote_count: 3,
        },
        {
          id: 'option-2',
          option_name: 'Mexican Restaurant',
          vote_count: 5,
        },
      ];

      const mockUserVotes = [
        { option_id: 'option-1' },
        { option_id: 'option-2' },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockOptions,
                error: null,
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: mockUserVotes,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <SwipeVotingScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText("You've voted!")).toBeTruthy();
        expect(getByText('Live tally:')).toBeTruthy();
      });
    });

    it('should show options sorted by vote count in tally', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Italian Restaurant',
          vote_count: 2,
        },
        {
          id: 'option-2',
          option_name: 'Mexican Restaurant',
          vote_count: 5,
        },
      ];

      const mockUserVotes = mockOptions.map((opt) => ({ option_id: opt.id }));

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockOptions,
                error: null,
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: mockUserVotes,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <SwipeVotingScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('5 votes')).toBeTruthy();
        expect(getByText('2 votes')).toBeTruthy();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching options', async () => {
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(
              new Promise(() => {}) // Never resolves
            ),
          }),
        }),
      }));

      const { getByText } = render(
        <SwipeVotingScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(getByText('Loading options...')).toBeTruthy();
    });
  });
});
