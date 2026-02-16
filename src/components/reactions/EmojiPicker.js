import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const EMOJI_OPTIONS = ['❤️', '👍', '😂', '🎉', '😍', '🔥'];

export default function EmojiPicker({ onEmojiPress, compact = false }) {
  return (
    <View
      testID="emoji-picker-container"
      style={[styles.container, compact && styles.containerCompact]}
    >
      {EMOJI_OPTIONS.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          style={[styles.emojiButton, compact && styles.emojiButtonCompact]}
          onPress={() => onEmojiPress?.(emoji)}
        >
          <Text style={[styles.emoji, compact && styles.emojiCompact]}>
            {emoji}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  containerCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emojiButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  emoji: {
    fontSize: 24,
  },
  emojiCompact: {
    fontSize: 18,
  },
});
