import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Publication } from "@/constants/publications";
import type { PublicationsStackParamList } from "@/navigation/PublicationsStackNavigator";

type PublicationsNavigationProp = NativeStackNavigationProp<
  PublicationsStackParamList,
  "PublicationsList"
>;

// One-line "what it is" copy for each masthead, keyed by publication id.
// Mirrors the design's PUB_META in the reader UI kit.
const PUB_META: Record<string, { type: string; blurb: string }> = {
  palyvoice: {
    type: "Daily news",
    blurb:
      "Paly's daily online news source, updated by students as stories break.",
  },
  infocus: {
    type: "Broadcast",
    blurb:
      "Student broadcast journalism — video news, features, and a live morning bulletin.",
  },
  campanile: {
    type: "Newspaper",
    blurb: "Paly's student newspaper, covering campus news, opinion, and sports.",
  },
  verde: {
    type: "Feature magazine",
    blurb: "In-depth feature reporting on the issues shaping student life.",
  },
  cmag: {
    type: "Arts & culture",
    blurb: "Arts, culture, and style reported through a student lens.",
  },
  viking: {
    type: "Sports",
    blurb:
      "Everything Paly athletics — game coverage, athlete profiles, and analysis.",
  },
  anthro: {
    type: "Culture magazine",
    blurb: "Long-form storytelling about the people and cultures of Paly.",
  },
  ink: {
    type: "Literary & arts",
    blurb: "Student poetry, prose, and visual art, published each semester.",
  },
  veritas: {
    type: "Magazine",
    blurb:
      "A student magazine spotlighting voices and perspectives across campus.",
  },
  archive: {
    type: "Archive",
    blurb:
      "A searchable back-catalog of every Paly publication, going back decades.",
  },
  viaverde: {
    type: "Photo & lit annual",
    blurb: "Paly's annual photography and literary showcase, published on Issuu.",
  },
  kply: {
    type: "Radio",
    blurb:
      "Student-run radio — music, talk, and interviews streaming on SoundCloud.",
  },
  proof: {
    type: "Photo annual",
    blurb: "A yearly photo annual documenting a year in the life of Paly.",
  },
};

interface ActionButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  variant: "secondary" | "outline";
  onPress: () => void;
}

function ActionButton({ icon, label, variant, onPress }: ActionButtonProps) {
  const { theme } = useTheme();
  const isOutline = variant === "outline";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        isOutline
          ? { borderWidth: 1, borderColor: theme.border }
          : { backgroundColor: theme.backgroundDefault },
        pressed && { opacity: 0.65 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Feather name={icon} size={15} color={theme.text} />
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
    </Pressable>
  );
}

export default function PublicationsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { publications } = usePublication();
  const navigation = useNavigation<PublicationsNavigationProp>();

  // Grouped like the design: WordPress feeds you can read in the app, then the
  // archive and external (Issuu/SoundCloud) sources.
  const inApp = publications.filter((pub) => pub.apiBaseUrl);
  const elsewhere = publications.filter((pub) => !pub.apiBaseUrl);

  const handleStaff = (pub: Publication) => {
    navigation.navigate("Staff", { publication: pub });
  };

  const handleWebsite = (pub: Publication) => {
    if (pub.domain) {
      Linking.openURL(`https://${pub.domain}`);
    }
  };

  const renderCard = (pub: Publication) => {
    const meta = PUB_META[pub.id];
    const hasStaff = !!pub.apiBaseUrl;

    return (
      <View
        key={pub.id}
        style={[
          styles.card,
          { backgroundColor: theme.backgroundRoot, borderColor: theme.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.logoChip,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Image
              source={{ uri: pub.logoUrl }}
              style={styles.logo}
              contentFit="contain"
              transition={200}
            />
          </View>
          <View style={styles.cardHeaderText}>
            <ThemedText style={styles.cardName} numberOfLines={2}>
              {pub.name}
            </ThemedText>
            {meta?.type ? (
              <View style={styles.typeRow}>
                <View
                  style={[styles.typeDot, { backgroundColor: pub.primaryColor }]}
                />
                <ThemedText
                  style={[styles.typeLabel, { color: theme.textSecondary }]}
                >
                  {meta.type}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {meta?.blurb ? (
          <ThemedText style={[styles.blurb, { color: theme.textSecondary }]}>
            {meta.blurb}
          </ThemedText>
        ) : null}

        <View style={styles.actions}>
          {hasStaff && (
            <ActionButton
              icon="users"
              label="View staff"
              variant="secondary"
              onPress={() => handleStaff(pub)}
            />
          )}
          <ActionButton
            icon="external-link"
            label="View website"
            variant="outline"
            onPress={() => handleWebsite(pub)}
          />
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.sm,
        paddingBottom: tabBarHeight + Spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBlock}>
        <ThemedText style={styles.title}>Publications</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Explore the student newsrooms of Palo Alto High School.
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textTertiary }]}
        >
          Read in the app
        </ThemedText>
        {inApp.map(renderCard)}
      </View>

      {elsewhere.length > 0 && (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textTertiary }]}
          >
            Archive &amp; elsewhere
          </ThemedText>
          {elsewhere.map(renderCard)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  logoChip: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: {
    width: 26,
    height: 26,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  typeRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeDot: {
    width: 7,
    height: 7,
    borderRadius: BorderRadius.full,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  blurb: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: BorderRadius.sm,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
