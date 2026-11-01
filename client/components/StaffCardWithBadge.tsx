import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
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

export interface StaffWithPublication extends StaffProfile {
  publicationId: string;
  publicationName: string;
  publicationColor: string;
}

interface StaffCardWithBadgeProps {
  staff: StaffWithPublication;
  onPress: () => void;
}

export function StaffCardWithBadge({
  staff,
  onPress,
}: StaffCardWithBadgeProps) {
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
  const imageUrl =
    staff.featured_image_src ||
    staff._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  const bylineColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666666";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.staffCard,
        { backgroundColor: isDark ? theme.backgroundDefault : "#F8F8F8" },
        animatedStyle,
      ]}
    >
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
          <ThemedText style={styles.avatarInitial}>{name.charAt(0)}</ThemedText>
        </View>
      )}
      <View style={styles.staffInfo}>
        <View style={styles.nameRow}>
          <ThemedText style={styles.staffName} numberOfLines={1}>
            {name}
          </ThemedText>
          <View
            style={[styles.badge, { backgroundColor: staff.publicationColor }]}
          >
            <ThemedText style={styles.badgeText}>
              {staff.publicationName}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.staffRole, { color: bylineColor }]}>
          {role}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: "600",
  },
  staffInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  staffRole: {
    fontSize: 14,
  },
});
