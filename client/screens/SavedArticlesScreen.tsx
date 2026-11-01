import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import Animated from "react-native-reanimated";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  useNavigation,
  NavigationProp,
  useFocusEffect,
} from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { useSavedArticles } from "@/contexts/SavedArticlesContext";
import { useTabBarScroll } from "@/hooks/useTabBarScroll";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SwipeableArticleCard } from "@/components/SwipeableArticleCard";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatDate } from "@/lib/htmlUtils";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import type { Article } from "@/types/article";

interface SavedArticle {
  userId: string;
  articleId: number;
  articleTitle: string;
  articleExcerpt: string | null;
  articleAuthor: string | null;
  articleDate: string | null;
  articleImageUrl: string | null;
  savedAt: string;
}

export default function SavedArticlesScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { unsaveArticle } = useSavedArticles();
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { onScroll, scrollEventThrottle } = useTabBarScroll();

  const { data, isLoading, refetch } = useQuery<{ articles: SavedArticle[] }>({
    queryKey: ["/api/articles/saved"],
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const articles = data?.articles || [];

  const cardBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666";

  const [loadingArticleId, setLoadingArticleId] = useState<number | null>(null);

  const handleUnsave = async (articleId: number, e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    await unsaveArticle(articleId);
    refetch();
  };

  const handleArticlePress = async (item: SavedArticle) => {
    try {
      setLoadingArticleId(item.articleId);
      const response = await fetch(
        `https://palyvoice.com/wp-json/wp/v2/posts/${item.articleId}?_embed`,
      );
      if (response.ok) {
        const article: Article = await response.json();
        navigation.navigate("SavedArticleDetail", { article });
      }
    } catch (error) {
      console.error("Failed to fetch article:", error);
    } finally {
      setLoadingArticleId(null);
    }
  };

  const renderArticle = ({ item }: { item: SavedArticle }) => (
    <SwipeableArticleCard
      articleId={item.articleId}
      articleTitle={item.articleTitle}
      articleAuthor={item.articleAuthor}
      articleDate={item.articleDate}
      articleImageUrl={item.articleImageUrl}
      onPress={() => handleArticlePress(item)}
      onDelete={() => handleUnsave(item.articleId)}
    />
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.loadingContainer,
            { paddingTop: headerHeight + Spacing.xl },
          ]}
        >
          <ActivityIndicator size="large" color={isDark ? "#999" : "#666"} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Animated.FlatList
        data={articles}
        keyExtractor={(item) => item.articleId.toString()}
        renderItem={renderArticle}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <EmptyState
            icon="bookmark"
            title="No saved articles"
            description="Tap the bookmark icon on articles to save them for later."
          />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  articleCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  articleContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  articleImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xs,
    marginRight: Spacing.md,
  },
  articleInfo: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  articleMeta: {
    fontSize: 12,
  },
  unsaveButton: {
    padding: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  bookmarkContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkFill: {
    position: "absolute",
    width: 10,
    height: 12,
    top: 4,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});
