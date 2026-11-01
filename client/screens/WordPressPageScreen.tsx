import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Linking,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, Typography, Colors, BorderRadius } from "@/constants/theme";
import { parseWordPressHtml, ParsedElement } from "@/lib/htmlParser";

interface WordPressPage {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
}

interface WordPressPageScreenProps {
  slug: string;
  title: string;
}

export function WordPressPageScreen({ slug, title }: WordPressPageScreenProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { publication } = usePublication();
  const { width: screenWidth } = useWindowDimensions();

  const [page, setPage] = useState<WordPressPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const secondaryColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)";
  const linkColor = isDark ? Colors.dark.link : Colors.light.link;
  const spinnerColor = isDark ? "#fff" : "#000";
  const blockquoteBorderColor = isDark
    ? "rgba(255,255,255,0.3)"
    : "rgba(0,0,0,0.2)";
  const listBulletColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
  const imageWidth = screenWidth - Spacing.lg * 2;

  const fetchPage = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(
        `${publication.apiBaseUrl}/pages?slug=${slug}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch page");
      }

      const data = await response.json();

      if (data.length === 0) {
        throw new Error("Page not found");
      }

      setPage(data[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, [slug, publication.id]);

  const handleLinkPress = async (href: string) => {
    try {
      const supported = await Linking.canOpenURL(href);
      if (supported) {
        await Linking.openURL(href);
      }
    } catch (err) {
      console.error("Failed to open link:", err);
    }
  };

  const renderInlineElement = (
    element: ParsedElement,
    index: number,
  ): React.ReactNode => {
    switch (element.type) {
      case "text":
        return (
          <ThemedText key={index} style={styles.bodyText}>
            {element.content}
          </ThemedText>
        );

      case "link":
        return (
          <ThemedText
            key={index}
            style={[styles.bodyText, styles.link, { color: linkColor }]}
            onPress={() => element.href && handleLinkPress(element.href)}
          >
            {element.content}
          </ThemedText>
        );

      case "bold":
        return (
          <ThemedText key={index} style={[styles.bodyText, styles.bold]}>
            {element.content}
          </ThemedText>
        );

      case "italic":
        return (
          <ThemedText key={index} style={[styles.bodyText, styles.italic]}>
            {element.content}
          </ThemedText>
        );

      case "break":
        return <ThemedText key={index}>{"\n"}</ThemedText>;

      default:
        return null;
    }
  };

  const renderElement = (
    element: ParsedElement,
    index: number,
  ): React.ReactNode => {
    switch (element.type) {
      case "heading":
        const headingStyle =
          element.level === 1
            ? styles.h1
            : element.level === 2
              ? styles.h2
              : element.level === 3
                ? styles.h3
                : styles.h4;
        return (
          <ThemedText key={index} style={[headingStyle, styles.heading]}>
            {element.children && element.children.length > 0
              ? element.children.map((child, i) =>
                  renderInlineElement(child, i),
                )
              : element.content}
          </ThemedText>
        );

      case "paragraph":
        return (
          <View key={index} style={styles.paragraph}>
            <ThemedText style={styles.bodyText}>
              {element.children?.map((child, i) =>
                renderInlineElement(child, i),
              )}
            </ThemedText>
          </View>
        );

      case "list":
        return (
          <View key={index} style={styles.list}>
            {element.children?.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <ThemedText style={[styles.bullet, { color: listBulletColor }]}>
                  •
                </ThemedText>
                <View style={styles.listItemContent}>
                  <ThemedText style={styles.bodyText}>
                    {item.children?.map((child, j) =>
                      renderInlineElement(child, j),
                    )}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        );

      case "blockquote":
        return (
          <View
            key={index}
            style={[
              styles.blockquote,
              { borderLeftColor: blockquoteBorderColor },
            ]}
          >
            {element.children?.map((child, i) => {
              if (child.type === "paragraph" && child.children) {
                return (
                  <ThemedText
                    key={i}
                    style={[
                      styles.bodyText,
                      styles.blockquoteText,
                      { color: secondaryColor },
                      i > 0 && { marginTop: Spacing.sm },
                    ]}
                  >
                    {child.children.map((inline, j) =>
                      renderInlineElement(inline, j),
                    )}
                  </ThemedText>
                );
              }
              return renderInlineElement(child, i);
            })}
          </View>
        );

      case "image":
        if (!element.src) return null;
        return (
          <View key={index} style={styles.imageContainer}>
            <Image
              source={{ uri: element.src }}
              style={[
                styles.image,
                { width: imageWidth, height: imageWidth * 0.6 },
              ]}
              contentFit="cover"
              transition={200}
            />
            {element.alt ? (
              <ThemedText
                style={[styles.imageCaption, { color: secondaryColor }]}
              >
                {element.alt}
              </ThemedText>
            ) : null}
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centerContent, { paddingTop: headerHeight }]}>
          <ActivityIndicator size="large" color={spinnerColor} />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.centerContent, { paddingTop: headerHeight }]}>
          <ThemedText style={[styles.errorText, { color: secondaryColor }]}>
            {error}
          </ThemedText>
          <Pressable
            style={[
              styles.retryButton,
              { backgroundColor: isDark ? "#333" : "#eee" },
            ]}
            onPress={() => fetchPage()}
          >
            <ThemedText style={styles.retryText}>Try Again</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const parsedContent = page ? parseWordPressHtml(page.content.rendered) : [];

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPage(true)}
            tintColor={spinnerColor}
          />
        }
      >
        {parsedContent.map((element, index) => renderElement(element, index))}
      </ScrollView>
    </ThemedView>
  );
}

// Helper to get slug from publication's menuItems
function usePageSlug(route: string, fallbackSlug: string): string {
  const { publication } = usePublication();
  const menuItem = publication.menuItems.find((item) => item.route === route);
  return menuItem?.pageSlug || fallbackSlug;
}

export function PoliciesScreen() {
  const slug = usePageSlug("Policies", "policies");
  return <WordPressPageScreen slug={slug} title="Policies" />;
}

export function ContactUsScreen() {
  const slug = usePageSlug("ContactUs", "contact");
  return <WordPressPageScreen slug={slug} title="Contact Us" />;
}

export function CorrectionsScreen() {
  const slug = usePageSlug("Corrections", "corrections");
  return <WordPressPageScreen slug={slug} title="Corrections" />;
}

export function ArchivesScreen() {
  const slug = usePageSlug("Archives", "archives");
  return <WordPressPageScreen slug={slug} title="Archives" />;
}

export function AdvertisingScreen() {
  const slug = usePageSlug("Advertising", "ads");
  return <WordPressPageScreen slug={slug} title="Advertising" />;
}

export function SponsorScreen() {
  const slug = usePageSlug("Sponsor", "sponsor");
  return <WordPressPageScreen slug={slug} title="Sponsor" />;
}

export function SubmitScreen() {
  const slug = usePageSlug("Submit", "submit");
  return <WordPressPageScreen slug={slug} title="Submit" />;
}

export function GeneralInfoScreen() {
  const slug = usePageSlug("GeneralInfo", "general-information");
  return <WordPressPageScreen slug={slug} title="General Info" />;
}

export function SponsorshipsScreen() {
  const slug = usePageSlug("Sponsorships", "sponsorships");
  return <WordPressPageScreen slug={slug} title="Sponsorships" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  retryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  heading: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  h1: {
    ...Typography.h1,
  },
  h2: {
    ...Typography.h2,
  },
  h3: {
    ...Typography.h3,
  },
  h4: {
    ...Typography.h4,
  },
  paragraph: {
    marginBottom: Spacing.md,
  },
  bodyText: {
    ...Typography.body,
  },
  link: {
    textDecorationLine: "underline",
  },
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
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
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.lg,
    marginVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },
  blockquoteText: {
    fontStyle: "italic",
  },
  imageContainer: {
    marginVertical: Spacing.md,
  },
  image: {
    borderRadius: BorderRadius.sm,
  },
  imageCaption: {
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
});
