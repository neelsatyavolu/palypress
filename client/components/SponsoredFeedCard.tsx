import React from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { SponsoredFeedAd } from "@/lib/articleAds";

interface SponsoredFeedCardProps {
  item: SponsoredFeedAd;
}

export function SponsoredFeedCard({ item }: SponsoredFeedCardProps) {
  const { theme, isDark } = useTheme();
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "#D7DEE8";
  const backgroundColor = isDark ? theme.backgroundDefault : "#F6F9FC";
  const textColor = isDark ? "rgba(255,255,255,0.72)" : "#334155";

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => Linking.openURL(item.ad.url)}
      style={[styles.card, { backgroundColor, borderColor }]}
    >
      <View style={styles.icon}>
        <Feather name="radio" size={18} color="#1A5C96" />
      </View>
      <View style={styles.content}>
        <ThemedText style={styles.label}>{item.ad.label}</ThemedText>
        <ThemedText style={styles.title}>{item.ad.title}</ThemedText>
        <ThemedText style={[styles.body, { color: textColor }]}>
          {item.ad.body}
        </ThemedText>
        <View style={styles.ctaRow}>
          <ThemedText style={styles.cta}>{item.ad.cta}</ThemedText>
          <Feather name="external-link" size={13} color="#1A5C96" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(26, 92, 150, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: "#1A5C96",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: 5,
  },
  cta: {
    color: "#1A5C96",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
