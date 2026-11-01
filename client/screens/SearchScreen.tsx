import React, {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Pressable,
  Keyboard,
} from "react-native";
import Animated from "react-native-reanimated";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { useTabBarScroll } from "@/hooks/useTabBarScroll";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ArticleCard } from "@/components/ArticleCard";
import { EmptyState } from "@/components/EmptyState";
import { SponsoredFeedCard } from "@/components/SponsoredFeedCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  Article,
  ArticleWithSource,
  getArticleAuthors,
  HomeStackParamList,
} from "@/types/article";
import { stripHtmlTags } from "@/lib/htmlUtils";
import { getPrimaryCategory } from "@/lib/articleUtils";
import { getArticleImageUrl } from "@/lib/imageUtils";
import {
  trackArticleImpression,
  trackArticleOpened,
  trackSearchPerformed,
} from "@/lib/analytics";
import {
  getArticleSearchRequests,
  rankArticleSearchResults,
} from "@/lib/searchArticles";
import { handleSearchBack } from "@/lib/searchNavigation";
import {
  type FeedItem,
  getFeedItemsWithSponsoredSlots,
  isSponsoredFeedAd,
} from "@/lib/articleAds";

type SearchScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "Search"
>;
type SearchScreenRouteProp = RouteProp<HomeStackParamList, "Search">;

