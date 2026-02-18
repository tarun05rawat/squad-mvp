import React from 'react';
import { render } from '@testing-library/react-native';
import PhotoFullscreen from '../../../src/components/photos/PhotoFullscreen';

// Mock dependencies
jest.mock('../../../src/utils/photoUtils');
jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));
jest.mock('../../../src/hooks/usePhotoReactions', () => ({
  usePhotoReactions: () => ({
    groupedReactions: [
      { emoji: '❤️', count: 3, userReacted: true },
      { emoji: '👍', count: 1, userReacted: false },
    ],
    addReaction: jest.fn(),
  }),
}));
jest.mock('../../../src/components/photos/PhotoComments', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockPhotoComments() {
    return <View />;
  };
});

describe('PhotoFullscreen', () => {
  const mockPhoto = {
    id: 'photo-123',
    photo_url: 'https://example.com/photo.jpg',
    caption: 'Test caption',
    uploaded_by: 'user-123',
    created_at: new Date().toISOString(),
    uploader: { full_name: 'Test User' },
  };

  it('should render ReactionBar with grouped reactions', () => {
    const { getAllByText } = render(
      <PhotoFullscreen
        visible={true}
        photo={mockPhoto}
        onClose={jest.fn()}
      />
    );

    // Emojis appear in both ReactionBar and EmojiPicker
    expect(getAllByText('❤️').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('👍').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('should render EmojiPicker at bottom', () => {
    const { getByTestId } = render(
      <PhotoFullscreen
        visible={true}
        photo={mockPhoto}
        onClose={jest.fn()}
      />
    );

    expect(getByTestId('emoji-picker-container')).toBeTruthy();
  });
});
