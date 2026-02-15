import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Share } from 'react-native';
import SquadDetailScreen from '../../../src/screens/squads/SquadDetailScreen';
import { supabase } from '../../../src/lib/supabase';

// Mock dependencies
jest.mock('../../../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => {
      callback();
    }, []);
  },
}));

jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    session: { access_token: 'test-token' },
    loading: false,
  }),
}));

// Mock photo components
jest.mock('../../../src/components/photos/PhotosTab', () => 'PhotosTab');
jest.mock('../../../src/components/photos/PhotoUploadModal', () => 'PhotoUploadModal');
jest.mock('../../../src/components/photos/PhotoFullscreen', () => 'PhotoFullscreen');

describe('SquadDetailScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockRoute = {
    params: {
      squadId: 'squad-123',
      squadName: 'Test Squad',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Members Tab', () => {
    it('should display all squad members with name and email prefix', async () => {
      const mockSquadMembers = [
        { user_id: 'user-1', joined_at: '2024-01-01' },
        { user_id: 'user-2', joined_at: '2024-01-02' },
      ];

      const mockUsers = [
        { id: 'user-1', full_name: 'John Doe', email: 'john@example.com' },
        { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com' },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockSquadMembers,
                error: null,
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Members tab
      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('john')).toBeTruthy();
        expect(getByText('Jane Smith')).toBeTruthy();
        expect(getByText('jane')).toBeTruthy();
      });
    });

    it('should handle members with missing email gracefully', async () => {
      const mockSquadMembers = [
        { user_id: 'user-1', joined_at: '2024-01-01' },
      ];

      const mockUsers = [
        { id: 'user-1', full_name: 'John Doe', email: null },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockSquadMembers,
                error: null,
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText, queryByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        // Email prefix should not be shown if email is missing
      });
    });

    it('should display avatar with first letter of name', async () => {
      const mockSquadMembers = [
        { user_id: 'user-1', joined_at: '2024-01-01' },
      ];

      const mockUsers = [
        { id: 'user-1', full_name: 'Alice Wonder', email: 'alice@example.com' },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockSquadMembers,
                error: null,
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      await waitFor(() => {
        expect(getByText('A')).toBeTruthy();
      });
    });

    it('should show empty state when no members exist', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      await waitFor(() => {
        expect(getByText('No members yet')).toBeTruthy();
      });
    });
  });

  describe('Events Tab', () => {
    it('should display events with correct status badges', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Dinner Vote',
          status: 'voting',
          description: 'Where should we go?',
        },
        {
          id: 'event-2',
          title: 'Movie Night',
          status: 'completed',
          description: null,
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockEvents,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Events tab
      const eventsTab = getByText('Events');
      fireEvent.press(eventsTab);

      await waitFor(() => {
        expect(getByText('Dinner Vote')).toBeTruthy();
        expect(getByText('voting')).toBeTruthy();
        expect(getByText('Movie Night')).toBeTruthy();
        expect(getByText('completed')).toBeTruthy();
      });
    });

    it('should navigate to SwipeVoting for voting events', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Dinner Vote',
          status: 'voting',
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockEvents,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Events tab
      const eventsTab = getByText('Events');
      fireEvent.press(eventsTab);

      await waitFor(() => {
        const eventCard = getByText('Dinner Vote');
        fireEvent.press(eventCard);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('SwipeVoting', {
        eventId: 'event-1',
        eventTitle: 'Dinner Vote',
      });
    });

    it('should navigate to EventResult for completed events', async () => {
      const mockEvents = [
        {
          id: 'event-2',
          title: 'Movie Night',
          status: 'completed',
        },
      ];

      supabase.from.mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockEvents,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Events tab
      const eventsTab = getByText('Events');
      fireEvent.press(eventsTab);

      await waitFor(() => {
        const eventCard = getByText('Movie Night');
        fireEvent.press(eventCard);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('EventResult', {
        eventId: 'event-2',
        eventTitle: 'Movie Night',
      });
    });
  });

  describe('Tab Switching', () => {
    it('should switch between Events and Members tabs', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Default is Feed tab
      await waitFor(() => {
        expect(getByText('No activity yet')).toBeTruthy();
      });

      // Switch to Events tab
      const eventsTab = getByText('Events');
      fireEvent.press(eventsTab);

      await waitFor(() => {
        expect(getByText('+ New Event')).toBeTruthy();
      });

      // Switch to Members
      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      await waitFor(() => {
        expect(getByText('No members yet')).toBeTruthy();
      });

      // Switch back to Events
      fireEvent.press(eventsTab);

      await waitFor(() => {
        expect(getByText('+ New Event')).toBeTruthy();
      });
    });
  });

  describe('Invite Member Functionality', () => {
    it('should show Invite Member button in Members tab', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Members tab
      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      await waitFor(() => {
        expect(getByText('+ Invite Member')).toBeTruthy();
      });
    });

    it('should open invite modal when Invite Member button is pressed', async () => {
      const mockInviteCode = 'XYZ789';

      supabase.from.mockImplementation((table) => {
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: mockInviteCode },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Members tab
      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      await waitFor(() => {
        const inviteButton = getByText('+ Invite Member');
        fireEvent.press(inviteButton);
      });

      await waitFor(() => {
        expect(getByText('Invite to Test Squad')).toBeTruthy();
        expect(getByText(mockInviteCode)).toBeTruthy();
        expect(getByText('Share Invite')).toBeTruthy();
      });
    });

    it('should fetch and display invite code in modal', async () => {
      const mockInviteCode = 'ABC123';

      supabase.from.mockImplementation((table) => {
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: mockInviteCode },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Members tab
      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      await waitFor(() => {
        const inviteButton = getByText('+ Invite Member');
        fireEvent.press(inviteButton);
      });

      await waitFor(() => {
        expect(getByText(mockInviteCode)).toBeTruthy();
      });
    });

    it('should close invite modal when Close button is pressed', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: 'ABC123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText, queryByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Members tab
      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      await waitFor(() => {
        const inviteButton = getByText('+ Invite Member');
        fireEvent.press(inviteButton);
      });

      await waitFor(() => {
        expect(getByText('Invite to Test Squad')).toBeTruthy();
      });

      // Close modal
      const closeButton = getByText('Close');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByText('Invite to Test Squad')).toBeNull();
      });
    });

    it('should call Share API when Share Invite button is pressed', async () => {
      const mockInviteCode = 'ABC123';
      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

      supabase.from.mockImplementation((table) => {
        if (table === 'squad_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'squads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { invite_code: mockInviteCode },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        };
      });

      const { getByText } = render(
        <SquadDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Switch to Members tab
      const membersTab = getByText('Members');
      fireEvent.press(membersTab);

      // Open invite modal
      await waitFor(() => {
        expect(getByText('+ Invite Member')).toBeTruthy();
      });

      const inviteButton = getByText('+ Invite Member');
      fireEvent.press(inviteButton);

      // Wait for modal to open and share button to appear
      await waitFor(() => {
        expect(getByText('Share Invite')).toBeTruthy();
      });

      const shareButton = getByText('Share Invite');
      fireEvent.press(shareButton);

      // Wait for Share to be called
      await waitFor(() => {
        expect(shareSpy).toHaveBeenCalledTimes(1);
      });

      expect(shareSpy).toHaveBeenCalledWith({
        message: expect.stringContaining(mockInviteCode),
        title: 'Join My Squad',
      });

      shareSpy.mockRestore();
    });
  });
});
