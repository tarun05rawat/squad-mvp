import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import FeedItem from './FeedItem';

/**
 * Feed tab component for displaying chronological squad activity
 * Shows events, voting results, photos, and comments in a unified feed
 */
export default function FeedTab({ squadId, onPhotoPress, onEventPress }) {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFeed();

    // Subscribe to real-time updates for feed items
    const subscription = supabase
      .channel(`feed:${squadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_items',
          filter: `squad_id=eq.${squadId}`,
        },
        (payload) => {
          console.log('New feed item:', payload);
          fetchFeed(); // Refresh feed when new item is added
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [squadId]);

  const fetchFeed = async () => {
    try {
      setLoading(true);

      // Fetch all feed items for this squad
      const { data: items, error: feedError } = await supabase
        .from('feed_items')
        .select('*')
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false });

      if (feedError) throw feedError;

      // Enrich feed items with additional data
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          // Get actor name
          const { data: actor } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', item.created_by)
            .single();

          const enrichedItem = {
            ...item,
            actor_name: actor?.full_name || 'Unknown User',
          };

          // Enrich based on type
          switch (item.type) {
            case 'event_created':
            case 'voting_decided':
              const { data: event, error: eventError } = await supabase
                .from('events')
                .select('title')
                .eq('id', item.entity_id)
                .single();

              if (eventError) {
                console.error('Error fetching event:', eventError);
              }

              enrichedItem.entity_name = event?.title || 'Unknown Event';

              // For voting_decided, calculate winner from vote counts
              if (item.type === 'voting_decided') {
                const { data: options } = await supabase
                  .from('event_options')
                  .select('option_name, vote_count')
                  .eq('event_id', item.entity_id)
                  .order('vote_count', { ascending: false })
                  .limit(1);

                enrichedItem.winning_option = options?.[0]?.option_name || null;
              }
              break;

            case 'photo_uploaded':
              const { data: photo } = await supabase
                .from('photos')
                .select('photo_url, caption, event_id')
                .eq('id', item.entity_id)
                .single();

              enrichedItem.photo = photo;

              // Get event name if photo is linked to event
              if (photo?.event_id) {
                const { data: photoEvent } = await supabase
                  .from('events')
                  .select('title')
                  .eq('id', photo.event_id)
                  .single();

                enrichedItem.event_name = photoEvent?.title;
              }
              break;

            case 'comment_added':
              const { data: comment } = await supabase
                .from('photo_comments')
                .select('comment_text, photo_id')
                .eq('id', item.entity_id)
                .single();

              enrichedItem.comment_text = comment?.comment_text;

              // Get photo data
              if (comment?.photo_id) {
                const { data: commentPhoto } = await supabase
                  .from('photos')
                  .select('photo_url, event_id')
                  .eq('id', comment.photo_id)
                  .single();

                enrichedItem.photo = commentPhoto;

                // Get event name
                if (commentPhoto?.event_id) {
                  const { data: commentEvent } = await supabase
                    .from('events')
                    .select('title')
                    .eq('id', commentPhoto.event_id)
                    .single();

                  enrichedItem.event_name = commentEvent?.title;
                }
              }
              break;
          }

          return enrichedItem;
        })
      );

      setFeedItems(enrichedItems);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No activity yet</Text>
      <Text style={styles.emptySubtext}>
        Create events, upload photos, or vote to see activity here!
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={feedItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedItem
            item={item}
            onPhotoPress={onPhotoPress}
            onEventPress={onEventPress}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
