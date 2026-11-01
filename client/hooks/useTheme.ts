import { Platform } from "react-native";
import { Colors } from "@/constants/theme";
import { useThemeMode } from "@/contexts/ThemeModeContext";
import { useTheme as useTamaguiTheme } from "tamagui";

export function useTheme() {
  const { colorScheme, mode, setMode } = useThemeMode();
  const isDark = colorScheme === "dark";

  if (Platform.OS !== "web") {
    const nativeTheme = Colors[colorScheme];
    return {
      theme: {
        ...nativeTheme,
        primary: nativeTheme.link,
      },
      isDark,
      mode,
      setMode,
      toggleTheme: () => setMode(isDark ? "light" : "dark"),
    };
  }

  const tamaguiTheme = useTamaguiTheme();

  const getColor = (key: string, fallback: string) =>
    ((tamaguiTheme as Record<string, { val?: unknown }>)[key]?.val as string) ??
    fallback;

  const theme = {
    text: getColor("text", isDark ? "#ECEDEE" : "#11181C"),
    textSecondary: getColor(
      "textSecondary",
      isDark ? "rgba(255,255,255,0.6)" : "#666666",
    ),
    textTertiary: getColor(
      "textTertiary",
      isDark ? "rgba(255,255,255,0.4)" : "#999999",
    ),
    buttonText: getColor("buttonText", "#FFFFFF"),
    tabIconDefault: getColor("tabIconDefault", isDark ? "#9BA1A6" : "#687076"),
    tabIconSelected: getColor(
      "tabIconSelected",
      isDark ? "#0A84FF" : "#007AFF",
    ),
    primary: getColor("primary", isDark ? "#0A84FF" : "#007AFF"),
    link: getColor("link", isDark ? "#0A84FF" : "#007AFF"),
    backgroundRoot: getColor("backgroundRoot", isDark ? "#1F2123" : "#FFFFFF"),
    backgroundDefault: getColor(
      "backgroundDefault",
      isDark ? "#2A2C2E" : "#F2F2F2",
    ),
    backgroundSecondary: getColor(
      "backgroundSecondary",
      isDark ? "#353739" : "#E6E6E6",
    ),
    backgroundTertiary: getColor(
      "backgroundTertiary",
      isDark ? "#404244" : "#D9D9D9",
    ),
    border: getColor(
      "border",
      isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    ),
    borderSecondary: getColor(
      "borderSecondary",
      isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    ),
    placeholder: getColor(
      "placeholder",
      isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
    ),
    error: getColor("error", "#EF4444"),
    warning: getColor("warning", "#F59E0B"),
    success: getColor("success", "#10B981"),
    info: getColor("info", "#3B82F6"),
  };

  return {
    theme,
    isDark,
    mode,
    setMode,
    toggleTheme: () => setMode(isDark ? "light" : "dark"),
  };
}
