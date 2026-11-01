import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ONBOARDING_COLORS,
  ONBOARDING_SLIDES,
  isLastSlide,
  nextSlideIndex,
  type OnboardingSlide,
} from "@/constants/onboarding";

const logoSource = require("../../assets/images/icon.png");

interface OnboardingCarouselProps {
  onComplete: () => void;
}

export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);

  const total = ONBOARDING_SLIDES.length;
  const onLast = isLastSlide(index, total);

  const goToIndex = useCallback((next: number) => {
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  }, []);

  const handleNext = useCallback(() => {
    if (onLast) {
      onComplete();
      return;
    }
    goToIndex(nextSlideIndex(index, total));
  }, [onLast, onComplete, goToIndex, index, total]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next !== index) setIndex(next);
    },
    [width, index],
  );

  return (
    <Animated.View
      entering={FadeIn.duration(320)}
      exiting={FadeOut.duration(280)}
      style={styles.container}
    >
      <LinearGradient
        colors={[ONBOARDING_COLORS.greenTop, ONBOARDING_COLORS.greenBottom]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        onPress={onComplete}
        hitSlop={12}
        style={[styles.skip, { top: insets.top + 12 }]}
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image
              source={logoSource}
              resizeMode="contain"
              style={styles.logo}
            />
            {item.eyebrow ? (
              <Text style={styles.eyebrow}>{item.eyebrow}</Text>
            ) : null}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {ONBOARDING_SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onLast ? "Get started" : "Next"}
          onPress={handleNext}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {onLast ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  skip: {
    position: "absolute",
    right: 20,
    zIndex: 2,
  },
  skipText: {
    color: ONBOARDING_COLORS.textMutedOnGreen,
    fontSize: 15,
    fontWeight: "600",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 108,
    height: 108,
    borderRadius: 26,
    marginBottom: 40,
  },
  eyebrow: {
    color: ONBOARDING_COLORS.gold,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 12,
  },
  title: {
    color: ONBOARDING_COLORS.textOnGreen,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    color: ONBOARDING_COLORS.textMutedOnGreen,
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 32,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ONBOARDING_COLORS.dotInactive,
  },
  dotActive: {
    backgroundColor: ONBOARDING_COLORS.gold,
    width: 22,
  },
  button: {
    backgroundColor: ONBOARDING_COLORS.cream,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: ONBOARDING_COLORS.greenTop,
    fontSize: 17,
    fontWeight: "700",
  },
});
