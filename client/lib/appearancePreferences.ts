export type FontFamily = "sans" | "serif";
export type LineSpacing = "compact" | "comfortable" | "spacious";
export type AppFontFamily = "system" | "rounded";
type AppFontMap = {
  sans?: string;
  rounded?: string;
};

export interface ReaderPreferences {
  fontSize: number;
  fontFamily: FontFamily;
  lineSpacing: LineSpacing;
  appFontFamily: AppFontFamily;
}

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontSize: 18,
  fontFamily: "sans",
  lineSpacing: "comfortable",
  appFontFamily: "system",
};

const FONT_FAMILIES: FontFamily[] = ["sans", "serif"];
const LINE_SPACINGS: LineSpacing[] = ["compact", "comfortable", "spacious"];
const APP_FONT_FAMILIES: AppFontFamily[] = ["system", "rounded"];

export function normalizeReaderPreferences(value: unknown): ReaderPreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_READER_PREFERENCES;
  }

  const preferences = value as Partial<ReaderPreferences>;
  const fontSize =
    typeof preferences.fontSize === "number"
      ? Math.max(14, Math.min(22, preferences.fontSize))
      : DEFAULT_READER_PREFERENCES.fontSize;

  return {
    fontSize,
    fontFamily: FONT_FAMILIES.includes(preferences.fontFamily as FontFamily)
      ? (preferences.fontFamily as FontFamily)
      : DEFAULT_READER_PREFERENCES.fontFamily,
    lineSpacing: LINE_SPACINGS.includes(preferences.lineSpacing as LineSpacing)
      ? (preferences.lineSpacing as LineSpacing)
      : DEFAULT_READER_PREFERENCES.lineSpacing,
    appFontFamily: APP_FONT_FAMILIES.includes(
      preferences.appFontFamily as AppFontFamily,
    )
      ? (preferences.appFontFamily as AppFontFamily)
      : DEFAULT_READER_PREFERENCES.appFontFamily,
  };
}

export function resolveAppFontFamily(
  appFontFamily: AppFontFamily,
  fonts: AppFontMap,
) {
  return appFontFamily === "rounded" ? fonts.rounded : fonts.sans;
}
