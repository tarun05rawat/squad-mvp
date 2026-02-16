import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmojiPicker from '../../../src/components/reactions/EmojiPicker';

describe('EmojiPicker', () => {
  const mockOnEmojiPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all emoji options', () => {
    const { getByText } = render(<EmojiPicker onEmojiPress={mockOnEmojiPress} />);

    expect(getByText('❤️')).toBeTruthy();
    expect(getByText('👍')).toBeTruthy();
    expect(getByText('😂')).toBeTruthy();
    expect(getByText('🎉')).toBeTruthy();
    expect(getByText('😍')).toBeTruthy();
    expect(getByText('🔥')).toBeTruthy();
  });

  it('should call onEmojiPress when emoji is tapped', () => {
    const { getByText } = render(<EmojiPicker onEmojiPress={mockOnEmojiPress} />);

    fireEvent.press(getByText('❤️'));

    expect(mockOnEmojiPress).toHaveBeenCalledWith('❤️');
  });

  it('should render in compact mode', () => {
    const { getByTestId } = render(
      <EmojiPicker onEmojiPress={mockOnEmojiPress} compact={true} />
    );

    const container = getByTestId('emoji-picker-container');
    expect(container.props.style).toContainEqual(
      expect.objectContaining({ paddingVertical: 4 })
    );
  });
});
