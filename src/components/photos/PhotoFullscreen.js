import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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
  const [activeTab, setActiveTab] = useState('reactions'); // 'reactions' | 'comments'
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
          {/* Header row: uploader info + delete */}
          <View style={styles.header}>
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
          </View>

          {/* Tab switcher */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'reactions' && styles.tabActive]}
              onPress={() => setActiveTab('reactions')}
            >
              <Text style={[styles.tabText, activeTab === 'reactions' && styles.tabTextActive]}>
                😍 Reactions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'comments' && styles.tabActive]}
              onPress={() => setActiveTab('comments')}
            >
              <Text style={[styles.tabText, activeTab === 'comments' && styles.tabTextActive]}>
                💬 Comments
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab content — flex:1 so it fills remaining panel height */}
          <View style={styles.tabContent}>
            {activeTab === 'reactions' ? (
              <View style={styles.reactionsTab}>
                {/* Reaction pills — natural height, no scroll */}
                <View style={styles.reactionsContent}>
                  {groupedReactions.length > 0 ? (
                    <ReactionBar
                      groupedReactions={groupedReactions}
                      onReactionPress={(emoji) => {
                        setSelectedReactionEmoji(emoji);
                        setReactorsListVisible(true);
                      }}
                      onAddReaction={addReaction}
                    />
                  ) : (
                    <View style={styles.noReactionsContainer}>
                      <Text style={styles.noReactionsText}>No reactions yet</Text>
                      <Text style={styles.noReactionsSubtext}>
                        Tap an emoji below to react 👇
                      </Text>
                    </View>
                  )}
                </View>

                {/* Emoji picker — sits directly below pills */}
                <EmojiPicker compact onEmojiPress={addReaction} />
              </View>
            ) : (
              /* Comments tab — fixed height so it fills the panel properly */
              <View style={styles.commentsTab}>
                <PhotoComments photoId={photo.id} />
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

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
    height: height * 0.45,
  },
  infoPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.62,
    paddingTop: 8,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  // Header area (uploader, event, caption) — compact, no extra space
  header: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  uploaderInfo: {
    flex: 1,
  },
  uploaderName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 22,
  },
  eventTag: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  eventTagText: {
    fontSize: 13,
    color: '#6B7280',
  },
  captionSection: {
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginHorizontal: 20,
    marginTop: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  // Tab content area — shrinks to content (reactions) or fills (comments)
  tabContent: {},
  // Comments tab — fixed height so list + input have room
  commentsTab: {
    height: height * 0.38,
  },
  // Reactions tab — natural height, no flex expansion
  reactionsTab: {
    // intentionally no flex — shrinks to content
  },
  reactionsContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  noReactionsContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  noReactionsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  noReactionsSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
