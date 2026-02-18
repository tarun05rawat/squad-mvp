import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';

const ReactionBar = ({ groupedReactions = [], onReactionPress, onAddReaction, compact = false }) => {
  // Top 3 most-used reactions only
  const topReactions = [...groupedReactions]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // One Animated.Value per emoji for scale spring
  const scaleAnims = useRef({});
  topReactions.forEach(({ emoji }) => {
    if (!scaleAnims.current[emoji]) {
      scaleAnims.current[emoji] = new Animated.Value(1);
    }
  });

  const handlePress = (emoji) => {
    const anim = scaleAnims.current[emoji];
    if (anim) {
      Animated.sequence([
        Animated.spring(anim, { toValue: 0.85, useNativeDriver: true, speed: 50 }),
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    }
    if (onReactionPress) onReactionPress(emoji);
  };

  if (!groupedReactions || groupedReactions.length === 0) {
    return (
      <View style={styles.container}>
        {onAddReaction && (
          <TouchableOpacity
            style={[styles.reactionButton, compact && styles.reactionButtonCompact, styles.defaultButton]}
            onPress={onAddReaction}
          >
            <Text style={styles.plusText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {topReactions.map((reaction) => (
        <Animated.View
          key={reaction.emoji}
          style={{ transform: [{ scale: scaleAnims.current[reaction.emoji] || new Animated.Value(1) }] }}
        >
          <TouchableOpacity
            testID={`reaction-${reaction.emoji}`}
            style={[
              styles.reactionButton,
              compact && styles.reactionButtonCompact,
              reaction.userReacted ? styles.userReactedButton : styles.defaultButton,
            ]}
            onPress={() => handlePress(reaction.emoji)}
            activeOpacity={0.8}
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
        </Animated.View>
      ))}

      {/* "+" pill to open emoji picker */}
      {onAddReaction && (
        <TouchableOpacity
          style={[
            styles.reactionButton,
            compact && styles.reactionButtonCompact,
            styles.defaultButton,
          ]}
          onPress={onAddReaction}
          activeOpacity={0.8}
        >
          <Text style={styles.plusText}>+</Text>
        </TouchableOpacity>
      )}
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
  plusText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 22,
  },
});

export default ReactionBar;
