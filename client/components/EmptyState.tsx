import React, { useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  WithTimingConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

const fadeConfig: WithTimingConfig = {
  duration: 400,
};

export const EmptyState = React.memo(
  ({
    icon,
    title,
    description,
    actionLabel,
    onActionPress,
  }: EmptyStateProps) => {
    const { theme, isDark } = useTheme();
    const opacity = useSharedValue(0);

    useEffect(() => {
      // Fade in animation with 100ms delay
      const timer = setTimeout(() => {
        opacity.value = withTiming(1, fadeConfig);
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    const iconColor = isDark
      ? "rgba(255, 255, 255, 0.3)"
      : "rgba(0, 0, 0, 0.2)";

    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={styles.iconContainer}>
          <Feather name={icon} size={48} color={iconColor} />
        </View>

        <ThemedText style={styles.title}>{title}</ThemedText>

        {description && (
          <ThemedText
            style={[
              styles.description,
              { color: isDark ? "rgba(255,255,255,0.6)" : "#666" },
            ]}
          >
            {description}
          </ThemedText>
        )}

        {actionLabel && onActionPress && (
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.link }]}
            onPress={onActionPress}
          >
            <ThemedText style={styles.actionButtonText}>
              {actionLabel}
            </ThemedText>
          </Pressable>
        )}
      </Animated.View>
    );
  },
);

EmptyState.displayName = "EmptyState";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["4xl"],
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
