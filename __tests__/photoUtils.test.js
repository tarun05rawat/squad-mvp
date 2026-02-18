import { uploadPhoto, deletePhoto, createPhotoRecord, uploadPhotoComplete, deletePhotoComplete } from '../src/utils/photoUtils';
import { supabase } from '../src/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

// Mock supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('photoUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadPhoto', () => {
    it('should upload photo to storage and return public URL', async () => {
      const mockFile = {
        uri: 'file:///path/to/photo.jpg',
        type: 'image/jpeg',
      };
      const userId = 'user-123';
      const mockPublicUrl = 'https://storage.supabase.co/squad-photos/user-123/photo.jpg';

      // Mock FileSystem.readAsStringAsync to return base64 for 'fake-image-data'
      FileSystem.readAsStringAsync.mockResolvedValueOnce('ZmFrZS1pbWFnZS1kYXRh');

      // Mock storage upload
      const uploadMock = jest.fn().mockResolvedValue({
        data: { path: 'user-123/photo.jpg' },
        error: null,
      });

      const getPublicUrlMock = jest.fn().mockReturnValue({
        data: { publicUrl: mockPublicUrl },
      });

      supabase.storage.from.mockReturnValue({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      });

      const result = await uploadPhoto(mockFile, userId);

      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(mockFile.uri, { encoding: 'base64' });
      expect(supabase.storage.from).toHaveBeenCalledWith('squad-photos');
      expect(uploadMock).toHaveBeenCalledWith(
        expect.stringContaining(`${userId}/`),
        expect.any(Uint8Array),
        expect.objectContaining({
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        })
      );
      expect(result).toBe(mockPublicUrl);
    });

    it('should throw error if upload fails', async () => {
      const mockFile = { uri: 'file:///photo.jpg', type: 'image/jpeg' };
      const userId = 'user-123';

      FileSystem.readAsStringAsync.mockResolvedValueOnce('ZmFrZS1pbWFnZS1kYXRh');

      const uploadError = new Error('Upload failed');
      const uploadMock = jest.fn().mockResolvedValue({
        data: null,
        error: uploadError,
      });

      supabase.storage.from.mockReturnValue({
        upload: uploadMock,
      });

      await expect(uploadPhoto(mockFile, userId)).rejects.toThrow('Upload failed');
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo from storage', async () => {
      const photoUrl = 'https://storage.supabase.co/squad-photos/user-123/photo.jpg';
      const userId = 'user-123';

      const removeMock = jest.fn().mockResolvedValue({
        error: null,
      });

      supabase.storage.from.mockReturnValue({
        remove: removeMock,
      });

      await deletePhoto(photoUrl, userId);

      expect(supabase.storage.from).toHaveBeenCalledWith('squad-photos');
      expect(removeMock).toHaveBeenCalledWith(['user-123/photo.jpg']);
    });

    it('should throw error if photo does not belong to user', async () => {
      const photoUrl = 'https://storage.supabase.co/squad-photos/other-user/photo.jpg';
      const userId = 'user-123';

      await expect(deletePhoto(photoUrl, userId)).rejects.toThrow('Unauthorized to delete this photo');
    });

    it('should throw error if URL is invalid', async () => {
      const photoUrl = 'https://invalid-url.com/photo.jpg';
      const userId = 'user-123';

      await expect(deletePhoto(photoUrl, userId)).rejects.toThrow('Invalid photo URL');
    });
  });

  describe('createPhotoRecord', () => {
    it('should create photo record in database', async () => {
      const photoUrl = 'https://storage.supabase.co/photo.jpg';
      const squadId = 'squad-123';
      const eventId = 'event-123';
      const caption = 'Test caption';
      const uploadedBy = 'user-123';

      const mockPhotoData = {
        id: 'photo-123',
        photo_url: photoUrl,
        squad_id: squadId,
        event_id: eventId,
        caption,
        uploaded_by: uploadedBy,
      };

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockPhotoData,
            error: null,
          }),
        }),
      });

      supabase.from.mockReturnValue({
        insert: insertMock,
      });

      const result = await createPhotoRecord(photoUrl, squadId, eventId, caption, uploadedBy);

      expect(supabase.from).toHaveBeenCalledWith('photos');
      expect(insertMock).toHaveBeenCalledWith({
        photo_url: photoUrl,
        squad_id: squadId,
        event_id: eventId,
        caption,
        uploaded_by: uploadedBy,
      });
      expect(result).toEqual(mockPhotoData);
    });

    it('should handle null eventId and caption', async () => {
      const photoUrl = 'https://storage.supabase.co/photo.jpg';
      const squadId = 'squad-123';
      const uploadedBy = 'user-123';

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      });

      supabase.from.mockReturnValue({
        insert: insertMock,
      });

      await createPhotoRecord(photoUrl, squadId, null, null, uploadedBy);

      expect(insertMock).toHaveBeenCalledWith({
        photo_url: photoUrl,
        squad_id: squadId,
        event_id: null,
        caption: null,
        uploaded_by: uploadedBy,
      });
    });
  });

  describe('uploadPhotoComplete', () => {
    it('should complete full photo upload flow', async () => {
      const mockFile = { uri: 'file:///photo.jpg', type: 'image/jpeg' };
      const squadId = 'squad-123';
      const userId = 'user-123';
      const mockPublicUrl = 'https://storage.supabase.co/photo.jpg';
      const mockPhotoData = { id: 'photo-123', photo_url: mockPublicUrl };

      // Mock FileSystem for uploadPhoto
      FileSystem.readAsStringAsync.mockResolvedValueOnce('ZmFrZS1pbWFnZS1kYXRh');

      const uploadMock = jest.fn().mockResolvedValue({
        data: { path: 'user-123/photo.jpg' },
        error: null,
      });

      const getPublicUrlMock = jest.fn().mockReturnValue({
        data: { publicUrl: mockPublicUrl },
      });

      supabase.storage.from.mockReturnValue({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      });

      // Mock createPhotoRecord
      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockPhotoData,
            error: null,
          }),
        }),
      });

      supabase.from.mockReturnValue({
        insert: insertMock,
      });

      const result = await uploadPhotoComplete(mockFile, squadId, userId);

      expect(result).toEqual(mockPhotoData);
    });
  });

  describe('deletePhotoComplete', () => {
    it('should delete photo from both database and storage', async () => {
      const photoId = 'photo-123';
      const photoUrl = 'https://storage.supabase.co/squad-photos/user-123/photo.jpg';
      const userId = 'user-123';

      // Mock database deletion
      const deleteMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      // Mock storage deletion
      const removeMock = jest.fn().mockResolvedValue({
        error: null,
      });

      supabase.from.mockReturnValue({
        delete: deleteMock,
      });

      supabase.storage.from.mockReturnValue({
        remove: removeMock,
      });

      await deletePhotoComplete(photoId, photoUrl, userId);

      expect(supabase.from).toHaveBeenCalledWith('photos');
      expect(deleteMock).toHaveBeenCalled();
      expect(supabase.storage.from).toHaveBeenCalledWith('squad-photos');
      expect(removeMock).toHaveBeenCalledWith(['user-123/photo.jpg']);
    });
  });
});