const PER_PAGE = 10;
const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { publication } = usePublication();
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const route = useRoute<SearchScreenRouteProp>();
  const inputRef = useRef<TextInput>(null);
  const { onScroll, scrollEventThrottle } = useTabBarScroll();

  const handleBackPress = useCallback(() => {
    handleSearchBack(navigation, Keyboard.dismiss);
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: ({ tintColor, canGoBack, label }) => {
        if (!canGoBack) return null;

        const color = tintColor ?? theme.text;

        return (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handleBackPress}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Feather
              name="chevron-left"
              size={28}
              color={color}
              style={styles.backButtonIcon}
            />
            <ThemedText
              numberOfLines={1}
              style={[styles.backButtonText, { color }]}
            >
              {label ?? "Back"}
            </ThemedText>
          </Pressable>
        );
      },
    });
  }, [handleBackPress, navigation, theme.text]);

  const initialQuery = route.params?.initialQuery || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [articles, setArticles] = useState<(Article | ArticleWithSource)[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const trackedSearchImpressionsRef = useRef<Set<string>>(new Set());

  const spinnerColor = isDark ? "#999999" : "#666666";
  const inputBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.12)"
    : "rgba(0, 0, 0, 0.06)";
  const placeholderColor = isDark
    ? "rgba(255, 255, 255, 0.4)"
    : "rgba(0, 0, 0, 0.4)";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666666";

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setDebouncedQuery(searchQuery.trim());
      } else if (searchQuery.trim().length === 0) {
        setDebouncedQuery("");
        setArticles([]);
        setHasSearched(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchArticles = useCallback(
    async (query: string, pageNum: number) => {
      if (!query || query.length < 2) return;

      const requests = getArticleSearchRequests(
        publication,
        query,
        pageNum,
        PER_PAGE,
      );

      if (requests.length === 0) {
        if (pageNum === 1) {
          setArticles([]);
          setPage(1);
          setHasMore(false);
          setHasSearched(true);
          trackSearchPerformed({
            query,
            resultCount: 0,
            publication: publication.id,
          });
        }
        return;
      }

      try {
        if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const results = await Promise.all(
          requests.map(async (request) => {
            const response = await fetch(request.url, { cache: "no-store" });
            if (!response.ok) {
              if (response.status === 400) {
                return { articles: [], hasMore: false };
              }
              throw new Error(
                `Failed to fetch articles from ${request.publicationName}`,
              );
            }

            const data: Article[] = await response.json();
            const requestArticles =
              publication.id === "home"
                ? data.map((article) => ({
                    ...article,
                    publicationId: request.publicationId,
                    publicationName: request.publicationName,
                    publicationColor: request.publicationColor,
                  }))
                : data;

            return {
              articles: requestArticles,
              hasMore: data.length >= PER_PAGE,
            };
          }),
        );

        const data = rankArticleSearchResults(
          results.flatMap((result) => result.articles),
          query,
        );
        setHasMore(results.some((result) => result.hasMore));

        if (pageNum === 1) {
          setArticles(data);
          setPage(1);
          trackSearchPerformed({
            query,
            resultCount: data.length,
            publication: publication.id,
          });
        } else {
          setArticles((prev) => [...prev, ...data]);
        }
        setHasSearched(true);
      } catch (err) {
        console.error("Error searching articles:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [publication],
  );

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setPage(1);
      setHasMore(true);
      fetchArticles(debouncedQuery, 1);
    }
  }, [debouncedQuery, fetchArticles]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore && debouncedQuery.length >= 2) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchArticles(debouncedQuery, nextPage);
    }
  }, [loadingMore, loading, hasMore, page, debouncedQuery, fetchArticles]);

  const handleArticlePress = useCallback(
    (article: Article | ArticleWithSource) => {
      const publicationId =
        "publicationId" in article ? article.publicationId : undefined;
      const articleWithSource = article as ArticleWithSource;
      const sourceDetail = debouncedQuery;
      const analyticsPublication =
        articleWithSource.publicationName || publication.name;
      const title = stripHtmlTags(article.title?.rendered || "");

      trackArticleOpened({
        articleId: article.id,
        title,
        publication: analyticsPublication,
        source: "search",
        sourceDetail,
      });

      navigation.navigate("ArticleDetail", {
        article,
        publicationId,
        source: "search",
        sourceDetail,
      });
    },
    [debouncedQuery, navigation, publication.name],
  );

  const trackSearchResultImpression = useCallback(
    (article: Article | ArticleWithSource, position?: number) => {
      const articleWithSource = article as ArticleWithSource;
      const analyticsPublication =
        articleWithSource.publicationName || publication.name;
      const key = `${articleWithSource.publicationId || publication.id}:${
        article.id
      }:search:${debouncedQuery}`;

      if (trackedSearchImpressionsRef.current.has(key)) return;

      trackedSearchImpressionsRef.current.add(key);
      trackArticleImpression({
        articleId: article.id,
        title: stripHtmlTags(article.title?.rendered || ""),
        publication: analyticsPublication,
        source: "search",
        sourceDetail: debouncedQuery,
        position,
      });
    },
    [debouncedQuery, publication.id, publication.name],
  );

  const trackSearchResultImpressionRef = useRef(trackSearchResultImpression);

  useEffect(() => {
    trackSearchResultImpressionRef.current = trackSearchResultImpression;
  }, [trackSearchResultImpression]);

  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{
        item?: FeedItem<Article | ArticleWithSource>;
        index?: number | null;
      }>;
    }) => {
      viewableItems.forEach(({ item, index }) => {
        if (item && !isSponsoredFeedAd(item)) {
          trackSearchResultImpressionRef.current(item, index ?? undefined);
        }
      });
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 750,
  }).current;
  const displayItems = getFeedItemsWithSponsoredSlots(
    articles,
    "searchResults",
  );

  const renderArticle = useCallback(
    ({ item }: { item: FeedItem<Article | ArticleWithSource> }) => {
      if (isSponsoredFeedAd(item)) {
        return <SponsoredFeedCard item={item} />;
      }

      const headline = stripHtmlTags(item.title?.rendered || "");
      const excerpt = stripHtmlTags(item.excerpt?.rendered || "");
      const author = getArticleAuthors(item);
      const articleWithSource = item as ArticleWithSource;
      const publicationBadge = articleWithSource.publicationId
        ? {
            name: articleWithSource.publicationName,
            color: articleWithSource.publicationColor,
          }
        : undefined;
      const featuredImageUrl =
        item._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
      const imageUrl = getArticleImageUrl(
        featuredImageUrl,
        item.content?.rendered,
      );
      const category = getPrimaryCategory(item);

      return (
        <ArticleCard
          articleId={item.id}
          headline={headline}
          excerpt={excerpt}
          date={item.date || ""}
          author={author}
          imageUrl={imageUrl}
          onPress={() => handleArticlePress(item)}
          publicationBadge={publicationBadge}
          publicationId={articleWithSource.publicationId}
          content={item.content?.rendered}
          category={category || undefined}
          articleUrl={item.link}
        />
      );
    },
    [handleArticlePress],
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={spinnerColor} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    if (!hasSearched) {
      return (
        <EmptyState
          icon="search"
          title="Search for articles"
          description="Enter at least 2 characters to search"
        />
      );
    }
    return (
      <EmptyState
        icon="search"
        title="No results found"
        description="Try different keywords or browse by category."
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.searchBarContainer,
          { paddingTop: headerHeight + Spacing.sm },
        ]}
      >
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: inputBackgroundColor },
          ]}
        >
          <Feather
            name="search"
            size={18}
            color={placeholderColor}
            style={styles.inputIcon}
          />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text }]}
            placeholder="Search articles..."
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x-circle" size={18} color={placeholderColor} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={spinnerColor} />
        </View>
      ) : (
        <Animated.FlatList
          data={displayItems}
          renderItem={renderArticle}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item) =>
            isSponsoredFeedAd(item)
              ? `sponsored-${item.id}`
              : "publicationId" in item
                ? `${item.publicationId}-${item.id}`
                : item.id.toString()
          }
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + Spacing.xl },
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 40,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    maxWidth: 112,
    paddingRight: Spacing.sm,
  },
  backButtonPressed: {
    opacity: 0.55,
  },
  backButtonIcon: {
    marginLeft: -8,
    marginRight: -2,
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: "400",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
});
