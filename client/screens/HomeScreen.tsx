import React, {
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  AppState,
  Platform,
  Pressable,
  type AppStateStatus,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  useNavigation,
  useIsFocused,
  useScrollToTop,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFollows } from "@/contexts/FollowsContext";
import { useCategoriesForPublication } from "@/hooks/useCategoriesForPublication";
import {
  useUnifiedCategories,
  UnifiedCategory,
} from "@/hooks/useUnifiedCategories";
import { useUnifiedFeed } from "@/hooks/useUnifiedFeed";
import { getApiUrl as getServerApiUrl } from "@/lib/query-client";
import { useTabBarScroll } from "@/hooks/useTabBarScroll";
import { Spacing } from "@/constants/theme";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleCardFeatured } from "@/components/ArticleCardFeatured";
import { EmptyState } from "@/components/EmptyState";
import { SponsoredFeedCard } from "@/components/SponsoredFeedCard";
import { ThemedText } from "@/components/ThemedText";
import { DesktopShell } from "@/components/DesktopShell";
import { getPrimaryCategory } from "@/lib/articleUtils";
import {
  CategoryTabs,
  Category,
  DEFAULT_CATEGORY,
} from "@/components/CategoryTabs";
import { DrawerMenu } from "@/components/DrawerMenu";
import { AnimatedHeader } from "@/components/AnimatedHeader";
import ArchiveSearchScreen, {
  type ArchiveSearchScreenHandle,
} from "@/screens/ArchiveSearchScreen";
import {
  Article,
  ArticleWithSource,
  getArticleAuthors,
  HomeStackParamList,
} from "@/types/article";
import { getArticleImageUrl, getFeaturedImageUrl } from "@/lib/imageUtils";
import { ArticleCardSkeleton } from "@/components/SkeletonLoader";
import { haptics } from "@/lib/haptics";
import { trackArticleImpression, trackArticleOpened } from "@/lib/analytics";
import { stripHtmlTags } from "@/lib/htmlUtils";
import {
  filterVisibleHomeStories,
  getHomeStoryVisibilityKey,
  HOME_STORY_READ_PROGRESS_STORAGE_KEY,
  HIDDEN_HOME_STORIES_STORAGE_KEY,
  parseHomeStoryReadProgress,
  prioritizeHomeStoriesByReadProgress,
  type HomeStoryReadProgressByKey,
} from "@/lib/homeStoryVisibility";
import {
  type FeedItem,
  getFeedItemsWithSponsoredSlots,
  isSponsoredFeedAd,
} from "@/lib/articleAds";
import { HOME_FEED_BOTTOM_GUTTER } from "@/lib/articleCardLayout";
import { cacheArticle, pruneRecent } from "@/lib/offlineStore";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "Home"
>;

