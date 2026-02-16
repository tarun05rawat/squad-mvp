import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

// Common emoji reactions
const EMOJI_OPTIONS = ['❤️', '😂', '🔥', '👍', '🎉', '😮'];

/**
 * PhotoReactions - Displays and manages emoji reactions on a photo
 * Features:
 * - Shows emoji counts
 * - Highlights user's reactions
 * - Optimistic UI updates
 * - Real-time sync via Supabase subscriptions
 */
export default function PhotoReactions({ photoId }) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState([]); // Array of {emoji, count, users: []}
  const [userReactions, setUserReactions] = useState(new Set()); // Emojis user has selected
  const [loading, setLoading] = useState(true);

  // Fetch reactions on mount
  useEffect(() => {
    fetchReactions();
  }, [photoId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`photo-reactions:${photoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photo_reactions',
          filter: `photo_id=eq.${photoId}`,
        },
        (payload) => {
          handleReactionInsert(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'photo_reactions',
          filter: `photo_id=eq.${photoId}`,
        },
        (payload) => {
          handleReactionDelete(payload.old);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [photoId]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_reactions')
        .select('emoji, user_id')
        .eq('photo_id', photoId);

      if (error) throw error;

      // Group by emoji
      const grouped = {};
      const userSet = new Set();

      data?.forEach((reaction) => {
        if (!grouped[reaction.emoji]) {
          grouped[reaction.emoji] = { emoji: reaction.emoji, count: 0, users: [] };
        }
        grouped[reaction.emoji].count += 1;
        grouped[reaction.emoji].users.push(reaction.user_id);

        if (reaction.user_id === user?.id) {
          userSet.add(reaction.emoji);
        }
      });

      setReactions(Object.values(grouped));
      setUserReactions(userSet);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reactions:', error);
      setLoading(false);
    }
  };

  const handleReactionInsert = (newReaction) => {
    // Update reactions state
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === newReaction.emoji);
      if (existing) {
        return prev.map((r) =>
          r.emoji === newReaction.emoji
            ? { ...r, count: r.count + 1, users: [...r.users, newReaction.user_id] }
            : r
        );
      } else {
        return [
          ...prev,
          { emoji: newReaction.emoji, count: 1, users: [newReaction.user_id] },
        ];
      }
    });

    // Update user reactions if it's current user
    if (newReaction.user_id === user?.id) {
      setUserReactions((prev) => new Set([...prev, newReaction.emoji]));
    }
  };

  const handleReactionDelete = (oldReaction) => {
    // Update reactions state
    setReactions((prev) => {
      return prev
        .map((r) => {
          if (r.emoji === oldReaction.emoji) {
            return {
              ...r,
              count: r.count - 1,
              users: r.users.filter((id) => id !== oldReaction.user_id),
            };
          }
          return r;
        })
        .filter((r) => r.count > 0); // Remove if count reaches 0
    });

    // Update user reactions if it's current user
    if (oldReaction.user_id === user?.id) {
      setUserReactions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(oldReaction.emoji);
        return newSet;
      });
    }
  };

  const toggleReaction = async (emoji) => {
    const hasReacted = userReactions.has(emoji);

    // Optimistic update
    if (hasReacted) {
      // Remove reaction
      setUserReactions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(emoji);
        return newSet;
      });
      setReactions((prev) =>
        prev
          .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1 } : r))
          .filter((r) => r.count > 0)
      );
    } else {
      // Add reaction
      setUserReactions((prev) => new Set([...prev, emoji]));
      setReactions((prev) => {
        const existing = prev.find((r) => r.emoji === emoji);
        if (existing) {
          return prev.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1 } : r));
        } else {
          return [...prev, { emoji, count: 1, users: [user.id] }];
        }
      });
    }

    // Actual database operation
    try {
      if (hasReacted) {
        // Delete reaction
        const { error } = await supabase
          .from('photo_reactions')
          .delete()
          .eq('photo_id', photoId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) throw error;
      } else {
        // Insert reaction
        const { error } = await supabase
          .from('photo_reactions')
          .insert({
            photo_id: photoId,
            user_id: user.id,
            emoji,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      // Revert optimistic update on error
      fetchReactions();
    }
  };

  if (loading) {
    return null; // Or a loading skeleton
  }

  return (
    <View style={styles.container}>
      {/* Emoji picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.emojiPicker}
        contentContainerStyle={styles.emojiPickerContent}
      >
        {EMOJI_OPTIONS.map((emoji) => {
          const isSelected = userReactions.has(emoji);
          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.emojiButton, isSelected && styles.emojiButtonSelected]}
              onPress={() => toggleReaction(emoji)}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Reaction counts */}
      {reactions.length > 0 && (
        <View style={styles.reactionCounts}>
          {reactions.map((reaction) => {
            const isUserReaction = userReactions.has(reaction.emoji);
            return (
              <View
                key={reaction.emoji}
                style={[
                  styles.reactionBadge,
                  isUserReaction && styles.reactionBadgeHighlight,
                ]}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                <Text
                  style={[
                    styles.reactionCount,
                    isUserReaction && styles.reactionCountHighlight,
                  ]}
                >
                  {reaction.count}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  emojiPicker: {
    marginBottom: 12,
  },
  emojiPickerContent: {
    paddingRight: 8,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  emojiButtonSelected: {
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  emojiText: {
    fontSize: 24,
  },
  reactionCounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reactionBadgeHighlight: {
    backgroundColor: '#EDE9FE',
    borderColor: '#8B5CF6',
  },
  reactionEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  reactionCountHighlight: {
    color: '#8B5CF6',
  },
});
