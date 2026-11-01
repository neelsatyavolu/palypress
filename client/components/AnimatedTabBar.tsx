import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTabBarScrollContext } from "@/contexts/TabBarScrollContext";
import { LiquidGlassBackdrop } from "@/components/LiquidGlassBackdrop";
import { getLiquidGlassTintColor } from "@/lib/themeMode";

const TAB_BAR_FULL_HEIGHT = 49;
const TAB_BAR_MINI_HEIGHT = 20;
const TAB_BAR_MINI_WIDTH = 200; // Adjusted for 5 tabs
const TAB_BAR_MINI_MARGIN_BOTTOM = 8;

// Map tab names to icons
const TAB_ICONS: Record<string, string> = {
  DashboardTab: "grid",
  NewsTab: "file-text",
  PublicationsTab: "book",
  CivicTab: "flag",
  CalendarTab: "calendar",
  ScheduleTab: "calendar",
  SettingsTab: "settings",
};

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { tabBarProgress } = useTabBarScrollContext();
  const screenWidth = Dimensions.get("window").width;

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const paddingHorizontal = interpolate(
      tabBarProgress.value,
      [0, 1],
      [0, 8],
      Extrapolation.CLAMP,
    );

    return {
      paddingHorizontal,
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      tabBarProgress.value,
      [0, 1],
      [
        TAB_BAR_FULL_HEIGHT + insets.bottom,
        TAB_BAR_MINI_HEIGHT + insets.bottom,
      ],
      Extrapolation.CLAMP,
    );

    const width = interpolate(
      tabBarProgress.value,
      [0, 1],
      [screenWidth, TAB_BAR_MINI_WIDTH],
      Extrapolation.CLAMP,
    );

    const borderRadius = interpolate(
      tabBarProgress.value,
      [0, 1],
      [0, 50],
      Extrapolation.CLAMP,
    );

    const marginBottom = interpolate(
      tabBarProgress.value,
      [0, 1],
      [0, TAB_BAR_MINI_MARGIN_BOTTOM],
      Extrapolation.CLAMP,
    );

    const marginHorizontal = interpolate(
      tabBarProgress.value,
      [0, 1],
      [0, (screenWidth - TAB_BAR_MINI_WIDTH) / 2],
      Extrapolation.CLAMP,
    );

    const shadowOpacity = interpolate(
      tabBarProgress.value,
      [0, 1],
      [0.1, 0.25],
      Extrapolation.CLAMP,
    );

    const shadowRadius = interpolate(
      tabBarProgress.value,
      [0, 1],
      [8, 12],
      Extrapolation.CLAMP,
    );

    return {
      height,
      width,
      borderRadius,
      marginBottom,
      marginHorizontal,
      shadowOpacity,
      shadowRadius,
    };
  });

  return (
    <Animated.View
      style={[
        styles.tabBar,
        {
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
        },
        animatedStyle,
      ]}
    >
      <LiquidGlassBackdrop
        fallbackIntensity={100}
        fallbackTint={isDark ? "dark" : "light"}
        tintColor={getLiquidGlassTintColor(isDark ? "dark" : "light")}
      />
      <Animated.View style={[styles.tabContainer, containerAnimatedStyle]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const iconName = TAB_ICONS[route.name] || "circle";
          const color = isFocused
            ? theme.tabIconSelected
            : theme.tabIconDefault;

          return (
            <TabBarButton
              key={route.key}
              label={typeof label === "string" ? label : route.name}
              iconName={iconName}
              color={color}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              tabBarProgress={tabBarProgress}
            />
          );
        })}
      </Animated.View>
    </Animated.View>
  );
}

interface TabBarButtonProps {
  label: string;
  iconName: string;
  color: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  tabBarProgress: any;
}

function TabBarButton({
  label,
  iconName,
  color,
  isFocused,
  onPress,
  onLongPress,
  tabBarProgress,
}: TabBarButtonProps) {
  const iconAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      tabBarProgress.value,
      [0, 1],
      [1, 0.75],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
    };
  });

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      tabBarProgress.value,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP,
    );

    // Use 18 to accommodate descenders and avoid label cut-off (Map, Directory, etc.)
    const height = interpolate(
      tabBarProgress.value,
      [0, 1],
      [18, 0],
      Extrapolation.CLAMP,
    );

    const marginTop = interpolate(
      tabBarProgress.value,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      height,
      marginTop,
      overflow: "hidden",
    };
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}
    >
      <Animated.View style={iconAnimatedStyle}>
        <Feather name={iconName as any} size={24} color={color} />
      </Animated.View>
      <Animated.View style={labelAnimatedStyle}>
        <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    borderTopWidth: 0,
    elevation: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
  },
  tabContainer: {
    flexDirection: "row",
    flex: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
  },
});
