import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const ReactionBar = ({ groupedReactions = [], onReactionPress, compact = false }) => {
  if (!groupedReactions || groupedReactions.length === 0) {
    return null;
  }

  const handlePress = (emoji) => {
    if (onReactionPress) {
      onReactionPress(emoji);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {groupedReactions.map((reaction) => (
        <TouchableOpacity
          key={reaction.emoji}
          testID={`reaction-${reaction.emoji}`}
          style={[
            styles.reactionButton,
            compact && styles.reactionButtonCompact,
            reaction.userReacted ? styles.userReactedButton : styles.defaultButton,
          ]}
          onPress={() => handlePress(reaction.emoji)}
        >
          <Text style={styles.emoji}>{reaction.emoji}</Text>
          <Text
            style={[
              styles.count,
              reaction.userReacted && styles.userReactedCount,
            ]}
          >
            {reaction.count}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  reactionButtonCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  defaultButton: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  userReactedButton: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  emoji: {
    fontSize: 16,
  },
  count: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  userReactedCount: {
    color: '#8B5CF6',
  },
});

export default ReactionBar;
