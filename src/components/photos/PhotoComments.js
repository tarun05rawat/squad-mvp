import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

/**
 * PhotoComments - Thread-based comment system for photos
 * Features:
 * - Real-time comment sync
 * - Optimistic UI updates
 * - Author attribution
 * - Delete own comments
 */
export default function PhotoComments({ photoId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const flatListRef = useRef(null);

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [photoId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`photo-comments:${photoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'photo_comments',
          filter: `photo_id=eq.${photoId}`,
        },
        (payload) => {
          handleCommentInsert(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'photo_comments',
          filter: `photo_id=eq.${photoId}`,
        },
        (payload) => {
          handleCommentDelete(payload.old);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [photoId]);

  const fetchComments = async () => {
    try {
      // 1. Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('photo_comments')
        .select('*')
        .eq('photo_id', photoId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      // 2. Fetch commenters
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds);

      if (usersError) throw usersError;

      // 3. Enrich comments with user data
      const enriched = commentsData.map((comment) => ({
        ...comment,
        author: usersData?.find((u) => u.id === comment.user_id) || null,
      }));

      setComments(enriched);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setLoading(false);
    }
  };

  const handleCommentInsert = async (newComment) => {
    // Fetch author info for the new comment
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', newComment.user_id)
        .single();

      const enrichedComment = {
        ...newComment,
        author: userData || null,
      };

      setComments((prev) => {
        // Check if comment already exists (avoid duplicates from optimistic update)
        const exists = prev.some((c) => c.id === enrichedComment.id);
        if (exists) {
          return prev.map((c) => (c.id === enrichedComment.id ? enrichedComment : c));
        }
        return [...prev, enrichedComment];
      });

      // Scroll to bottom when new comment arrives
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error enriching new comment:', error);
    }
  };

  const handleCommentDelete = (deletedComment) => {
    setComments((prev) => prev.filter((c) => c.id !== deletedComment.id));
  };

  const postComment = async () => {
    if (!commentText.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const tempComment = {
      id: tempId,
      photo_id: photoId,
      user_id: user.id,
      comment_text: commentText.trim(),
      created_at: new Date().toISOString(),
      author: { id: user.id, full_name: user.user_metadata?.full_name || 'You' },
    };

    // Optimistic update
    setComments((prev) => [...prev, tempComment]);
    setCommentText('');
    setPosting(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const { data, error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photoId,
          user_id: user.id,
          comment_text: tempComment.comment_text,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp comment with real one
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? { ...data, author: tempComment.author } : c))
      );
      setPosting(false);
    } catch (error) {
      console.error('Error posting comment:', error);
      // Remove temp comment on error
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setCommentText(tempComment.comment_text); // Restore text
      setPosting(false);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('photo_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure user can only delete own comments

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const renderComment = ({ item }) => {
    const isOwner = item.user_id === user?.id;
    const isTemp = item.id.toString().startsWith('temp-');

    return (
      <View style={styles.commentItem}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>
            {item.author?.full_name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{item.author?.full_name || 'Unknown'}</Text>
            <Text style={styles.commentTimestamp}>
              {isTemp
                ? 'Posting...'
                : formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.comment_text}</Text>
          {isOwner && !isTemp && (
            <TouchableOpacity
              style={styles.deleteCommentButton}
              onPress={() => deleteComment(item.id)}
            >
              <Text style={styles.deleteCommentText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No comments yet</Text>
          <Text style={styles.emptySubtext}>Be the first to comment!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderComment}
          style={styles.commentsList}
          contentContainerStyle={styles.commentsContent}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            editable={!posting}
          />
          <TouchableOpacity
            style={[styles.postButton, (!commentText.trim() || posting) && styles.postButtonDisabled]}
            onPress={postComment}
            disabled={!commentText.trim() || posting}
          >
            <Text
              style={[
                styles.postButtonText,
                (!commentText.trim() || posting) && styles.postButtonTextDisabled,
              ]}
            >
              {posting ? '...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  deleteCommentButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  deleteCommentText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  postButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  postButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
