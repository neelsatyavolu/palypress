import React from "react";
import { Platform, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import type { BlurTint } from "expo-blur";
import { GlassView } from "expo-glass-effect";
import type { GlassStyle } from "expo-glass-effect";

import { isLiquidGlassEnabled } from "@/lib/liquidGlass";

interface LiquidGlassBackdropProps {
  fallbackIntensity?: number;
  fallbackTint: BlurTint;
  glassEffectStyle?: GlassStyle;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
}

export function LiquidGlassBackdrop({
  fallbackIntensity = 80,
  fallbackTint,
  glassEffectStyle = "regular",
  style,
  tintColor,
}: LiquidGlassBackdropProps) {
  const backdropStyle = [StyleSheet.absoluteFill, style];

  if (isLiquidGlassEnabled()) {
    return (
      <GlassView
        glassEffectStyle={glassEffectStyle}
        pointerEvents="none"
        style={backdropStyle}
        tintColor={tintColor}
      />
    );
  }

  if (Platform.OS === "ios") {
    return (
      <BlurView
        intensity={fallbackIntensity}
        pointerEvents="none"
        style={backdropStyle}
        tint={fallbackTint}
      />
    );
  }

  return null;
}
