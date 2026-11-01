import React from "react";
import { View, Pressable, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { LiquidGlassBackdrop } from "@/components/LiquidGlassBackdrop";
import { PublicationSwitcher } from "@/components/PublicationSwitcher";
import { Spacing } from "@/constants/theme";
import { getLiquidGlassTintColor } from "@/lib/themeMode";

const HEADER_HEIGHT = 49;

interface AnimatedHeaderProps {
  onMenuPress: () => void;
  onSearchPress: () => void;
}

export function AnimatedHeader({
  onMenuPress,
  onSearchPress,
}: AnimatedHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const isWeb = Platform.OS === "web";

  const headerContainerStyle = useAnimatedStyle(() => ({
    height: HEADER_HEIGHT + insets.top,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    paddingTop: insets.top + 4,
    paddingBottom: 4,
    paddingHorizontal: isWeb ? 24 : Spacing.md,
  }));

  const renderContent = () => (
    <Animated.View style={[styles.content, contentStyle]}>
      <View style={isWeb ? styles.webButton : styles.button}>
        <Pressable
          onPress={onMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={isWeb ? webIconStyle(isDark) : undefined}
        >
          <Feather name="menu" size={isWeb ? 20 : 24} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.centerContainer}>
        <PublicationSwitcher showLabel={true} />
      </View>

      <View style={isWeb ? styles.webButton : styles.button}>
        <Pressable
          onPress={onSearchPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={isWeb ? webIconStyle(isDark) : undefined}
        >
          <Feather name="search" size={isWeb ? 19 : 22} color={theme.text} />
        </Pressable>
      </View>
    </Animated.View>
  );

  if (isWeb) {
    return (
      <Animated.View
        style={[
          styles.headerContainer,
          headerContainerStyle,
          {
            // @ts-ignore web-only properties
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            backgroundColor: isDark
              ? "rgba(15, 17, 21, 0.8)"
              : "rgba(255, 255, 255, 0.85)",
            borderBottomWidth: 1,
            borderBottomColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
          },
        ]}
      >
        {renderContent()}
      </Animated.View>
    );
  }

  if (Platform.OS === "ios") {
    return (
      <Animated.View style={[styles.headerContainer, headerContainerStyle]}>
        <LiquidGlassBackdrop
          fallbackIntensity={80}
          fallbackTint={isDark ? "dark" : "light"}
          tintColor={getLiquidGlassTintColor(isDark ? "dark" : "light")}
        />
        {renderContent()}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        headerContainerStyle,
        { backgroundColor: theme.backgroundRoot },
      ]}
    >
      {renderContent()}
    </Animated.View>
  );
}

function webIconStyle(isDark: boolean) {
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    cursor: "pointer" as const,
  };
}

const styles = StyleSheet.create({
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 40,
  },
  webButton: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 40,
  },
});
