import {
  Platform,
  StyleSheet,
  StyleProp,
  ViewStyle,
  View as RNView,
  type ViewProps,
} from "react-native";
import { View as TamaguiView } from "tamagui";

import { useTheme } from "@/hooks/useTheme";

export type ThemedViewProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const { theme, isDark } = useTheme();

  const backgroundColor =
    isDark && darkColor
      ? darkColor
      : !isDark && lightColor
        ? lightColor
        : theme.backgroundRoot;

  const flattenedStyle = StyleSheet.flatten([{ backgroundColor }, style]);

  if (Platform.OS !== "web") {
    return <RNView style={flattenedStyle} {...otherProps} />;
  }

  return <TamaguiView style={flattenedStyle} {...(otherProps as any)} />;
}
