import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { formatDistanceToNow } from "date-fns";

/**
 * Individual feed item component
 * Renders different UI based on feed item type
 */
export default function FeedItem({ item, onPhotoPress, onEventPress }) {
  const renderFeedContent = () => {
    switch (item.type) {
      case "event_created":
        return (
          <TouchableOpacity onPress={() => onEventPress?.(item.entity_id)}>
            <View style={styles.contentContainer}>
              <Text style={styles.actorName}>{item.actor_name}</Text>
              <Text style={styles.actionText}> created a new event </Text>
              <Text style={styles.entityName}>{item.entity_name}</Text>
            </View>
          </TouchableOpacity>
        );

      case "voting_decided":
        return (
          <TouchableOpacity onPress={() => onEventPress?.(item.entity_id)}>
            <View style={styles.contentContainer}>
              <Text style={styles.actionText}>Voting ended for </Text>
              <Text style={styles.entityName}>{item.entity_name}</Text>
              {item.winning_option && (
                <Text style={styles.winnerText}>
                  Winner: {item.winning_option}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );

      case "photo_uploaded":
        return (
          <TouchableOpacity onPress={() => onPhotoPress?.(item.photo)}>
            <View style={styles.contentContainer}>
              <Text style={styles.actorName}>{item.actor_name}</Text>
              <Text style={styles.actionText}> uploaded a photo</Text>
              {item.event_name && (
                <Text style={styles.eventContext}> to {item.event_name}</Text>
              )}
            </View>
            {item.photo?.photo_url && (
              <Image
                source={{ uri: item.photo.photo_url }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
            )}
            {item.photo?.caption && (
              <Text style={styles.caption}>{item.photo.caption}</Text>
            )}
          </TouchableOpacity>
        );

      case "comment_added":
        return (
          <TouchableOpacity onPress={() => onPhotoPress?.(item.photo)}>
            <View style={styles.contentContainer}>
              <Text style={styles.actorName}>{item.actor_name}</Text>
              <Text style={styles.actionText}> commented on a photo</Text>
              {item.event_name && (
                <Text style={styles.eventContext}> from {item.event_name}</Text>
              )}
            </View>
            {item.comment_text && (
              <View style={styles.commentBox}>
                <Text style={styles.commentText}>"{item.comment_text}"</Text>
              </View>
            )}
            {item.photo?.photo_url && (
              <Image
                source={{ uri: item.photo.photo_url }}
                style={styles.photoPreviewSmall}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.feedItem}>
      <View style={styles.header}>
        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>
      {renderFeedContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  feedItem: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  contentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 8,
  },
  actorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  actionText: {
    fontSize: 15,
    color: "#666",
  },
  entityName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  eventContext: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  winnerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 4,
    width: "100%",
  },
  photoPreview: {
    width: "100%",
    height: 240,
    borderRadius: 8,
    marginTop: 8,
  },
  photoPreviewSmall: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginTop: 8,
  },
  caption: {
    fontSize: 14,
    color: "#333",
    marginTop: 8,
    lineHeight: 20,
  },
  commentBox: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  commentText: {
    fontSize: 14,
    color: "#555",
    fontStyle: "italic",
  },
});
