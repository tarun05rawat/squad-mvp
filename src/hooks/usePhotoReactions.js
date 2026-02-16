import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function usePhotoReactions(photoId) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReactions();

    // Set up real-time subscription
    const channel = supabase
      .channel(`photo-reactions-${photoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_reactions',
          filter: `photo_id=eq.${photoId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReactions((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'DELETE') {
            setReactions((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [photoId]);

  async function fetchReactions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photo_reactions')
        .select('*')
        .eq('photo_id', photoId);

      if (error) {
        console.error('Error fetching reactions:', error);
        return;
      }

      setReactions(data || []);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addReaction(emoji) {
    if (!user) return;

    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(
      (r) => r.user_id === user.id && r.emoji === emoji
    );

    if (existingReaction) {
      // Toggle behavior: remove if already exists
      await removeReaction(existingReaction.id);
      return;
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticReaction = {
      id: tempId,
      photo_id: photoId,
      user_id: user.id,
      emoji,
    };

    setReactions((prev) => [...prev, optimisticReaction]);

    // Save to database
    const { data, error } = await supabase
      .from('photo_reactions')
      .insert({
        photo_id: photoId,
        user_id: user.id,
        emoji,
      });

    if (error) {
      console.error('Error adding reaction:', error);
      // Rollback optimistic update
      setReactions((prev) => prev.filter((r) => r.id !== tempId));
      return;
    }

    // Note: Real-time subscription will handle adding the actual reaction
    // Remove the temporary one since the subscription will add the real one
    if (data) {
      setReactions((prev) =>
        prev.map((r) => (r.id === tempId ? data : r))
      );
    }
  }

  async function removeReaction(reactionId) {
    // Optimistic update
    const previousReactions = reactions;
    setReactions((prev) => prev.filter((r) => r.id !== reactionId));

    // Delete from database
    const { error } = await supabase
      .from('photo_reactions')
      .delete()
      .eq('id', reactionId);

    if (error) {
      console.error('Error removing reaction:', error);
      // Rollback optimistic update
      setReactions(previousReactions);
      return;
    }
  }

  const groupedReactions = useMemo(() => {
    const grouped = {};

    reactions.forEach((reaction) => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          userReacted: false,
        };
      }

      grouped[reaction.emoji].count += 1;

      if (user && reaction.user_id === user.id) {
        grouped[reaction.emoji].userReacted = true;
      }
    });

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }, [reactions, user]);

  return {
    reactions,
    loading,
    addReaction,
    removeReaction,
    groupedReactions,
  };
}
