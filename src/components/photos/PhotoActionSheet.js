import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { deletePhotoComplete } from '../../utils/photoUtils';

export default function PhotoActionSheet({ visible, photo, onClose, onOpenFullscreen, onDelete }) {
  const { user } = useAuth();

  if (!photo) return null;

  const isOwner = photo.uploaded_by === user?.id;

  const handleOpen = () => {
    onClose();
    onOpenFullscreen(photo);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              onClose(); // Close sheet after confirmation
              await deletePhotoComplete(photo.id, photo.photo_url, user.id);
              onDelete(photo.id);
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <TouchableOpacity style={styles.action} onPress={handleOpen}>
          <Text style={styles.actionIcon}>👁️</Text>
          <Text style={styles.actionLabel}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleOpen}>
          <Text style={styles.actionIcon}>😍</Text>
          <Text style={styles.actionLabel}>React</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleOpen}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>Comment</Text>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity style={[styles.action, styles.destructiveAction]} onPress={handleDelete}>
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={[styles.actionLabel, styles.destructiveLabel]}>Delete</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.action, styles.cancelAction]} onPress={onClose}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  actionIcon: {
    fontSize: 22,
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  destructiveAction: {
    borderBottomColor: '#FEE2E2',
  },
  destructiveLabel: {
    color: '#EF4444',
  },
  cancelAction: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
