import React from "react";
import {
  View,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { useTabBarScroll } from "@/hooks/useTabBarScroll";

import { ThemedText } from "@/components/ThemedText";
import { ArticleCard } from "@/components/ArticleCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useCivicFeed } from "@/hooks/useCivicFeed";
import { Spacing } from "@/constants/theme";
import { ArticleWithSource, getArticleAuthors } from "@/types/article";
import { getFeaturedImageUrl, getArticleImageUrl } from "@/lib/imageUtils";
import { getPrimaryCategory } from "@/lib/articleUtils";
import type { CivicStackParamList } from "@/navigation/CivicStackNavigator";

type CivicScreenNavigationProp = NativeStackNavigationProp<
  CivicStackParamList,
  "Civic"
>;

export default function CivicScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<CivicScreenNavigationProp>();
  const { articles, loading, loadingMore, hasMore, refetch, loadMore } =
    useCivicFeed();
  const tabBarScroll = useTabBarScroll();

  const handleCardPress = (article: ArticleWithSource) => {
    navigation.navigate("ArticleDetail", {
      article,
      publicationId: article.publicationId,
    });
  };

  const renderHeader = () => (
    <View
      style={[styles.headerContainer, { paddingTop: insets.top + Spacing.md }]}
    >
      <ThemedText type="h2" accessibilityRole="header" style={styles.title}>
        Local News
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
        Coverage of government, elections, and community from Paly's newsrooms
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Animated.FlatList
        data={articles}
        onScroll={tabBarScroll.onScroll}
        scrollEventThrottle={tabBarScroll.scrollEventThrottle}
        keyExtractor={(item) => `${item.publicationId}-${item.id}`}
        renderItem={({ item }) => {
          const featuredImageUrl = getFeaturedImageUrl(item);
          const imageUrl = getArticleImageUrl(
            featuredImageUrl,
            item.content?.rendered,
            item.link,
          );
          const author = item.externalProvider
            ? item.publicationName
            : getArticleAuthors(item);
          const category = getPrimaryCategory(item);

          return (
            <View style={styles.articleWrapper}>
              <ArticleCard
                articleId={item.id}
                headline={item.title.rendered}
                excerpt={item.excerpt.rendered}
                date={item.date}
                author={author}
                imageUrl={imageUrl}
                onPress={() => handleCardPress(item)}
                publicationBadge={{
                  name: item.publicationName,
                  color: item.publicationColor,
                }}
                publicationId={item.publicationId}
                content={item.content?.rendered}
                category={category || undefined}
                articleUrl={item.link}
              />
            </View>
          );
        }}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator
              style={styles.loadingIndicator}
              color={theme.primary}
            />
          ) : (
            <EmptyState
              icon="flag"
              title="No local stories yet"
              description="Check back soon for coverage of government, elections, and community."
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              style={styles.loadingIndicator}
              color={theme.primary}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        onEndReached={() => {
          if (hasMore && !loadingMore) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {},
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  articleWrapper: {
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  loadingIndicator: {
    marginVertical: Spacing.xl,
  },
});
