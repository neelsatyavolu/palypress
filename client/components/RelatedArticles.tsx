import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ArticleCardCompact } from "@/components/ArticleCardCompact";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Article, getArticleAuthors } from "@/types/article";

interface RelatedArticlesProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
  title?: string;
}

export function RelatedArticles({
  articles,
  onArticlePress,
  title = "Read Next",
}: RelatedArticlesProps) {
  const { theme, isDark } = useTheme();

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? theme.backgroundSecondary
            : theme.backgroundDefault,
        },
      ]}
    >
      <ThemedText style={styles.title}>{title}</ThemedText>
      <View style={styles.articlesContainer}>
        {articles.map((article, index) => (
          <ArticleCardCompact
            key={article.id || index}
            headline={article.title?.rendered || ""}
            date={article.date || ""}
            author={getArticleAuthors(article)}
            imageUrl={article._embedded?.["wp:featuredmedia"]?.[0]?.source_url}
            onPress={() => onArticlePress(article)}
            content={article.content?.rendered}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing["3xl"],
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },
  articlesContainer: {
    gap: Spacing.sm,
  },
});
