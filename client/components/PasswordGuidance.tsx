import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  getPasswordRuleStatuses,
  getPasswordStrength,
  type PasswordStrength,
} from "@/lib/passwordPolicy";

type PasswordGuidanceProps = {
  password: string;
  style?: StyleProp<ViewStyle>;
};

const strengthDetails: Record<
  PasswordStrength,
  { label: string; percent: `${number}%`; color: string }
> = {
  empty: { label: "Strength: Enter a password", percent: "0%", color: "#999" },
  weak: { label: "Strength: Weak", percent: "25%", color: "#ef4444" },
  fair: { label: "Strength: Fair", percent: "50%", color: "#f59e0b" },
  good: { label: "Strength: Good", percent: "75%", color: "#3b82f6" },
  strong: { label: "Strength: Strong", percent: "100%", color: "#10b981" },
};

export function PasswordGuidance({ password, style }: PasswordGuidanceProps) {
  const { isDark } = useTheme();
  const rules = getPasswordRuleStatuses(password);
  const strength = strengthDetails[getPasswordStrength(password)];
  const secondaryTextColor = isDark ? "rgba(255,255,255,0.6)" : "#666";
  const mutedTextColor = isDark ? "rgba(255,255,255,0.45)" : "#777";
  const trackColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.heading}>Password requirements</ThemedText>
        <ThemedText style={[styles.strengthLabel, { color: strength.color }]}>
          {strength.label}
        </ThemedText>
      </View>

      <View style={[styles.meterTrack, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.meterFill,
            { width: strength.percent, backgroundColor: strength.color },
          ]}
        />
      </View>

      <View style={styles.ruleList}>
        {rules.map((rule) => {
          const color = rule.isMet ? "#10b981" : mutedTextColor;

          return (
            <View key={rule.id} style={styles.ruleRow}>
              <Feather
                name={rule.isMet ? "check-circle" : "circle"}
                size={14}
                color={color}
              />
              <ThemedText
                style={[
                  styles.ruleText,
                  { color: rule.isMet ? color : secondaryTextColor },
                ]}
              >
                {rule.label}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  headerRow: {
    gap: Spacing.xs,
  },
  heading: {
    fontSize: 14,
    fontWeight: "600",
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  meterTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  ruleList: {
    gap: Spacing.xs,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ruleText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
