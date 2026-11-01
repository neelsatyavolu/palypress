import type { ColorSchemeName } from "react-native";

export type ThemeMode = "light" | "dark" | "system";
export type EffectiveColorScheme = "light" | "dark";

const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];

export function normalizeThemeMode(value: unknown): ThemeMode {
  return THEME_MODES.includes(value as ThemeMode)
    ? (value as ThemeMode)
    : "system";
}

export function resolveEffectiveColorScheme(
  mode: ThemeMode,
  systemColorScheme: ColorSchemeName,
): EffectiveColorScheme {
  if (mode !== "system") {
    return mode;
  }

  return systemColorScheme === "dark" ? "dark" : "light";
}

export function getLiquidGlassTintColor(
  colorScheme: EffectiveColorScheme,
): string {
  return colorScheme === "dark"
    ? "rgba(15,17,21,0.82)"
    : "rgba(255,255,255,0.18)";
}