const PER_PAGE = 10;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { publication, isHomeSelected } = usePublication();
  const { isAuthenticated } = useAuth();
  const { followedPublicationIds } = useFollows();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { categories: pubCategories, loading: pubCategoriesLoading } =
    useCategoriesForPublication();
  const { categories: unifiedCategories, loading: unifiedCategoriesLoading } =
    useUnifiedCategories();

  // Use unified or publication-specific categories based on selection
  const categories = isHomeSelected ? unifiedCategories : pubCategories;
  const categoriesLoading = isHomeSelected
    ? unifiedCategoriesLoading
    : pubCategoriesLoading;

  const getWordPressApiUrl = useCallback(
    (page: number, categoryId: number | null, cacheBuster?: number) => {
      const baseUrl = `${publication.apiBaseUrl}/posts?_embed&per_page=${PER_PAGE}&page=${page}`;
      const withCategory = categoryId
        ? `${baseUrl}&categories=${categoryId}`
        : baseUrl;
      return cacheBuster !== undefined
        ? `${withCategory}&_=${cacheBuster}`
        : withCategory;
    },
    [publication.apiBaseUrl],
  );

  const getExternalFeedUrl = useCallback(
    (page: number) => {
      const url = new URL(
        `/api/publications/${publication.id}/feed`,
        getServerApiUrl(),
      );
      url.searchParams.set("per_page", PER_PAGE.toString());
      url.searchParams.set("offset", ((page - 1) * PER_PAGE).toString());
      return url.toString();
    },
    [publication.id],
  );

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<
    Category | UnifiedCategory
  >(DEFAULT_CATEGORY);
  const [feedMode, setFeedMode] = useState<"all" | "forYou">("all");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [hiddenStoryKeys, setHiddenStoryKeys] = useState<Set<string>>(
    new Set(),
  );
  const [hiddenStoryKeysLoaded, setHiddenStoryKeysLoaded] = useState(false);
  const [readProgressByStoryKey, setReadProgressByStoryKey] =
    useState<HomeStoryReadProgressByKey>({});
  const trackedFeedImpressionsRef = useRef<Set<string>>(new Set());
  const archiveSearchRef = useRef<ArchiveSearchScreenHandle>(null);
  const feedListRef =
    useRef<React.ComponentRef<typeof Animated.FlatList>>(null);
  const webFeedScrollRef =
    useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);

  useScrollToTop(
    useRef({
      scrollToTop: () => {
        feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
        webFeedScrollRef.current?.scrollTo({ y: 0, animated: true });
      },
    }),
  );

  // Unified feed hook (only used when isHomeSelected)
  const {
    articles: unifiedArticles,
    loading: unifiedLoading,
    loadingMore: unifiedLoadingMore,
    error: unifiedError,
    hasMore: unifiedHasMore,
    refetch: unifiedRefetch,
    loadMore: unifiedLoadMore,
  } = useUnifiedFeed({
    category: isHomeSelected ? (selectedCategory as UnifiedCategory) : null,
    publicationIds:
      isHomeSelected && feedMode === "forYou" && followedPublicationIds.size > 0
        ? Array.from(followedPublicationIds)
        : undefined,
  });

  // Cache the newest feed articles for offline reading once the unified feed loads
  useEffect(() => {
    if (!unifiedArticles.length) return;
    (async () => {
      for (const a of unifiedArticles.slice(0, 15)) {
        await cacheArticle(a, "recent");
      }
      await pruneRecent(15);
    })();
  }, [unifiedArticles]);

  // Tab bar scroll animation
  const tabBarScroll = useTabBarScroll();

  const spinnerColor = isDark ? "#999999" : "#666666";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#4A4A4A";
  const isWeb = Platform.OS === "web";
  const feedBottomPadding =
    tabBarHeight + insets.bottom + HOME_FEED_BOTTOM_GUTTER;
  const selectedPublicationHasFeed =
    isHomeSelected ||
    Boolean(publication.apiBaseUrl || publication.externalFeedType);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, // Hide default header to use our custom AnimatedHeader
    });
  }, [navigation]);

  useEffect(() => {
    let isActive = true;

    const loadHiddenStoryKeys = async () => {
      try {
        const stored = await AsyncStorage.getItem(
          HIDDEN_HOME_STORIES_STORAGE_KEY,
        );
        if (!isActive) return;

        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setHiddenStoryKeys(
              new Set(
                parsed.filter((key): key is string => typeof key === "string"),
              ),
            );
          }
        }
      } catch (err) {
        console.error("Failed to load hidden homepage stories:", err);
      } finally {
        if (isActive) {
          setHiddenStoryKeysLoaded(true);
        }
      }
    };

    loadHiddenStoryKeys();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!hiddenStoryKeysLoaded) return;

    AsyncStorage.setItem(
      HIDDEN_HOME_STORIES_STORAGE_KEY,
      JSON.stringify(Array.from(hiddenStoryKeys)),
    ).catch((err) => {
      console.error("Failed to save hidden homepage stories:", err);
    });
  }, [hiddenStoryKeys, hiddenStoryKeysLoaded]);

  useEffect(() => {
    if (!isFocused) return;

    let isActive = true;

    const loadReadProgress = async () => {
      try {
        const stored = await AsyncStorage.getItem(
          HOME_STORY_READ_PROGRESS_STORAGE_KEY,
        );
        if (!isActive) return;

        setReadProgressByStoryKey(parseHomeStoryReadProgress(stored));
      } catch (err) {
        console.error("Failed to load homepage story progress:", err);
      }
    };

    loadReadProgress();

    return () => {
      isActive = false;
    };
  }, [isFocused]);

  const handleDrawerNavigate = (route: string) => {
    const validRoutes = [
      "Staff",
      "AllStaff",
      "About",
      "Policies",
      "ContactUs",
      "Corrections",
      "Archives",
      "Advertising",
      "Sponsor",
      "Submit",
      "GeneralInfo",
      "Sponsorships",
    ];
    if (validRoutes.includes(route)) {
      (navigation as any).navigate(route);
    }
  };

  const fetchArticles = useCallback(
    async (pageNum: number, categoryId: number | null, isRefresh = false) => {
      if (!publication.apiBaseUrl && !publication.externalFeedType) {
        setArticles([]);
        setHasMore(false);
        setError(null);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const cacheBuster = pageNum === 1 ? Date.now() : undefined;
        const requestUrl = publication.apiBaseUrl
          ? getWordPressApiUrl(pageNum, categoryId, cacheBuster)
          : getExternalFeedUrl(pageNum);
        const response = await fetch(requestUrl, { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 400) {
            setHasMore(false);
            return;
          }
          throw new Error("Failed to fetch articles");
        }
        const payload = await response.json();
        const data: Article[] = Array.isArray(payload)
          ? payload
          : payload.articles || [];
        const externalHasMore =
          !Array.isArray(payload) && Boolean(payload.hasMore);

        if (publication.externalFeedType) {
          setHasMore(externalHasMore);
        } else if (data.length < PER_PAGE) {
          setHasMore(false);
        }

        if (isRefresh || pageNum === 1) {
          setArticles(data);
          setPage(1);
          setHasMore(
            publication.externalFeedType
              ? externalHasMore
              : data.length >= PER_PAGE,
          );
        } else {
          setArticles((prev) => [...prev, ...data]);
        }
      } catch (err) {
        if (pageNum === 1) {
          setError("Unable to load articles. Pull to refresh.");
        }
        console.error("Error fetching articles:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [
      getWordPressApiUrl,
      getExternalFeedUrl,
      publication.apiBaseUrl,
      publication.externalFeedType,
    ],
  );

  // Refetch when category changes (only for single publication mode)
  useEffect(() => {
    if (!isHomeSelected) {
      fetchArticles(1, selectedCategory.id);
    }
  }, [selectedCategory.id, fetchArticles, isHomeSelected]);

  // Refetch when publication changes - reset to "All" category
  useEffect(() => {
    setArticles([]);
    setPage(1);
    setHasMore(true);
    setSelectedCategory(DEFAULT_CATEGORY);
    // Only fetch for single publication mode
    // Unified feed mode handles its own fetching via useUnifiedFeed hook
    if (!isHomeSelected) {
      fetchArticles(1, null); // Fetch all articles (no category filter)
    }
  }, [publication.id, isHomeSelected, fetchArticles]);

  // Refresh feed when app returns to foreground while this screen is focused
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState !== "active" || !isFocused) return;

        if (isHomeSelected) {
          unifiedRefetch();
        } else {
          setPage(1);
          setHasMore(true);
          fetchArticles(1, selectedCategory.id, true);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [
    isFocused,
    isHomeSelected,
    unifiedRefetch,
    fetchArticles,
    selectedCategory.id,
  ]);

  const handleLoadMore = useCallback(() => {
    console.log("[HomeScreen] handleLoadMore called", {
      loadingMore,
      loading,
      hasMore,
      page,
      articlesCount: articles.length,
    });
    if (selectedPublicationHasFeed && !loadingMore && !loading && hasMore) {
      const nextPage = page + 1;
      console.log("[HomeScreen] Loading page:", nextPage);
      setPage(nextPage);
      fetchArticles(nextPage, selectedCategory.id);
    } else {
      console.log("[HomeScreen] Load more blocked:", {
        loadingMore,
        loading,
        hasMore,
      });
    }
  }, [
    loadingMore,
    loading,
    hasMore,
    page,
    selectedCategory.id,
    fetchArticles,
    articles.length,
    selectedPublicationHasFeed,
  ]);

  const handleRefresh = useCallback(() => {
    if (!selectedPublicationHasFeed) {
      return;
    }
    setPage(1);
    setHasMore(true);
    fetchArticles(1, selectedCategory.id, true);
  }, [selectedCategory.id, fetchArticles, selectedPublicationHasFeed]);

  const handleCategoryChange = useCallback(
    (category: Category) => {
      if (category.slug !== selectedCategory.slug) {
        setSelectedCategory(category);
        setArticles([]);
        setPage(1);
        setHasMore(true);
      }
    },
    [selectedCategory.slug],
  );

  // Handlers for unified feed mode - must be defined before early returns
  const handleLoadMoreUnified = useCallback(() => {
    console.log("[HomeScreen] handleLoadMoreUnified called", {
      isHomeSelected,
      unifiedLoadingMore,
      unifiedLoading,
      unifiedHasMore,
      articlesCount: unifiedArticles.length,
    });
    if (
      isHomeSelected &&
      !unifiedLoadingMore &&
      !unifiedLoading &&
      unifiedHasMore
    ) {
      console.log("[HomeScreen] Calling unifiedLoadMore");
      unifiedLoadMore();
    } else {
      console.log("[HomeScreen] Unified load more blocked");
    }
  }, [
    isHomeSelected,
    unifiedLoadingMore,
    unifiedLoading,
    unifiedHasMore,
    unifiedLoadMore,
    unifiedArticles.length,
  ]);

  const handleRefreshUnified = useCallback(() => {
    if (isHomeSelected) {
      unifiedRefetch();
    }
  }, [isHomeSelected, unifiedRefetch]);

  const getArticleAnalyticsMetadata = useCallback(
    (article: Article | ArticleWithSource) => {
      const articleWithSource = article as ArticleWithSource;
      const sourcePublicationId =
        articleWithSource.publicationId || publication.id;
      const sourcePublicationName =
        articleWithSource.publicationName || publication.name;
      const sourceDetail = `${isHomeSelected ? "home" : publication.id}:${
        selectedCategory.slug
      }`;

      return {
        key: `${sourcePublicationId}:${article.id}:home_feed:${sourceDetail}`,
        title: stripHtmlTags(article.title?.rendered || ""),
        publication: sourcePublicationName,
        sourceDetail,
      };
    },
    [isHomeSelected, publication.id, publication.name, selectedCategory.slug],
  );

  const trackFeedArticleImpression = useCallback(
    (article: Article | ArticleWithSource, position?: number) => {
      const metadata = getArticleAnalyticsMetadata(article);
      if (trackedFeedImpressionsRef.current.has(metadata.key)) return;

      trackedFeedImpressionsRef.current.add(metadata.key);
      trackArticleImpression({
        articleId: article.id,
        title: metadata.title,
        publication: metadata.publication,
        source: "home_feed",
        sourceDetail: metadata.sourceDetail,
        position,
      });
    },
    [getArticleAnalyticsMetadata],
  );
  const trackFeedArticleImpressionRef = useRef(trackFeedArticleImpression);

  useEffect(() => {
    trackFeedArticleImpressionRef.current = trackFeedArticleImpression;
  }, [trackFeedArticleImpression]);

  const handleCardPress = (article: Article | ArticleWithSource) => {
    const metadata = getArticleAnalyticsMetadata(article);
    trackArticleOpened({
      articleId: article.id,
      title: metadata.title,
      publication: metadata.publication,
      source: "home_feed",
      sourceDetail: metadata.sourceDetail,
    });

    if (article.externalProvider && article.link) {
      Linking.openURL(article.link);
      return;
    }

    // If viewing unified feed, pass the publication ID so ArticleDetail knows which publication to use
    const publicationId =
      "publicationId" in article ? article.publicationId : undefined;
    navigation.navigate("ArticleDetail", {
      article,
      publicationId,
      source: "home_feed",
      sourceDetail: metadata.sourceDetail,
    });
  };

  const handleHideStory = useCallback(
    (article: Article | ArticleWithSource) => {
      const key = getHomeStoryVisibilityKey(article, publication.id);

      haptics.medium();
      setHiddenStoryKeys((prev) => {
        if (prev.has(key)) {
          return prev;
        }

        const next = new Set(prev);
        next.add(key);
        return next;
      });
    },
    [publication.id],
  );

  const renderArticle = ({
    item,
    index,
  }: {
    item: FeedItem<Article | ArticleWithSource>;
    index: number;
  }) => {
    if (isSponsoredFeedAd(item)) {
      return (
        <View style={styles.articleWrapper}>
          <SponsoredFeedCard item={item} />
        </View>
      );
    }

    const headline = item.title.rendered;
    const excerpt = item.excerpt.rendered;
    const date = item.date;
    const featuredImageUrl = getFeaturedImageUrl(item);
    const imageUrl = getArticleImageUrl(
      featuredImageUrl,
      item.content?.rendered,
      item.link,
    );

    // Check if this is an article with source (from unified feed)
    const articleWithSource = item as ArticleWithSource;
    const author = item.externalProvider
      ? articleWithSource.publicationName || publication.shortName
      : getArticleAuthors(item);
    const publicationBadge = articleWithSource.publicationId
      ? {
          name: articleWithSource.publicationName,
          color: articleWithSource.publicationColor,
        }
      : undefined;

    // Extract category for pills
    const category = getPrimaryCategory(item);

    // Use featured card for first article on mobile/tablet only.
    if (index === 0) {
      return (
        <View style={styles.articleWrapper}>
          <ArticleCardFeatured
            articleId={item.id}
            headline={headline}
            excerpt={excerpt}
            date={date}
            author={author}
            imageUrl={imageUrl}
            onPress={() => handleCardPress(item)}
            onLongPress={() => handleHideStory(item)}
            content={item.content?.rendered}
            category={category || undefined}
            articleUrl={item.link}
            publicationBadge={publicationBadge}
            publicationId={articleWithSource.publicationId}
          />
        </View>
      );
    }

    return (
      <View style={styles.articleWrapper}>
        <ArticleCard
          articleId={item.id}
          headline={headline}
          excerpt={excerpt}
          date={date}
          author={author}
          imageUrl={imageUrl}
          onPress={() => handleCardPress(item)}
          onLongPress={() => handleHideStory(item)}
          publicationBadge={publicationBadge}
          publicationId={articleWithSource.publicationId}
          content={item.content?.rendered}
          category={category || undefined}
          articleUrl={item.link}
        />
      </View>
    );
  };

  // Determine which data source to use
  const sourceArticles: (Article | ArticleWithSource)[] = isHomeSelected
    ? unifiedArticles
    : articles;
  const visibleArticles = filterVisibleHomeStories(
    sourceArticles,
    hiddenStoryKeys,
    publication.id,
  );
  const displayArticles =
    isHomeSelected && selectedCategory.slug === DEFAULT_CATEGORY.slug
      ? prioritizeHomeStoriesByReadProgress(
          visibleArticles,
          readProgressByStoryKey,
          publication.id,
        )
      : visibleArticles;
  const displayItems = getFeedItemsWithSponsoredSlots(
    displayArticles,
    "homeFeed",
  );

  useEffect(() => {
    if (!isWeb) return;
    displayArticles
      .slice(0, 12)
      .forEach((article, index) => trackFeedArticleImpression(article, index));
  }, [displayArticles, isWeb, trackFeedArticleImpression]);

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
          trackFeedArticleImpressionRef.current(item, index ?? undefined);
        }
      });
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 750,
  }).current;

  const isLoading = isHomeSelected ? unifiedLoading : loading;
  const isLoadingMore = isHomeSelected ? unifiedLoadingMore : loadingMore;
  const displayError = isHomeSelected ? unifiedError : error;
  const emptyStateTitle = selectedPublicationHasFeed
    ? "No articles yet"
    : "No article feed";
  const emptyStateDescription = selectedPublicationHasFeed
    ? "New articles will appear here when published."
    : "This publication is included in PALY Press, but it does not currently publish through a WordPress article feed.";

  const showFeedModeToggle =
    isHomeSelected && isAuthenticated && followedPublicationIds.size > 0;

  const renderHeader = () => (
    <Animated.View
      style={styles.headerContainer}
      layout={LinearTransition.springify().damping(18).stiffness(140)}
    >
      {showFeedModeToggle && (
        <View style={styles.feedModeContainer}>
          <Pressable
            onPress={() => setFeedMode("forYou")}
            accessibilityRole="button"
            accessibilityState={{ selected: feedMode === "forYou" }}
            accessibilityLabel="Show For You feed"
            style={[
              styles.feedModeTab,
              feedMode === "forYou"
                ? {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.15)"
                      : "rgba(0, 0, 0, 0.08)",
                  }
                : null,
            ]}
          >
            <ThemedText
              style={[
                styles.feedModeText,
                feedMode === "forYou" ? null : { color: secondaryTextColor },
              ]}
            >
              For You
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setFeedMode("all")}
            accessibilityRole="button"
            accessibilityState={{ selected: feedMode === "all" }}
            accessibilityLabel="Show all publications"
            style={[
              styles.feedModeTab,
              feedMode === "all"
                ? {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.15)"
                      : "rgba(0, 0, 0, 0.08)",
                  }
                : null,
            ]}
          >
            <ThemedText
              style={[
                styles.feedModeText,
                feedMode === "all" ? null : { color: secondaryTextColor },
              ]}
            >
              All
            </ThemedText>
          </Pressable>
        </View>
      )}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
        loading={categoriesLoading}
        centerOnWeb={isWeb}
      />
    </Animated.View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={spinnerColor} />
      </View>
    );
  };

  if (publication.id === "archive") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <ArchiveSearchScreen ref={archiveSearchRef} />
        <DrawerMenu
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          onNavigate={handleDrawerNavigate}
        />
        <AnimatedHeader
          onMenuPress={() => setDrawerVisible(true)}
          onSearchPress={() => archiveSearchRef.current?.focusSearch()}
        />
      </View>
    );
  }

  const getWebArticleKey = (item: FeedItem<Article | ArticleWithSource>) => {
    if (isSponsoredFeedAd(item)) return `sponsored-${item.id}`;

    const articleWithSource = item as ArticleWithSource;
    return articleWithSource.publicationId
      ? `${articleWithSource.publicationId}-${item.id}`
      : item.id.toString();
  };

  const webTopRowArticles = displayItems.slice(0, 2);
  const webGridArticles = displayItems.slice(2);

  if (isLoading && displayArticles.length === 0) {
    if (isWeb) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
          <DesktopShell maxWidth={null}>
            <Animated.ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingTop: 49 + insets.top + Spacing.sm,
                paddingBottom: feedBottomPadding,
              }}
              showsVerticalScrollIndicator={false}
            >
              {renderHeader()}
              <View style={styles.webGridRow}>
                {Array.from({ length: 3 }).map((_, col) => (
                  <View
                    key={`loading-column-${col}`}
                    style={styles.webGridItem}
                  >
                    {[1, 2, 3].map((item) => (
                      <ArticleCardSkeleton
                        key={`loading-${col}-${item}`}
                        showBadge={isHomeSelected}
                        delay={(col * 3 + item) * 55}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </Animated.ScrollView>
          </DesktopShell>

          <DrawerMenu
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            onNavigate={handleDrawerNavigate}
          />
          <AnimatedHeader
            onMenuPress={() => setDrawerVisible(true)}
            onSearchPress={() => navigation.navigate("Search")}
          />
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <DesktopShell maxWidth={null}>
          <Animated.ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingTop: 49 + insets.top + Spacing.sm,
              paddingBottom: feedBottomPadding,
              paddingHorizontal: Spacing.lg,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <ArticleCardSkeleton
                key={i}
                showBadge={isHomeSelected}
                delay={(i - 1) * 50}
              />
            ))}
          </Animated.ScrollView>
        </DesktopShell>

        <DrawerMenu
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          onNavigate={handleDrawerNavigate}
        />
        <AnimatedHeader
          onMenuPress={() => setDrawerVisible(true)}
          onSearchPress={() => navigation.navigate("Search")}
        />
      </View>
    );
  }

  if (displayError && displayArticles.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ThemedText style={[styles.errorText, { color: secondaryTextColor }]}>
          {displayError}
        </ThemedText>
      </View>
    );
  }

  const renderWebArticle = (
    item: FeedItem<Article | ArticleWithSource>,
    index: number,
    useFeatured = false,
  ) => {
    if (isSponsoredFeedAd(item)) {
      return (
        <Animated.View
          key={getWebArticleKey(item)}
          entering={FadeInUp.delay(Math.min(index * 35, 350)).duration(420)}
          layout={LinearTransition.springify().damping(18).stiffness(140)}
          style={styles.webCardContainer}
        >
          <SponsoredFeedCard item={item} />
        </Animated.View>
      );
    }

    const headline = item.title.rendered;
    const excerpt = item.excerpt.rendered;
    const date = item.date;
    const featuredImageUrl = getFeaturedImageUrl(item);
    const imageUrl = getArticleImageUrl(
      featuredImageUrl,
      item.content?.rendered,
      item.link,
    );
    const articleWithSource = item as ArticleWithSource;
    const author = item.externalProvider
      ? articleWithSource.publicationName || publication.shortName
      : getArticleAuthors(item);
    const publicationBadge = articleWithSource.publicationId
      ? {
          name: articleWithSource.publicationName,
          color: articleWithSource.publicationColor,
        }
      : undefined;
    const category = getPrimaryCategory(item);

    const baseShadow = isDark
      ? "0 1px 2px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)";
    const hoverShadow = isDark
      ? "0 8px 24px rgba(0,0,0,0.4)"
      : "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)";

    return (
      <Animated.View
        key={getWebArticleKey(item)}
        entering={FadeInUp.delay(Math.min(index * 35, 350)).duration(420)}
        layout={LinearTransition.springify().damping(18).stiffness(140)}
        style={[
          styles.webCardContainer,
          {
            // @ts-ignore web-only
            borderRadius: 14,
            transition: "all 0.25s ease",
            transform: [{ translateY: 0 }],
          },
        ]}
      >
        {useFeatured ? (
          <ArticleCardFeatured
            articleId={item.id}
            headline={headline}
            excerpt={excerpt}
            date={date}
            author={author}
            imageUrl={imageUrl}
            onPress={() => handleCardPress(item)}
            onLongPress={() => handleHideStory(item)}
            content={item.content?.rendered}
            category={category || undefined}
            articleUrl={item.link}
            publicationBadge={publicationBadge}
            publicationId={articleWithSource.publicationId}
          />
        ) : (
          <ArticleCard
            articleId={item.id}
            headline={headline}
            excerpt={excerpt}
            date={date}
            author={author}
            imageUrl={imageUrl}
            onPress={() => handleCardPress(item)}
            onLongPress={() => handleHideStory(item)}
            publicationBadge={publicationBadge}
            publicationId={articleWithSource.publicationId}
            content={item.content?.rendered}
            category={category || undefined}
            articleUrl={item.link}
          />
        )}
      </Animated.View>
    );
  };

  const renderWebFeed = () => (
    <DesktopShell maxWidth={null}>
      <Animated.ScrollView
        key={`web-feed-${isHomeSelected ? "home" : publication.id}-${selectedCategory.slug}`}
        ref={webFeedScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 49 + insets.top + Spacing.sm,
          paddingBottom: feedBottomPadding,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isHomeSelected ? unifiedLoading : refreshing}
            onRefresh={isHomeSelected ? handleRefreshUnified : handleRefresh}
            tintColor={spinnerColor}
          />
        }
        onScroll={tabBarScroll.onScroll}
        scrollEventThrottle={tabBarScroll.scrollEventThrottle}
      >
        {renderHeader()}
        {webTopRowArticles.length > 0 ? (
          <View style={styles.webTopRow}>
            {webTopRowArticles.map((item, index) => (
              <View key={getWebArticleKey(item)} style={styles.webTopRowItem}>
                {renderWebArticle(item, index, true)}
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.webGridRow}>
          {webGridArticles.map((item, index) => (
            <View key={getWebArticleKey(item)} style={styles.webGridItem}>
              {renderWebArticle(item, index + 2)}
            </View>
          ))}
        </View>

        {displayArticles.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={emptyStateTitle}
            description={emptyStateDescription}
          />
        ) : null}

        {isLoadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={spinnerColor} />
          </View>
        ) : null}

        {(isHomeSelected ? unifiedHasMore : hasMore) ? (
          <View style={styles.webLoadMoreContainer}>
            <div
              onClick={isHomeSelected ? handleLoadMoreUnified : handleLoadMore}
              style={{
                paddingLeft: 32,
                paddingRight: 32,
                paddingTop: 12,
                paddingBottom: 12,
                borderRadius: 12,
                cursor: "pointer",
                userSelect: "none" as any,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
                boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = isDark
                  ? "rgba(255,255,255,0.08)"
                  : "#F8F9FA";
                (e.currentTarget as HTMLElement).style.borderColor = isDark
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = isDark
                  ? "rgba(255,255,255,0.04)"
                  : "#FFFFFF";
                (e.currentTarget as HTMLElement).style.borderColor = isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)";
              }}
            >
              <Feather
                name="arrow-down"
                size={15}
                color={isDark ? "#0A84FF" : "#007AFF"}
              />
              <ThemedText style={styles.webLoadMoreText}>Load More</ThemedText>
            </div>
          </View>
        ) : null}
      </Animated.ScrollView>
    </DesktopShell>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      {isWeb ? (
        renderWebFeed()
      ) : (
        <DesktopShell maxWidth={null}>
          <Animated.FlatList
            ref={feedListRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingTop: 49 + insets.top + Spacing.sm, // Custom header height + safe area
              paddingBottom: feedBottomPadding,
            }}
            scrollIndicatorInsets={{ bottom: insets.bottom }}
            data={displayItems}
            keyExtractor={(item) => {
              if (isSponsoredFeedAd(item)) return `sponsored-${item.id}`;

              const articleWithSource = item as ArticleWithSource;
              // Use composite key for unified feed to avoid ID collisions
              if (articleWithSource.publicationId) {
                return `${articleWithSource.publicationId}-${item.id}`;
              }
              return item.id.toString();
            }}
            renderItem={renderArticle}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            refreshControl={
              <RefreshControl
                refreshing={isHomeSelected ? unifiedLoading : refreshing}
                onRefresh={
                  isHomeSelected ? handleRefreshUnified : handleRefresh
                }
                tintColor={spinnerColor}
              />
            }
            onScroll={tabBarScroll.onScroll}
            scrollEventThrottle={tabBarScroll.scrollEventThrottle}
            onEndReached={() => {
              console.log(
                "[HomeScreen] onEndReached fired, isHomeSelected:",
                isHomeSelected,
              );
              if (isHomeSelected) {
                handleLoadMoreUnified();
              } else {
                handleLoadMore();
              }
            }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <EmptyState
                icon="inbox"
                title={emptyStateTitle}
                description={emptyStateDescription}
              />
            }
            stickyHeaderIndices={[0]}
          />
        </DesktopShell>
      )}
      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={handleDrawerNavigate}
      />
      <AnimatedHeader
        onMenuPress={() => setDrawerVisible(true)}
        onSearchPress={() => navigation.navigate("Search")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContainer: {
    marginBottom: Spacing.sm,
  },
  feedModeContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  feedModeTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
  },
  feedModeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  articleWrapper: {
    paddingHorizontal: Spacing.lg,
  },
  webTopRow: {
    flexDirection: "row",
    columnGap: 24,
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  webTopRowItem: {
    flex: 1,
    minWidth: 0,
  },
  webGridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 24,
    columnGap: 24,
    paddingHorizontal: 32,
  },
  webGridItem: {
    width: "31%",
    minWidth: 0,
  },
  webCardContainer: {
    width: "100%",
  },
  webLoadMoreContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  webLoadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing["4xl"],
  },
  emptyText: {
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
});
