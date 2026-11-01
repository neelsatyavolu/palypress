import { Platform } from "react-native";

const tintColorLight = "#007AFF";
const tintColorDark = "#0A84FF";

export const Colors = {
  light: {
    text: "#11181C",
    textSecondary: "#666666",
    textTertiary: "#999999",
    buttonText: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    link: "#007AFF",
    backgroundRoot: "#FFFFFF", // Elevation 0
    backgroundDefault: "#F2F2F2", // Elevation 1
    backgroundSecondary: "#E6E6E6", // Elevation 2
    backgroundTertiary: "#D9D9D9", // Elevation 3
    border: "rgba(0,0,0,0.1)",
    borderSecondary: "rgba(0,0,0,0.08)",
    placeholder: "rgba(0,0,0,0.4)",
    error: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981",
    info: "#3B82F6",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "rgba(255,255,255,0.6)",
    textTertiary: "rgba(255,255,255,0.4)",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    link: "#0A84FF",
    backgroundRoot: "#1F2123", // Elevation 0
    backgroundDefault: "#2A2C2E", // Elevation 1
    backgroundSecondary: "#353739", // Elevation 2
    backgroundTertiary: "#404244", // Elevation 3
    border: "rgba(255,255,255,0.1)",
    borderSecondary: "rgba(255,255,255,0.08)",
    placeholder: "rgba(255,255,255,0.4)",
    error: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981",
    info: "#3B82F6",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600" as const,
  },
  // Enhanced typography for article cards
  cardHeadline: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  cardExcerpt: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  // Enhanced typography for article reading
  articleBody: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: "400" as const,
  },
  articleBodySerif: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
