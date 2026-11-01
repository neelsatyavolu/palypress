import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { formatArchiveItemTypeLabel } from "@/lib/archiveItemTypeLabel";
import type { ArchiveSearchResult } from "@/types/archive";

interface ArchiveResultCardProps {
  result: ArchiveSearchResult;
  onPress: () => void;
}

export function ArchiveResultCard({ result, onPress }: ArchiveResultCardProps) {
  const { theme, isDark } = useTheme();
  const secondaryTextColor = isDark ? "rgba(255,255,255,0.62)" : "#555555";
  const mutedTextColor = isDark ? "rgba(255,255,255,0.45)" : "#777777";
  const typeTextColor = isDark ? "rgba(255,255,255,0.72)" : "#4A4A4A";
  const typeBadgeBackground = isDark
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.035)";
  const cardBackground = isDark ? "#2A2C2E" : "#FFFFFF";
  const itemTypeLabel = formatArchiveItemTypeLabel(result.itemType);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="archive" size={16} color={theme.text} />
        </View>
        <View style={styles.titleColumn}>
          <ThemedText style={styles.title}>{result.title}</ThemedText>
          <ThemedText style={[styles.dateLabel, { color: secondaryTextColor }]}>
            {result.dateLabel}
          </ThemedText>
        </View>
      </View>

      {result.snippet ? (
        <ThemedText style={[styles.snippet, { color: secondaryTextColor }]}>
          {result.snippet}
        </ThemedText>
      ) : null}

      <View style={styles.footerRow}>
        {itemTypeLabel ? (
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: typeBadgeBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={[styles.typeText, { color: typeTextColor }]}>
              {itemTypeLabel}
            </ThemedText>
          </View>
        ) : null}
        <Feather name="chevron-right" size={18} color={mutedTextColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 0,
  },
  dateLabel: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.xs,
    letterSpacing: 0,
  },
  snippet: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.md,
    letterSpacing: 0,
  },
  footerRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  typeBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    flexShrink: 1,
    maxWidth: "88%",
  },
  typeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0,
  },
});
