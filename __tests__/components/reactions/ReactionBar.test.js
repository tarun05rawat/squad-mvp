import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReactionBar from '../../../src/components/reactions/ReactionBar';

describe('ReactionBar', () => {
  const mockGroupedReactions = [
    { emoji: '❤️', count: 3, userReacted: true },
    { emoji: '👍', count: 2, userReacted: false },
    { emoji: '😂', count: 1, userReacted: false },
  ];

  describe('rendering', () => {
    it('should render all grouped reactions with counts', () => {
      const { getByText, getByTestId } = render(
        <ReactionBar groupedReactions={mockGroupedReactions} />
      );

      // Check that all reactions are rendered
      expect(getByText('❤️')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
      expect(getByText('👍')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('😂')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();

      // Check test IDs
      expect(getByTestId('reaction-❤️')).toBeTruthy();
      expect(getByTestId('reaction-👍')).toBeTruthy();
      expect(getByTestId('reaction-😂')).toBeTruthy();
    });

    it('should highlight user reactions with purple border', () => {
      const { getByTestId } = render(
        <ReactionBar groupedReactions={mockGroupedReactions} />
      );

      const heartButton = getByTestId('reaction-❤️');
      const thumbsUpButton = getByTestId('reaction-👍');

      // Heart should have purple border (user reacted)
      expect(heartButton.props.style).toMatchObject({
        borderColor: '#8B5CF6',
        backgroundColor: '#F3E8FF',
      });

      // Thumbs up should have gray border (user didn't react)
      expect(thumbsUpButton.props.style).toMatchObject({
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
      });
    });

    it('should return null if groupedReactions is empty', () => {
      const { toJSON } = render(<ReactionBar groupedReactions={[]} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('interaction', () => {
    it('should call onReactionPress with emoji when tapped', () => {
      const mockOnReactionPress = jest.fn();
      const { getByTestId } = render(
        <ReactionBar
          groupedReactions={mockGroupedReactions}
          onReactionPress={mockOnReactionPress}
        />
      );

      // Press the heart reaction
      fireEvent.press(getByTestId('reaction-❤️'));
      expect(mockOnReactionPress).toHaveBeenCalledWith('❤️');

      // Press the thumbs up reaction
      fireEvent.press(getByTestId('reaction-👍'));
      expect(mockOnReactionPress).toHaveBeenCalledWith('👍');

      expect(mockOnReactionPress).toHaveBeenCalledTimes(2);
    });
  });
});
