import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { DesktopShell } from "@/components/DesktopShell";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import type { HomeStackParamList } from "@/types/article";
import type { ArchiveArticle } from "@/types/archive";

type ArchiveArticleDetailRouteProp = RouteProp<
  HomeStackParamList,
  "ArchiveArticleDetail"
>;

export default function ArchiveArticleDetailScreen() {
  const route = useRoute<ArchiveArticleDetailRouteProp>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const [article, setArticle] = useState<ArchiveArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const archiveId = route.params.archiveId;
  const bodyColor = isDark ? "rgba(255,255,255,0.86)" : "#2E2E2E";
  const secondaryTextColor = isDark ? "rgba(255,255,255,0.58)" : "#666666";

  useEffect(() => {
    let cancelled = false;

    async function fetchArticle() {
      setLoading(true);
      setError(null);

      try {
        const url = new URL(
          `/api/archive/articles/${encodeURIComponent(archiveId)}`,
          getApiUrl(),
        );
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load archive article");
        }
        const data: ArchiveArticle = await response.json();
        if (!cancelled) {
          setArticle(data);
        }
      } catch (err) {
        console.error("Failed to load archive article:", err);
        if (!cancelled) {
          setError("Unable to load this archive article.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchArticle();

    return () => {
      cancelled = true;
    };
  }, [archiveId]);

  const openUrl = useCallback((url?: string | null) => {
    if (url) {
      Linking.openURL(url);
    }
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.link} />
      </ThemedView>
    );
  }

  if (error || !article) {
    return (
      <ThemedView style={styles.centerContainer}>
        <Feather name="alert-circle" size={32} color={secondaryTextColor} />
        <ThemedText style={[styles.centerText, { color: secondaryTextColor }]}>
          {error || "This archive article could not be loaded."}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <DesktopShell>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <ThemedText style={styles.archiveLabel}>
          Paly Journalism Archive
        </ThemedText>
        <ThemedText style={styles.title}>{article.title}</ThemedText>
        <ThemedText style={[styles.issueTitle, { color: secondaryTextColor }]}>
          {article.issueTitle}
        </ThemedText>

        <View style={[styles.notice, { borderColor: theme.border }]}>
          <Feather name="info" size={16} color={secondaryTextColor} />
          <ThemedText
            style={[styles.noticeText, { color: secondaryTextColor }]}
          >
            Archive text is generated from OCR and may contain transcription
            errors.
          </ThemedText>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.link }]}
            onPress={() => openUrl(article.originalUrl)}
          >
            <Feather name="external-link" size={16} color="#FFFFFF" />
            <ThemedText style={styles.actionButtonText}>
              View Original
            </ThemedText>
          </Pressable>
          {article.pdfUrl ? (
            <Pressable
              style={[
                styles.secondaryButton,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundDefault,
                },
              ]}
              onPress={() => openUrl(article.pdfUrl)}
            >
              <Feather name="file-text" size={16} color={theme.text} />
              <ThemedText style={styles.secondaryButtonText}>
                Issue PDF
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.bodyContainer}>
          {article.paragraphs.map((paragraph, index) => (
            <ThemedText
              key={`${article.id}-paragraph-${index}`}
              style={[styles.body, { color: bodyColor }]}
            >
              {paragraph}
            </ThemedText>
          ))}
        </View>
      </ScrollView>
    </DesktopShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  centerText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  archiveLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: 0,
  },
  issueTitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.md,
    letterSpacing: 0,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    marginTop: Spacing.xl,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
  },
  secondaryButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
  },
  bodyContainer: {
    marginTop: Spacing["2xl"],
  },
  body: {
    fontSize: 18,
    lineHeight: 30,
    fontFamily: Fonts.serif,
    marginBottom: Spacing.lg,
    letterSpacing: 0,
  },
});
