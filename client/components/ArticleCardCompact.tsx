import React from "react";
import { Platform, StyleSheet, Pressable, View } from "react-native";
import { View as TamaguiView } from "tamagui";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { CategoryPill } from "@/components/CategoryPill";
import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { stripHtmlTags, formatDate } from "@/lib/htmlUtils";
import { getReadingTimeText } from "@/lib/readingTime";

interface ArticleCardCompactProps {
  headline: string;
  date: string;
  author: string;
  imageUrl?: string;
  onPress: () => void;
  content?: string;
  category?: {
    name: string;
    color?: string;
  };
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type UIBoxProps = {
  style?: any;
  children?: React.ReactNode;
  [key: string]: any;
};
function UIBox({ style, ...props }: UIBoxProps) {
  const flattened = StyleSheet.flatten(style);
  if (Platform.OS !== "web") {
    return <View style={flattened} {...props} />;
  }
  return <TamaguiView style={flattened} {...props} />;
}

export function ArticleCardCompact({
  headline,
  date,
  author,
  imageUrl,
  onPress,
  content,
  category,
}: ArticleCardCompactProps) {
  const { theme, isDark } = useTheme();
  const { publication } = usePublication();
  const scale = useSharedValue(1);

  const cleanHeadline = stripHtmlTags(headline);
  const formattedDate = formatDate(date);
  const readingTime = content ? getReadingTimeText(content) : null;

  const bylineColor = isDark ? "rgba(255, 255, 255, 0.5)" : "#9E9E9E";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const getGradientColors = (): readonly [string, string] => {
    const pubColor = category?.color || publication.primaryColor;

    if (pubColor && pubColor !== "#000000") {
      return isDark
        ? ([`${pubColor}30`, `${pubColor}15`] as const)
        : ([`${pubColor}20`, `${pubColor}10`] as const);
    }

    return isDark
      ? ([theme.backgroundSecondary, "#1a1a1a"] as const)
      : ([theme.backgroundSecondary, theme.backgroundTertiary] as const);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundRoot },
        animatedStyle,
      ]}
    >
      <UIBox style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <UIBox style={styles.thumbnailPlaceholder}>
            <LinearGradient
              colors={getGradientColors()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientContainer}
            />
          </UIBox>
        )}

        {/* Bottom-left: Category pill */}
        {category && (
          <UIBox style={styles.categoryOverlay}>
            <CategoryPill
              category={category.name}
              color={category.color || publication.primaryColor}
              small
            />
          </UIBox>
        )}
      </UIBox>

      {/* Content: Title and Metadata */}
      <UIBox style={styles.content}>
        <ThemedText style={styles.headline} numberOfLines={2}>
          {cleanHeadline}
        </ThemedText>

        {/* Metadata: Author, Date, Reading Time */}
        <UIBox style={styles.metaRow}>
          <ThemedText
            style={[styles.meta, { color: bylineColor }]}
            numberOfLines={1}
          >
            By {author}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: bylineColor }]}>
            {" · "}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: bylineColor }]}>
            {formattedDate}
          </ThemedText>
          {readingTime && (
            <>
              <ThemedText style={[styles.meta, { color: bylineColor }]}>
                {" · "}
              </ThemedText>
              <ThemedText style={[styles.meta, { color: bylineColor }]}>
                {readingTime}
              </ThemedText>
            </>
          )}
        </UIBox>
      </UIBox>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  imageContainer: {
    position: "relative",
    marginRight: Spacing.md,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xs,
  },
  thumbnailPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
  },
  gradientContainer: {
    flex: 1,
  },
  categoryOverlay: {
    position: "absolute",
    bottom: 4,
    left: 4,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  headline: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: Spacing.xs,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 11,
  },
});
