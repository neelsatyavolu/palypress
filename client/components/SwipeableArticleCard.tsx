import React, { useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatDate } from "@/lib/htmlUtils";
import {
  SAVED_ARTICLE_BOOKMARK_CIRCLE_SIZE,
  SAVED_ARTICLE_BOOKMARK_TEXT_INSET,
} from "@/lib/articleCardLayout";
import * as Haptics from "expo-haptics";

const SWIPE_THRESHOLD = -100; // Swipe left 100px to trigger delete
const DELETE_BUTTON_WIDTH = 80;

interface SwipeableArticleCardProps {
  articleId: number;
  articleTitle: string;
  articleAuthor?: string | null;
  articleDate?: string | null;
  articleImageUrl?: string | null;
  onPress: () => void;
  onDelete: () => void;
}

export function SwipeableArticleCard({
  articleId,
  articleTitle,
  articleAuthor,
  articleDate,
  articleImageUrl,
  onPress,
  onDelete,
}: SwipeableArticleCardProps) {
  const { theme, isDark } = useTheme();
  const pan = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return (
          Math.abs(gestureState.dx) > 5 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative values)
        if (gestureState.dx < 0) {
          pan.setValue(gestureState.dx);
          // Fade in delete button as user swipes
          const opacity = Math.min(
            Math.abs(gestureState.dx) / DELETE_BUTTON_WIDTH,
            1,
          );
          deleteOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Swiped far enough - trigger delete
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Animated.timing(pan, {
            toValue: -300,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onDelete();
          });
        } else {
          // Not far enough - snap back
          Animated.parallel([
            Animated.spring(pan, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  const cardBackgroundColor = isDark ? "#1e1e1e" : "#fff";
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const secondaryTextColor = isDark
    ? "rgba(255,255,255,0.6)"
    : "rgba(0,0,0,0.6)";

  return (
    <View style={styles.container}>
      {/* Delete button background */}
      <Animated.View
        style={[
          styles.deleteContainer,
          {
            opacity: deleteOpacity,
          },
        ]}
      >
        <Feather name="trash-2" size={24} color="#fff" />
        <ThemedText style={styles.deleteText}>Delete</ThemedText>
      </Animated.View>

      {/* Swipeable card */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateX: pan }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={[
            styles.articleCard,
            {
              backgroundColor: cardBackgroundColor,
              borderColor,
            },
          ]}
          onPress={onPress}
        >
          <View style={styles.articleContent}>
            {articleImageUrl ? (
              <Image
                source={{ uri: articleImageUrl }}
                style={styles.articleImage}
                contentFit="cover"
              />
            ) : null}
            <View style={styles.articleInfo}>
              <ThemedText style={styles.articleTitle} numberOfLines={2}>
                {articleTitle}
              </ThemedText>
              {articleAuthor ? (
                <ThemedText
                  style={[styles.articleMeta, { color: secondaryTextColor }]}
                >
                  By {articleAuthor}
                </ThemedText>
              ) : null}
              {articleDate ? (
                <ThemedText
                  style={[styles.articleMeta, { color: secondaryTextColor }]}
                >
                  {formatDate(articleDate)}
                </ThemedText>
              ) : null}
            </View>
          </View>

          {/* Bookmark icon */}
          <View style={styles.bookmarkContainer}>
            <View
              style={[
                styles.bookmarkCircle,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.08)",
                },
              ]}
            >
              <Feather
                name="bookmark"
                size={18}
                color={theme.text}
                fill={theme.text}
              />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    position: "relative",
  },
  deleteContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    borderTopRightRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
  },
  deleteText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  card: {
    backgroundColor: "transparent",
  },
  articleCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  articleContent: {
    flexDirection: "row",
    padding: Spacing.md,
  },
  articleImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  articleInfo: {
    flex: 1,
    paddingRight: SAVED_ARTICLE_BOOKMARK_TEXT_INSET,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  articleMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  bookmarkContainer: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
  },
  bookmarkCircle: {
    width: SAVED_ARTICLE_BOOKMARK_CIRCLE_SIZE,
    height: SAVED_ARTICLE_BOOKMARK_CIRCLE_SIZE,
    borderRadius: SAVED_ARTICLE_BOOKMARK_CIRCLE_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
