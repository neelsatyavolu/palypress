import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

interface PlaceholderScreenProps {
  title: string;
  icon?: keyof typeof Feather.glyphMap;
}

export function PlaceholderScreen({
  title,
  icon = "file-text",
}: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { isDark } = useTheme();

  const secondaryColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Feather name={icon} size={48} color={secondaryColor} />
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: secondaryColor }]}>
          Coming Soon
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export function AboutScreen() {
  return <PlaceholderScreen title="About" icon="info" />;
}

export function PoliciesScreen() {
  return <PlaceholderScreen title="Policies" icon="shield" />;
}

export function ContactUsScreen() {
  return <PlaceholderScreen title="Contact Us" icon="mail" />;
}

export function CorrectionsScreen() {
  return <PlaceholderScreen title="Corrections" icon="edit-3" />;
}

export function ArchivesScreen() {
  return <PlaceholderScreen title="Archives" icon="archive" />;
}

export function AdvertisingScreen() {
  return <PlaceholderScreen title="Advertising" icon="briefcase" />;
}

export function SponsorScreen() {
  return <PlaceholderScreen title="Sponsor" icon="heart" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    marginTop: Spacing.sm,
  },
});
