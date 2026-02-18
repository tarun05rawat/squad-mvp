import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadPhotoComplete } from '../../utils/photoUtils';
import { useAuth } from '../../context/AuthContext';

/**
 * Modal for uploading photos with caption
 */
export default function PhotoUploadModal({ visible, onClose, squadId, eventId = null, onUploadSuccess }) {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to upload photos.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Compress to reduce file size
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Check file size (10MB limit)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a photo smaller than 10MB');
          return;
        }

        setSelectedImage({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('No Photo', 'Please select a photo to upload');
      return;
    }

    try {
      setUploading(true);

      const photo = await uploadPhotoComplete(
        selectedImage,
        squadId,
        user.id,
        eventId,
        caption.trim() || null
      );

      Alert.alert('Success', 'Photo uploaded successfully!');

      // Reset state
      setSelectedImage(null);
      setCaption('');

      // Notify parent
      onUploadSuccess?.(photo);

      // Close modal
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return; // Prevent closing while uploading

    setSelectedImage(null);
    setCaption('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Upload Photo</Text>

          {selectedImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage.uri }} style={styles.image} resizeMode="cover" />
              <TouchableOpacity style={styles.changeButton} onPress={pickImage} disabled={uploading}>
                <Text style={styles.changeButtonText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.selectButton} onPress={pickImage}>
              <Text style={styles.selectButtonIcon}>📷</Text>
              <Text style={styles.selectButtonText}>Select Photo</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption (optional)"
            value={caption}
            onChangeText={setCaption}
            multiline
            blurOnSubmit={true}
            returnKeyType="done"
            maxLength={200}
            editable={!uploading}
          />
          <Text style={styles.captionCount}>{caption.length}/200</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={uploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.uploadButton, (!selectedImage || uploading) && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={!selectedImage || uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  selectButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  selectButtonIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  imagePreview: {
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  changeButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  changeButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  captionCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#8B5CF6',
  },
  uploadButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
