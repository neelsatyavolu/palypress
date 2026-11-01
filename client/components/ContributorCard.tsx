import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { stripHtmlTags } from "@/lib/htmlUtils";
import { StaffProfile } from "@/types/article";

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ContributorCardProps {
  staff: StaffProfile;
  onPress: () => void;
}

export function ContributorCard({ staff, onPress }: ContributorCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const name = stripHtmlTags(staff.title.rendered);
  const role = stripHtmlTags(staff.excerpt.rendered);
  const bio = stripHtmlTags(staff.content.rendered);
  const imageUrl =
    staff.featured_image_src ||
    staff._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  const roleColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666666";
  const bioColor = isDark ? "rgba(255, 255, 255, 0.7)" : "#555555";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        { backgroundColor: isDark ? theme.backgroundDefault : "#F8F8F8" },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#E0E0E0",
              },
            ]}
          >
            <ThemedText style={styles.avatarInitial}>
              {name.charAt(0)}
            </ThemedText>
          </View>
        )}
        <View style={styles.headerText}>
          <ThemedText style={styles.name}>{name}</ThemedText>
          {role ? (
            <ThemedText
              style={[styles.role, { color: roleColor }]}
              numberOfLines={1}
            >
              {role}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {bio ? (
        <ThemedText style={[styles.bio, { color: bioColor }]} numberOfLines={2}>
          {bio}
        </ThemedText>
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "600",
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  role: {
    fontSize: 13,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
});
