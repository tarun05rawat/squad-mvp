import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Upload photo to Supabase Storage
 * @param {Object} file - Photo file from image picker
 * @param {string} userId - Current user ID
 * @returns {Promise<string>} - Public URL of uploaded photo
 */
export async function uploadPhoto(file, userId) {
  try {
    const fileExt = file.uri.split('.').pop().toLowerCase().split('?')[0];
    const photoId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const fileName = `${photoId}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Derive a valid MIME type from the file extension
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };
    const contentType = mimeMap[fileExt] || 'image/jpeg';

    // Read file as base64 and decode to ArrayBuffer for upload
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: 'base64',
    });
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { data, error } = await supabase.storage
      .from('squad-photos')
      .upload(filePath, bytes, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('squad-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
}

/**
 * Delete photo from Supabase Storage
 * @param {string} photoUrl - Public URL of the photo
 * @param {string} userId - Current user ID
 */
export async function deletePhoto(photoUrl, userId) {
  try {
    // Extract file path from public URL
    const urlParts = photoUrl.split('/squad-photos/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid photo URL');
    }

    const filePath = urlParts[1];

    // Verify the file belongs to this user
    if (!filePath.startsWith(userId)) {
      throw new Error('Unauthorized to delete this photo');
    }

    const { error } = await supabase.storage
      .from('squad-photos')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
}

/**
 * Create a photo record in database
 * @param {string} photoUrl - Public URL from storage
 * @param {string} squadId - Squad ID
 * @param {string} eventId - Event ID (optional)
 * @param {string} caption - Photo caption (optional)
 * @param {string} uploadedBy - User ID of uploader
 * @returns {Promise<Object>} - Created photo record
 */
export async function createPhotoRecord(photoUrl, squadId, eventId, caption, uploadedBy) {
  const { data, error } = await supabase
    .from('photos')
    .insert({
      photo_url: photoUrl,
      squad_id: squadId,
      event_id: eventId || null,
      caption: caption || null,
      uploaded_by: uploadedBy
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Complete photo upload flow (upload to storage + create DB record)
 * @param {Object} file - Photo file from image picker
 * @param {string} squadId - Squad ID
 * @param {string} userId - Current user ID
 * @param {string} eventId - Event ID (optional)
 * @param {string} caption - Photo caption (optional)
 * @returns {Promise<Object>} - Created photo record
 */
export async function uploadPhotoComplete(file, squadId, userId, eventId = null, caption = null) {
  try {
    // Step 1: Upload to storage
    const photoUrl = await uploadPhoto(file, userId);

    // Step 2: Create DB record (this will trigger feed item creation)
    const photo = await createPhotoRecord(photoUrl, squadId, eventId, caption, userId);

    return photo;
  } catch (error) {
    console.error('Error in complete photo upload:', error);
    throw error;
  }
}

/**
 * Delete photo completely (storage + DB record)
 * @param {string} photoId - Photo ID
 * @param {string} photoUrl - Photo URL
 * @param {string} userId - Current user ID
 */
export async function deletePhotoComplete(photoId, photoUrl, userId) {
  try {
    // Delete from database first (cascades to reactions/comments)
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)
      .eq('uploaded_by', userId); // RLS will also check this

    if (dbError) throw dbError;

    // Delete from storage
    await deletePhoto(photoUrl, userId);
  } catch (error) {
    console.error('Error in complete photo deletion:', error);
    throw error;
  }
}
