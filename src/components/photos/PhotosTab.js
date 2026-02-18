import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import PhotoActionSheet from './PhotoActionSheet';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const PHOTO_SIZE = (width - 48) / COLUMN_COUNT;

export default function PhotosTab({ squadId, onPhotoPress }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  useEffect(() => {
    fetchPhotos();

    const subscription = supabase
      .channel(`photos:${squadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'photos', filter: `squad_id=eq.${squadId}` }, () => { fetchPhotos(); })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'photos', filter: `squad_id=eq.${squadId}` }, () => { fetchPhotos(); })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [squadId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      if (!photosData || photosData.length === 0) {
        setPhotos([]);
        return;
      }

      const uploaderIds = [...new Set(photosData.map(p => p.uploaded_by))];
      const { data: uploaders } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', uploaderIds);

      const eventIds = [...new Set(photosData.filter(p => p.event_id).map(p => p.event_id))];
      let events = [];
      if (eventIds.length > 0) {
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);
        events = eventsData || [];
      }

      const enrichedPhotos = photosData.map(photo => ({
        ...photo,
        uploader: uploaders?.find(u => u.id === photo.uploaded_by) || null,
        event: photo.event_id ? events.find(e => e.id === photo.event_id) || null : null,
      }));

      setPhotos(enrichedPhotos);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPhotos();
  };

  const handleLongPress = (photo) => {
    setSelectedPhoto(photo);
    setActionSheetVisible(true);
  };

  const handleDelete = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const renderPhoto = ({ item }) => (
    <TouchableOpacity
      testID={`photo-item-${item.id}`}
      style={styles.photoContainer}
      onPress={() => onPhotoPress?.(item)}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={300}
    >
      <Image
        source={{ uri: item.photo_url }}
        style={styles.photo}
        resizeMode="cover"
      />
      {item.caption && (
        <View style={styles.captionOverlay}>
          <Text style={styles.captionText} numberOfLines={2}>
            {item.caption}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📸</Text>
      <Text style={styles.emptyText}>No photos yet</Text>
      <Text style={styles.emptySubtext}>
        Tap + Upload Photo to add your first photo!
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
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={renderPhoto}
        numColumns={COLUMN_COUNT}
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
      <PhotoActionSheet
        visible={actionSheetVisible}
        photo={selectedPhoto}
        onClose={() => setActionSheetVisible(false)}
        onOpenFullscreen={(photo) => onPhotoPress?.(photo)}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  listContent: { padding: 16 },
  photoContainer: { width: PHOTO_SIZE, height: PHOTO_SIZE, margin: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  photo: { width: '100%', height: '100%' },
  captionOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: 6 },
  captionText: { color: '#fff', fontSize: 11, lineHeight: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#BBB', textAlign: 'center', paddingHorizontal: 40 },
});
