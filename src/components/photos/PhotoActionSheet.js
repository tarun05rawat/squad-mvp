import React, { useState } from 'react';
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
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  if (!photo) return null;

  const isOwner = photo.uploaded_by === user?.id;

  const handleOpen = () => {
    onClose();
    onOpenFullscreen(photo);
  };

  const handleDeleteConfirm = async () => {
    setDeleteSheetVisible(false);
    onClose();
    try {
      await deletePhotoComplete(photo.id, photo.photo_url, user?.id);
      onDelete(photo.id);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete photo');
    }
  };

  return (
    <>
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
            <TouchableOpacity
              style={[styles.action, styles.destructiveAction]}
              onPress={() => setDeleteSheetVisible(true)}
            >
              <Text style={styles.actionIcon}>🗑️</Text>
              <Text style={[styles.actionLabel, styles.destructiveLabel]}>Delete photo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.action, styles.cancelAction]} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Delete confirmation — no scary Alert, calm bottom sheet */}
      <Modal
        visible={deleteSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.deleteBackdrop}
          activeOpacity={1}
          onPress={() => setDeleteSheetVisible(false)}
        />
        <View style={styles.deleteSheet}>
          <View style={styles.handle} />
          <Text style={styles.deleteTitle}>Delete photo?</Text>
          <Text style={styles.deleteSubtitle}>This can't be undone.</Text>
          <TouchableOpacity style={styles.deleteConfirm} onPress={handleDeleteConfirm}>
            <Text style={styles.deleteConfirmText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteCancel} onPress={() => setDeleteSheetVisible(false)}>
            <Text style={styles.deleteCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
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
    borderBottomColor: '#F3F4F6',
  },
  destructiveLabel: {
    color: '#FF3B30',
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
  // Delete confirmation sheet
  deleteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  deleteSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
  },
  deleteTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  deleteSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  deleteConfirm: {
    width: '100%',
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteCancel: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteCancelText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
});
