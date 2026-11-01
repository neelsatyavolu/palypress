import React from "react";
import { StyleSheet, ScrollView, View, Linking } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { HOME_PUBLICATION } from "@/constants/publications";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { WordPressPageScreen } from "@/screens/WordPressPageScreen";
import { Spacing, Typography } from "@/constants/theme";

const CONTACT_EMAIL = "team@palyjournalism.com";
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

const GOALS = [
  "Create a central home for Paly student work.",
  "Close the disconnect between how most students consume media and how we distribute it.",
  "Expand Paly Journalism's reach by making our work more accessible and streamlined.",
  "Help define a shared Paly Journalism identity across every newsroom.",
];

const TEAM = [
  { name: "Priya Tamura", role: "Developer — The Paly Voice" },
  { name: "Oscar Varodayan", role: "Developer — The Paly Voice" },
  { name: "Neel Satyavolu", role: "Developer — InFocus" },
  { name: "Paul Kandell", role: "Teacher Advisor & Sponsor" },
];

export function AboutScreen() {
  const { publication } = usePublication();

  // The unified "Home" publication has no WordPress site, so it shows the
  // app's own About. Every other publication shows its own About page.
  if (publication.id !== HOME_PUBLICATION.id) {
    const slug =
      publication.menuItems.find((item) => item.route === "About")?.pageSlug ||
      "about";
    return <WordPressPageScreen slug={slug} title="About" />;
  }

  return <AppAboutScreen />;
}

function AppAboutScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { isDark } = useTheme();

  const secondaryColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
  const bulletColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
  const version = Constants.expoConfig?.version;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <ThemedText style={[styles.h1, styles.heading]}>PALY Press</ThemedText>
        <View style={styles.paragraph}>
          <ThemedText style={[styles.bodyText, { color: secondaryColor }]}>
            One home for Palo Alto High School's student journalism. PALY Press
            brings together the work of Paly's newsrooms — The Paly Voice,
            InFocus, The Campanile, Verde, C Magazine, Viking, Anthro, and more —
            so it lives where students already are: on their phones.
          </ThemedText>
        </View>

        <ThemedText style={[styles.h3, styles.heading]}>Why we built it</ThemedText>
        <View style={styles.list}>
          {GOALS.map((goal, i) => (
            <View key={i} style={styles.listItem}>
              <ThemedText style={[styles.bullet, { color: bulletColor }]}>
                •
              </ThemedText>
              <View style={styles.listItemContent}>
                <ThemedText style={styles.bodyText}>{goal}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        <ThemedText style={[styles.h3, styles.heading]}>Our team</ThemedText>
        {TEAM.map((member) => (
          <View key={member.name} style={styles.teamRow}>
            <ThemedText style={[styles.bodyText, styles.bold]}>
              {member.name}
            </ThemedText>
            <ThemedText style={[styles.bodyText, { color: secondaryColor }]}>
              {member.role}
            </ThemedText>
          </View>
        ))}

        <ThemedText style={[styles.h3, styles.heading]}>Content ownership</ThemedText>
        <View style={styles.paragraph}>
          <ThemedText style={[styles.bodyText, { color: secondaryColor }]}>
            PALY Press is a reader app, not a publisher. Every article, photo,
            and story shown here remains the property of the newsroom and
            student journalist who created it — not PALY Press. We simply
            bring their published work together in one place.
          </ThemedText>
        </View>

        <ThemedText style={[styles.h3, styles.heading]}>Get in touch</ThemedText>
        <View style={styles.paragraph}>
          <ThemedText style={[styles.bodyText, { color: secondaryColor }]}>
            Questions, bugs, or ideas? Send us feedback from the profile screen or
            email us at{" "}
            <ThemedText
              style={[styles.bodyText, styles.link]}
              onPress={() => Linking.openURL(CONTACT_MAILTO)}
            >
              {CONTACT_EMAIL}
            </ThemedText>
            .
          </ThemedText>
        </View>

        {version ? (
          <ThemedText style={[styles.version, { color: secondaryColor }]}>
            Version {version}
          </ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  heading: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  h1: {
    ...Typography.h1,
    marginTop: 0,
  },
  h3: {
    ...Typography.h3,
  },
  paragraph: {
    marginBottom: Spacing.md,
  },
  bodyText: {
    ...Typography.body,
  },
  bold: {
    fontWeight: "700",
  },
  link: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  list: {
    marginBottom: Spacing.md,
    paddingLeft: Spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  bullet: {
    fontSize: 16,
    marginRight: Spacing.sm,
    lineHeight: 24,
  },
  listItemContent: {
    flex: 1,
  },
  teamRow: {
    marginBottom: Spacing.md,
  },
  version: {
    ...Typography.body,
    fontSize: 14,
    marginTop: Spacing.xl,
  },
});
