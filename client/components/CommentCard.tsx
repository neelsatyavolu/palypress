import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Comment } from "@/types/article";
import { stripHtmlTags, formatDate } from "@/lib/htmlUtils";

interface CommentCardProps {
  comment: Comment;
  replies?: Comment[];
  isReply?: boolean;
  onReplyPress?: (comment: Comment) => void;
  onEditPress?: (comment: Comment) => void;
  onDeletePress?: (comment: Comment) => void;
  onReportPress?: (comment: Comment) => void;
  onBlockPress?: (comment: Comment) => void;
  isOwner?: boolean;
  checkOwnership?: (commentId: number) => boolean;
}

export function CommentCard({
  comment,
  replies = [],
  isReply = false,
  onReplyPress,
  onEditPress,
  onDeletePress,
  onReportPress,
  onBlockPress,
  isOwner = false,
  checkOwnership,
}: CommentCardProps) {
  const { theme, isDark } = useTheme();

  const avatarUrl =
    comment.author_avatar_urls?.["96"] || comment.author_avatar_urls?.["48"];
  const content = stripHtmlTags(comment.content.rendered);
  const date = formatDate(comment.date);
  const subtleColor = isDark ? "rgba(255,255,255,0.5)" : "#888";

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <View style={styles.header}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: isDark ? "#444" : "#ddd" },
            ]}
          >
            <Feather name="user" size={16} color={subtleColor} />
          </View>
        )}
        <View style={styles.headerText}>
          <ThemedText style={styles.authorName} numberOfLines={1}>
            {comment.author_name || "Anonymous"}
          </ThemedText>
          <ThemedText style={[styles.date, { color: subtleColor }]}>
            {date}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.content}>{content}</ThemedText>

      <View style={styles.actionsRow}>
        {onReplyPress ? (
          <Pressable
            style={styles.actionButton}
            onPress={() => onReplyPress(comment)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="corner-down-right" size={14} color={theme.link} />
            <ThemedText
              style={[styles.actionButtonText, { color: theme.link }]}
            >
              Reply
            </ThemedText>
          </Pressable>
        ) : null}

        {isOwner && onEditPress ? (
          <Pressable
            style={styles.actionButton}
            onPress={() => onEditPress(comment)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="edit-2" size={14} color={theme.link} />
            <ThemedText
              style={[styles.actionButtonText, { color: theme.link }]}
            >
              Edit
            </ThemedText>
          </Pressable>
        ) : null}

        {isOwner && onDeletePress ? (
          <Pressable
            style={styles.actionButton}
            onPress={() => onDeletePress(comment)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={14} color="#dc3545" />
            <ThemedText style={[styles.actionButtonText, { color: "#dc3545" }]}>
              Delete
            </ThemedText>
          </Pressable>
        ) : null}

        {!isOwner && onReportPress ? (
          <Pressable
            style={styles.actionButton}
            onPress={() => onReportPress(comment)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Report comment"
          >
            <Feather name="flag" size={14} color={subtleColor} />
            <ThemedText
              style={[styles.actionButtonText, { color: subtleColor }]}
            >
              Report
            </ThemedText>
          </Pressable>
        ) : null}

        {!isOwner && onBlockPress ? (
          <Pressable
            style={styles.actionButton}
            onPress={() => onBlockPress(comment)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Block user"
          >
            <Feather name="slash" size={14} color={subtleColor} />
            <ThemedText
              style={[styles.actionButtonText, { color: subtleColor }]}
            >
              Block
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {replies.length > 0 ? (
        <View style={styles.repliesContainer}>
          {replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              isReply
              onEditPress={onEditPress}
              onDeletePress={onDeletePress}
              onReportPress={onReportPress}
              onBlockPress={onBlockPress}
              isOwner={checkOwnership ? checkOwnership(reply.id) : false}
              checkOwnership={checkOwnership}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  replyContainer: {
    marginLeft: Spacing.lg,
    paddingLeft: Spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(128,128,128,0.2)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 4,
  },
  repliesContainer: {
    marginTop: Spacing.sm,
  },
});
