import assert from "node:assert/strict";

import {
  getLiquidGlassTintColor,
  normalizeThemeMode,
  resolveEffectiveColorScheme,
} from "./themeMode";

assert.equal(
  resolveEffectiveColorScheme("system", "dark"),
  "dark",
  "system mode should follow a dark system color scheme",
);

assert.equal(
  resolveEffectiveColorScheme("system", "light"),
  "light",
  "system mode should follow a light system color scheme",
);

assert.equal(
  resolveEffectiveColorScheme("light", "dark"),
  "light",
  "light mode should override a dark system color scheme",
);

assert.equal(
  resolveEffectiveColorScheme("dark", "light"),
  "dark",
  "dark mode should override a light system color scheme",
);

assert.equal(
  normalizeThemeMode("dim"),
  "system",
  "unknown stored mode values should fall back to system",
);

assert.equal(
  getLiquidGlassTintColor("dark"),
  "rgba(15,17,21,0.82)",
  "dark mode glass surfaces should use a dark tint",
);

assert.equal(
  getLiquidGlassTintColor("light"),
  "rgba(255,255,255,0.18)",
  "light mode glass surfaces should use a light tint",
);
