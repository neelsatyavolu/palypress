import {
  Platform,
  StyleSheet,
  StyleProp,
  TextStyle,
  Text as RNText,
  type TextProps,
} from "react-native";
import { Text as TamaguiText } from "tamagui";

import { useTheme } from "@/hooks/useTheme";
import { useOptionalReaderPreferences } from "@/contexts/ReaderPreferencesContext";
import { Fonts, Typography } from "@/constants/theme";
import {
  DEFAULT_READER_PREFERENCES,
  resolveAppFontFamily,
} from "@/lib/appearancePreferences";

export type ThemedTextProps = TextProps & {
  style?: StyleProp<TextStyle>;
  lightColor?: string;
  darkColor?: string;
  type?: "h1" | "h2" | "h3" | "h4" | "body" | "small" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();
  const readerPreferences = useOptionalReaderPreferences();
  const appFontFamily = resolveAppFontFamily(
    readerPreferences?.preferences.appFontFamily ??
      DEFAULT_READER_PREFERENCES.appFontFamily,
    Fonts,
  );

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "h1":
        return Typography.h1;
      case "h2":
        return Typography.h2;
      case "h3":
        return Typography.h3;
      case "h4":
        return Typography.h4;
      case "body":
        return Typography.body;
      case "small":
        return Typography.small;
      case "link":
        return Typography.link;
      default:
        return Typography.body;
    }
  };

  const flattenedStyle = StyleSheet.flatten([
    { color: getColor() },
    getTypeStyle(),
    { fontFamily: appFontFamily },
    style,
  ]);

  if (Platform.OS !== "web") {
    return <RNText style={flattenedStyle} {...rest} />;
  }

  return <TamaguiText style={flattenedStyle} {...(rest as any)} />;
}
