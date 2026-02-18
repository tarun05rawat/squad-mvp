import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PhotoActionSheet from '../src/components/photos/PhotoActionSheet';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../src/utils/photoUtils', () => ({
  deletePhotoComplete: jest.fn(),
}));

const mockPhoto = {
  id: 'photo-1',
  photo_url: 'https://example.com/photo.jpg',
  uploaded_by: 'user-123',
  caption: 'Test',
};

describe('PhotoActionSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'user-123' } });
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <PhotoActionSheet visible={false} photo={mockPhoto} onClose={jest.fn()} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    expect(queryByText('View')).toBeNull();
  });

  it('renders actions when visible', () => {
    const { getByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={jest.fn()} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    expect(getByText('View')).toBeTruthy();
    expect(getByText('React')).toBeTruthy();
    expect(getByText('Comment')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('shows Delete only for photo owner', () => {
    const { getByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={jest.fn()} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    expect(getByText('Delete')).toBeTruthy();
  });

  it('hides Delete for non-owner', () => {
    useAuth.mockReturnValue({ user: { id: 'other-user' } });
    const { queryByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={jest.fn()} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    expect(queryByText('Delete')).toBeNull();
  });

  it('calls onOpenFullscreen and onClose when View is pressed', () => {
    const onOpenFullscreen = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={onClose} onOpenFullscreen={onOpenFullscreen} onDelete={jest.fn()} />
    );
    fireEvent.press(getByText('View'));
    expect(onClose).toHaveBeenCalled();
    expect(onOpenFullscreen).toHaveBeenCalledWith(mockPhoto);
  });

  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <PhotoActionSheet visible={true} photo={mockPhoto} onClose={onClose} onOpenFullscreen={jest.fn()} onDelete={jest.fn()} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
