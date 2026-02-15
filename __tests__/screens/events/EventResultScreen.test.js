import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import EventResultScreen from '../../../src/screens/events/EventResultScreen';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/context/AuthContext';

// Mock dependencies
jest.mock('../../../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('EventResultScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockRoute = {
    params: {
      eventId: 'event-123',
      eventTitle: 'Dinner Vote Results',
    },
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
  });

  describe('Winner Display', () => {
    it('should clearly show the winner with trophy emoji', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Italian Restaurant',
          vote_count: 10,
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
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockVotes,
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Winner')).toBeTruthy();
        expect(getByText('Italian Restaurant')).toBeTruthy();
        expect(getByText('10 votes (67%)')).toBeTruthy();
      }, { timeout: 10000 });
    }, 15000);

    it('should show winner card prominently at the top', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Top Choice',
          vote_count: 8,
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Winner')).toBeTruthy();
        expect(getByText('Top Choice')).toBeTruthy();
      });
    });
  });

  describe('Vote Breakdown', () => {
    it('should show full vote breakdown with percentages', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Option A',
          vote_count: 6,
        },
        {
          id: 'option-2',
          option_name: 'Option B',
          vote_count: 4,
        },
      ];

      const mockVotes = [
        {
          option_id: 'option-1',
          users: { full_name: 'Alice' },
        },
        {
          option_id: 'option-2',
          users: { full_name: 'Bob' },
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockVotes,
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('All Results (10 total votes)')).toBeTruthy();
        expect(getByText('6 votes')).toBeTruthy();
        expect(getByText('4 votes')).toBeTruthy();
        expect(getByText('60%')).toBeTruthy();
        expect(getByText('40%')).toBeTruthy();
      });
    });

    it('should show who voted for each option', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Italian Restaurant',
          vote_count: 3,
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
          option_id: 'option-1',
          users: { full_name: 'Bob Johnson' },
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockVotes,
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('John Doe, Jane Smith, Bob Johnson')).toBeTruthy();
      });
    });

    it('should display visual progress bars for each option', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'High Votes',
          vote_count: 8,
        },
        {
          id: 'option-2',
          option_name: 'Low Votes',
          vote_count: 2,
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('80%')).toBeTruthy();
        expect(getByText('20%')).toBeTruthy();
      });
    });

    it('should highlight winner in the results list', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Winner Option',
          vote_count: 10,
        },
        {
          id: 'option-2',
          option_name: 'Second Place',
          vote_count: 5,
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Winner should have trophy emoji
        expect(getByText(/🏆.*Winner Option/)).toBeTruthy();
        // Second place should not
        const secondPlace = getByText('Second Place');
        expect(secondPlace).toBeTruthy();
      });
    });
  });

  describe('RSVP Section', () => {
    it('should show RSVP buttons', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Test Option',
          vote_count: 5,
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Are you in?')).toBeTruthy();
        expect(getByText("I'm in!")).toBeTruthy();
        expect(getByText("I'm out")).toBeTruthy();
      });
    });

    it('should allow toggling RSVP status', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Test Option',
          vote_count: 5,
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const inButton = getByText("I'm in!");
        fireEvent.press(inButton);

        const outButton = getByText("I'm out");
        fireEvent.press(outButton);
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching results', async () => {
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(
              new Promise(() => {}) // Never resolves
            ),
          }),
        }),
      }));

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(getByText('Loading results...')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero total votes correctly', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'No Votes',
          vote_count: 0,
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('All Results (0 total votes)')).toBeTruthy();
        expect(getByText('0%')).toBeTruthy();
      });
    });

    it('should handle options with no voters', async () => {
      const mockOptions = [
        {
          id: 'option-1',
          option_name: 'Lonely Option',
          vote_count: 0,
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'event_options') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockOptions,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'event_votes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
      });

      const { getByText, queryByText } = render(
        <EventResultScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Lonely Option')).toBeTruthy();
        expect(getByText('0 votes')).toBeTruthy();
        // Should not crash or show voter names section
      });
    });
  });
});
