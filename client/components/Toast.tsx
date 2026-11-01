import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ToastProps {
  message: string;
  icon?: keyof typeof Feather.glyphMap;
  duration?: number;
  visible: boolean;
  onDismiss: () => void;
}

export function Toast({
  message,
  icon = "check-circle",
  duration = 2000,
  visible,
  onDismiss,
}: ToastProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Slide up and fade in
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto-dismiss after duration
      const dismissTimer = withDelay(
        duration,
        withTiming(100, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        }),
      );
      translateY.value = dismissTimer;

      const opacityTimer = withDelay(
        duration,
        withTiming(0, { duration: 300 }),
      );
      opacity.value = opacityTimer;
    }
  }, [visible, duration, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const backgroundColor = isDark ? "#333333" : "#f5f5f5";
  const iconColor = theme.success;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: tabBarHeight + insets.bottom + Spacing.md,
          backgroundColor,
        },
        animatedStyle,
      ]}
    >
      <Feather name={icon} size={20} color={iconColor} />
      <ThemedText style={styles.message}>{message}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: Spacing.sm,
  },
  message: {
    fontSize: 15,
    fontWeight: "500",
  },
});
