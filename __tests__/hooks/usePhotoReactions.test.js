import { renderHook, waitFor } from '@testing-library/react-native';
import { usePhotoReactions } from '../../src/hooks/usePhotoReactions';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';

// Mock dependencies
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
  },
}));

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('usePhotoReactions', () => {
  const mockPhotoId = 'photo-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: mockUserId } });

    // Default channel mock setup
    const mockUnsubscribe = jest.fn();
    const mockSubscribe = jest.fn().mockReturnValue({
      unsubscribe: mockUnsubscribe,
    });
    const mockOn = jest.fn().mockReturnThis();

    supabase.channel.mockReturnValue({
      on: mockOn,
      subscribe: mockSubscribe,
    });
  });

  describe('fetching reactions', () => {
    it('should fetch reactions on mount', async () => {
      const mockReactions = [
        { id: '1', photo_id: mockPhotoId, user_id: 'user-1', emoji: '👍' },
        { id: '2', photo_id: mockPhotoId, user_id: 'user-2', emoji: '❤️' },
      ];

      const mockEq = jest.fn().mockResolvedValue({
        data: mockReactions,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      supabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => usePhotoReactions(mockPhotoId));

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.reactions).toEqual([]);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reactions).toEqual(mockReactions);
      expect(supabase.from).toHaveBeenCalledWith('photo_reactions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('photo_id', mockPhotoId);
    });

    it('should handle fetch errors', async () => {
      const mockError = { message: 'Database error' };

      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      supabase.from.mockReturnValue({
        select: mockSelect,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => usePhotoReactions(mockPhotoId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reactions).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching reactions:', mockError);

      consoleSpy.mockRestore();
    });
  });

  describe('real-time subscription', () => {
    it('should subscribe to photo reactions channel on mount', async () => {
      const mockUnsubscribe = jest.fn();
      const mockSubscribe = jest.fn().mockReturnValue({
        unsubscribe: mockUnsubscribe,
      });
      const mockOn = jest.fn().mockReturnThis();

      supabase.channel.mockReturnValue({
        on: mockOn,
        subscribe: mockSubscribe,
      });

      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      supabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { unmount } = renderHook(() => usePhotoReactions(mockPhotoId));

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalledWith(`photo-reactions-${mockPhotoId}`);
      });

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'photo_reactions', filter: `photo_id=eq.${mockPhotoId}` },
        expect.any(Function)
      );
      expect(mockSubscribe).toHaveBeenCalled();

      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('adding reactions', () => {
    it('should add reaction with optimistic update', async () => {
      const mockReactions = [
        { id: '1', photo_id: mockPhotoId, user_id: 'user-1', emoji: '👍' },
      ];

      const newReaction = { id: 'new-reaction-id', photo_id: mockPhotoId, user_id: mockUserId, emoji: '❤️' };

      const mockInsert = jest.fn().mockResolvedValue({
        data: newReaction,
        error: null,
      });

      const mockEq = jest.fn().mockResolvedValue({
        data: mockReactions,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      // Capture the subscription callback
      let subscriptionCallback;
      const mockUnsubscribe = jest.fn();
      const mockSubscribe = jest.fn().mockReturnValue({
        unsubscribe: mockUnsubscribe,
      });
      const mockOn = jest.fn().mockImplementation((eventType, config, callback) => {
        subscriptionCallback = callback;
        return { on: mockOn, subscribe: mockSubscribe };
      });

      supabase.channel.mockReturnValue({
        on: mockOn,
        subscribe: mockSubscribe,
      });

      // First call is for select (fetch), second is for insert (add)
      supabase.from
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValueOnce({
          insert: mockInsert,
        });

      const { result } = renderHook(() => usePhotoReactions(mockPhotoId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Add reaction
      await result.current.addReaction('❤️');

      // Check database call
      expect(mockInsert).toHaveBeenCalledWith({
        photo_id: mockPhotoId,
        user_id: mockUserId,
        emoji: '❤️',
      });

      // Simulate real-time subscription INSERT event
      subscriptionCallback({
        eventType: 'INSERT',
        new: newReaction,
      });

      // Check that reaction was added via subscription
      await waitFor(() => {
        expect(result.current.reactions).toHaveLength(2);
      });

      expect(result.current.reactions[1].emoji).toBe('❤️');
      expect(result.current.reactions[1].user_id).toBe(mockUserId);
      expect(result.current.reactions[1].id).toBe('new-reaction-id');
    });

    it('should rollback on error', async () => {
      const mockReactions = [
        { id: '1', photo_id: mockPhotoId, user_id: 'user-1', emoji: '👍' },
      ];

      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const mockEq = jest.fn().mockResolvedValue({
        data: mockReactions,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      // First call is for select (fetch), second is for insert (add)
      supabase.from
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValueOnce({
          insert: mockInsert,
        });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => usePhotoReactions(mockPhotoId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialReactions = result.current.reactions;

      // Add reaction
      await result.current.addReaction('❤️');

      // Should rollback to original state
      expect(result.current.reactions).toEqual(initialReactions);

      consoleSpy.mockRestore();
    });
  });

  describe('removing reactions', () => {
    it('should remove reaction with optimistic update', async () => {
      const mockReactions = [
        { id: '1', photo_id: mockPhotoId, user_id: 'user-1', emoji: '👍' },
        { id: '2', photo_id: mockPhotoId, user_id: mockUserId, emoji: '❤️' },
      ];

      const mockDelete = jest.fn().mockResolvedValue({
        error: null,
      });

      const mockEq = jest.fn().mockResolvedValue({
        data: mockReactions,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      // First call is for select (fetch), second is for delete (remove)
      supabase.from
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: mockDelete,
          }),
        });

      const { result } = renderHook(() => usePhotoReactions(mockPhotoId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.reactions).toHaveLength(2);

      // Remove reaction
      await result.current.removeReaction('2');

      // Check optimistic update
      await waitFor(() => {
        expect(result.current.reactions).toHaveLength(1);
      });

      expect(result.current.reactions[0].id).toBe('1');

      // Check database call
      expect(mockDelete).toHaveBeenCalledWith('id', '2');
    });

    it('should rollback on delete error', async () => {
      const mockReactions = [
        { id: '1', photo_id: mockPhotoId, user_id: 'user-1', emoji: '👍' },
        { id: '2', photo_id: mockPhotoId, user_id: mockUserId, emoji: '❤️' },
      ];

      const mockDelete = jest.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      const mockEq = jest.fn().mockResolvedValue({
        data: mockReactions,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      // First call is for select (fetch), second is for delete (remove)
      supabase.from
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue({
            eq: mockDelete,
          }),
        });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => usePhotoReactions(mockPhotoId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialReactions = result.current.reactions;

      // Remove reaction
      await result.current.removeReaction('2');

      // Should rollback to original state
      expect(result.current.reactions).toEqual(initialReactions);

      consoleSpy.mockRestore();
    });
  });

  describe('grouped reactions', () => {
    it('should group reactions by emoji with counts and userReacted flag', async () => {
      const mockReactions = [
        { id: '1', photo_id: mockPhotoId, user_id: 'user-1', emoji: '👍' },
        { id: '2', photo_id: mockPhotoId, user_id: mockUserId, emoji: '❤️' },
        { id: '3', photo_id: mockPhotoId, user_id: 'user-2', emoji: '👍' },
        { id: '4', photo_id: mockPhotoId, user_id: 'user-3', emoji: '❤️' },
      ];

      const mockEq = jest.fn().mockResolvedValue({
        data: mockReactions,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      });

      supabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => usePhotoReactions(mockPhotoId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.groupedReactions).toEqual([
        {
          emoji: '👍',
          count: 2,
          userReacted: false,
        },
        {
          emoji: '❤️',
          count: 2,
          userReacted: true,
        },
      ]);
    });
  });
});
