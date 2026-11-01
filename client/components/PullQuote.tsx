import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface PullQuoteProps {
  quote: string;
  color: string;
}

export function PullQuote({ quote, color }: PullQuoteProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderLeftColor: color }]}>
      <ThemedText style={[styles.quote, { color: theme.text }]}>
        &ldquo;{quote}&rdquo;
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    paddingLeft: Spacing.lg,
    paddingVertical: Spacing.md,
    marginVertical: Spacing.lg,
  },
  quote: {
    fontSize: 20,
    lineHeight: 30,
    fontStyle: "italic",
    fontWeight: "500",
  },
});
