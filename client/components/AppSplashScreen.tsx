import React, { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

import { ONBOARDING_COLORS, pickTagline } from "@/constants/onboarding";
import { PUBLICATIONS } from "@/constants/publications";

const logoSource = require("../../assets/images/icon.png");

// The full roster of publications unified in the app, shown on the splash.
const PUBLICATION_NAMES = PUBLICATIONS.map((p) => p.shortName).join("  ·  ");

interface AppSplashScreenProps {
  ready: boolean;
  onFinished: () => void;
  // Minimum time the splash stays visible even when `ready` is already true,
  // so the branded blurb is readable. Defaults to 0 (fade as soon as ready).
  minDurationMs?: number;
}

export function AppSplashScreen({
  ready,
  onFinished,
  minDurationMs = 0,
}: AppSplashScreenProps) {
  const insets = useSafeAreaInsets();
  // Seed the tagline once per mount so it stays stable through the animation
  // but varies between launches.
  const [tagline] = useState(() => pickTagline(Date.now()));
  const [minElapsed, setMinElapsed] = useState(minDurationMs === 0);

  const overlayOpacity = useSharedValue(1);
  const overlayScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.92);
  const textOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    textOpacity.value = withDelay(
      240,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }),
    );
    footerOpacity.value = withDelay(
      560,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    pulse.value = withDelay(
      420,
      withRepeat(
        withSequence(
          withTiming(0.82, {
            duration: 700,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );

    // The native splash (app.json) and this overlay are visually matched, so
    // hiding it here as soon as we mount is invisible to the user.
    SplashScreen.hideAsync().catch(() => {});
  }, [logoOpacity, logoScale, textOpacity, footerOpacity, pulse]);

  useEffect(() => {
    if (minDurationMs === 0) return;
    const timer = setTimeout(() => setMinElapsed(true), minDurationMs);
    return () => clearTimeout(timer);
  }, [minDurationMs]);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    // Exit by gently zooming the whole splash forward while fading out, so it
    // feels like moving into the app rather than a flat cross-fade.
    overlayScale.value = withTiming(1.08, {
      duration: 520,
      easing: Easing.in(Easing.cubic),
    });
    overlayOpacity.value = withTiming(
      0,
      { duration: 480, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onFinished)();
      },
    );
  }, [ready, minElapsed, overlayOpacity, overlayScale, onFinished]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value * pulse.value,
    transform: [{ scale: logoScale.value * pulse.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={ready && minElapsed ? "none" : "auto"}
      style={[styles.container, overlayStyle]}
    >
      <LinearGradient
        colors={[ONBOARDING_COLORS.greenTop, ONBOARDING_COLORS.greenBottom]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.Image
        source={logoSource}
        resizeMode="contain"
        style={[styles.logo, logoStyle]}
      />
      <Animated.View style={textStyle}>
        <Text style={styles.eyebrow}>A Paly MAC Project</Text>
        <Text style={styles.wordmark}>Paly Press</Text>
        <Text style={styles.tagline}>{tagline}</Text>
      </Animated.View>

      <Animated.View
        style={[styles.footer, footerStyle, { bottom: insets.bottom + 28 }]}
      >
        <Text style={styles.footerLabel}>All of Paly journalism</Text>
        <Text style={styles.footerNames}>{PUBLICATION_NAMES}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logo: {
    width: 128,
    height: 128,
    borderRadius: 30,
    marginBottom: 24,
  },
  eyebrow: {
    color: ONBOARDING_COLORS.gold,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 8,
  },
  wordmark: {
    color: ONBOARDING_COLORS.textOnGreen,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  tagline: {
    color: ONBOARDING_COLORS.textMutedOnGreen,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    left: 32,
    right: 32,
    alignItems: "center",
  },
  footerLabel: {
    color: ONBOARDING_COLORS.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  footerNames: {
    color: ONBOARDING_COLORS.textMutedOnGreen,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },
});
