import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
  delay?: number;
}

export function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius = BorderRadius.sm,
  style,
  delay = 0,
}: SkeletonLoaderProps) {
  const { isDark } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [animatedValue, delay]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.08)",
          opacity,
        },
        style,
      ]}
    />
  );
}

interface ArticleCardSkeletonProps {
  showBadge?: boolean;
  delay?: number;
}

export function ArticleCardSkeleton({
  showBadge = false,
  delay = 0,
}: ArticleCardSkeletonProps) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? "#1a1a1a" : "#fff",
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        },
      ]}
    >
      {/* Image skeleton */}
      <SkeletonLoader
        width="100%"
        height={200}
        borderRadius={BorderRadius.md}
        delay={delay}
      />

      {/* Badge skeleton */}
      {showBadge && (
        <View style={styles.badgeContainer}>
          <SkeletonLoader
            width={80}
            height={20}
            borderRadius={10}
            delay={delay}
          />
        </View>
      )}

      {/* Content skeleton */}
      <View style={styles.contentContainer}>
        {/* Headline */}
        <SkeletonLoader
          width="100%"
          height={24}
          style={{ marginBottom: Spacing.xs }}
          delay={delay}
        />
        <SkeletonLoader
          width="80%"
          height={24}
          style={{ marginBottom: Spacing.sm }}
          delay={delay}
        />

        {/* Excerpt */}
        <SkeletonLoader
          width="100%"
          height={16}
          style={{ marginBottom: Spacing.xs }}
          delay={delay}
        />
        <SkeletonLoader
          width="90%"
          height={16}
          style={{ marginBottom: Spacing.sm }}
          delay={delay}
        />

        {/* Meta */}
        <View style={styles.metaContainer}>
          <SkeletonLoader width={100} height={14} delay={delay} />
          <SkeletonLoader width={80} height={14} delay={delay} />
        </View>
      </View>
    </View>
  );
}

export function CommentCardSkeleton() {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.commentContainer,
        {
          backgroundColor: isDark ? "#1a1a1a" : "#fff",
          borderBottomColor: isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)",
        },
      ]}
    >
      <View style={styles.commentHeader}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <SkeletonLoader
            width={120}
            height={16}
            style={{ marginBottom: Spacing.xs }}
          />
          <SkeletonLoader width={80} height={12} />
        </View>
      </View>
      <SkeletonLoader
        width="100%"
        height={14}
        style={{ marginBottom: Spacing.xs }}
      />
      <SkeletonLoader width="85%" height={14} />
    </View>
  );
}

export function StaffCardSkeleton() {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.staffContainer,
        {
          backgroundColor: isDark ? "#1a1a1a" : "#fff",
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        },
      ]}
    >
      <SkeletonLoader width={56} height={56} borderRadius={28} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <SkeletonLoader
          width="60%"
          height={18}
          style={{ marginBottom: Spacing.xs }}
        />
        <SkeletonLoader width="40%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  cardContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  badgeContainer: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  metaContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  commentContainer: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  staffContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
});
