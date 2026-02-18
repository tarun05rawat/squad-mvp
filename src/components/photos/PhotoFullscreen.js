import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { deletePhotoComplete } from '../../utils/photoUtils';
import { useAuth } from '../../context/AuthContext';
import ReactionBar from '../reactions/ReactionBar';
import EmojiPicker from '../reactions/EmojiPicker';
import { usePhotoReactions } from '../../hooks/usePhotoReactions';
import PhotoComments from './PhotoComments';
import ReactorsList from './ReactorsList';

const { width, height } = Dimensions.get('window');

export default function PhotoFullscreen({ visible, photo, onClose, onDelete }) {
  const { user } = useAuth();
  const { groupedReactions, addReaction } = usePhotoReactions(photo?.id);
  const [activeTab, setActiveTab] = useState('reactions');
  const [selectedReactionEmoji, setSelectedReactionEmoji] = useState(null);
  const [reactorsListVisible, setReactorsListVisible] = useState(false);

  if (!photo) return null;

  const isOwner = photo.uploaded_by === user?.id;

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhotoComplete(photo.id, photo.photo_url, user.id);
              Alert.alert('Success', 'Photo deleted');
              onDelete?.(photo.id);
              onClose();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', error.message || 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Photo */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photo.photo_url }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Info panel */}
        <View style={styles.infoPanel}>
          {/* Uploader row */}
          <View style={styles.uploaderRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {photo.uploader?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.uploaderInfo}>
              <Text style={styles.uploaderName}>
                {photo.uploader?.full_name || 'Unknown User'}
              </Text>
              <Text style={styles.timestamp}>
                {photo.created_at
                  ? formatDistanceToNow(new Date(photo.created_at), { addSuffix: true })
                  : 'Just now'}
              </Text>
            </View>
            {isOwner && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Event tag */}
          {photo.event && (
            <View style={styles.eventTag}>
              <Text style={styles.eventTagText}>📅 {photo.event.title}</Text>
            </View>
          )}

          {/* Caption */}
          {photo.caption && (
            <View style={styles.captionSection}>
              <Text style={styles.caption}>{photo.caption}</Text>
            </View>
          )}

          {/* Tab switcher */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'reactions' && styles.activeTab]}
              onPress={() => setActiveTab('reactions')}
            >
              <Text style={[styles.tabText, activeTab === 'reactions' && styles.activeTabText]}>
                😍 Reactions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
              onPress={() => setActiveTab('comments')}
            >
              <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
                💬 Comments
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab content */}
          {activeTab === 'reactions' ? (
            <View style={styles.reactionsContent}>
              <ReactionBar
                groupedReactions={groupedReactions}
                onReactionPress={(emoji) => {
                  setSelectedReactionEmoji(emoji);
                  setReactorsListVisible(true);
                }}
              />
              {groupedReactions.length === 0 && (
                <Text style={styles.emptyTabText}>No reactions yet. Be the first!</Text>
              )}
              <EmojiPicker onEmojiPress={addReaction} />
            </View>
          ) : (
            <View style={styles.commentsContent}>
              <PhotoComments photoId={photo.id} />
            </View>
          )}
        </View>
      </View>
      <ReactorsList
        visible={reactorsListVisible}
        photoId={photo.id}
        emoji={selectedReactionEmoji}
        onClose={() => setReactorsListVisible(false)}
        onToggleReaction={addReaction}
        userReacted={groupedReactions.find(r => r.emoji === selectedReactionEmoji)?.userReacted ?? false}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height * 0.5,
  },
  infoPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.5,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploaderInfo: {
    flex: 1,
  },
  uploaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 24,
  },
  eventTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  eventTagText: {
    fontSize: 14,
    color: '#6B7280',
  },
  captionSection: {
    marginBottom: 12,
  },
  caption: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  reactionsContent: {
    paddingBottom: 8,
  },
  commentsContent: {
    flex: 1,
    minHeight: 200,
  },
  emptyTabText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
