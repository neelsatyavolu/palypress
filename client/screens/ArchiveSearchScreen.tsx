import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ArchiveResultCard } from "@/components/ArchiveResultCard";
import {
  CategoryTabs,
  type Category,
  DEFAULT_CATEGORY,
} from "@/components/CategoryTabs";
import { DesktopShell } from "@/components/DesktopShell";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTabBarScroll } from "@/hooks/useTabBarScroll";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import type { HomeStackParamList } from "@/types/article";
import type {
  ArchiveSearchResponse,
  ArchiveSearchResult,
} from "@/types/archive";
import { ARCHIVE_PUBLICATIONS } from "@shared/archive";

const PER_PAGE = 20;
const DEBOUNCE_MS = 300;

type ArchivePublicationTab = Category & {
  publicationCode: string | null;
};

const ALL_ARCHIVE_PUBLICATIONS_TAB: ArchivePublicationTab = {
  ...DEFAULT_CATEGORY,
  publicationCode: null,
};

const ARCHIVE_PUBLICATION_TABS: ArchivePublicationTab[] = [
  ALL_ARCHIVE_PUBLICATIONS_TAB,
  ...ARCHIVE_PUBLICATIONS.map((publication, index) => ({
    id: index + 1,
    name: publication.shortName,
    slug: publication.id,
    publicationCode: publication.code,
  })),
];

export interface ArchiveSearchScreenHandle {
  focusSearch: () => void;
}

type ArchiveSearchNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "Home"
>;

const ArchiveSearchScreen = forwardRef<ArchiveSearchScreenHandle>(
  function ArchiveSearchScreen(_props, ref) {
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const { theme, isDark } = useTheme();
    const navigation = useNavigation<ArchiveSearchNavigationProp>();
    const inputRef = useRef<TextInput>(null);
    const { onScroll, scrollEventThrottle } = useTabBarScroll();

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ArchiveSearchResult[]>(
      [],
    );
    const [searchTotal, setSearchTotal] = useState(0);
    const [searchPage, setSearchPage] = useState(1);
    const [searchHasMore, setSearchHasMore] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchLoadingMore, setSearchLoadingMore] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedArchivePublication, setSelectedArchivePublication] =
      useState<ArchivePublicationTab>(ALL_ARCHIVE_PUBLICATIONS_TAB);
    const [browseResults, setBrowseResults] = useState<ArchiveSearchResult[]>(
      [],
    );
    const [browseTotal, setBrowseTotal] = useState(0);
    const [browsePage, setBrowsePage] = useState(1);
    const [browseHasMore, setBrowseHasMore] = useState(false);
    const [browseLoading, setBrowseLoading] = useState(true);
    const [browseLoadingMore, setBrowseLoadingMore] = useState(false);
    const [browseError, setBrowseError] = useState<string | null>(null);

    const spinnerColor = isDark ? "#999999" : "#666666";
    const inputBackgroundColor = isDark
      ? "rgba(255,255,255,0.12)"
      : "rgba(0,0,0,0.06)";
    const placeholderColor = isDark
      ? "rgba(255,255,255,0.42)"
      : "rgba(0,0,0,0.42)";
    const secondaryTextColor = isDark ? "rgba(255,255,255,0.6)" : "#666666";

    useImperativeHandle(ref, () => ({
      focusSearch: () => {
        inputRef.current?.focus();
      },
    }));

    useEffect(() => {
      const timer = setTimeout(() => {
        const trimmed = searchQuery.trim();
        if (trimmed.length >= 2) {
          setDebouncedQuery(trimmed);
        } else {
          setDebouncedQuery("");
          setSearchResults([]);
          setSearchTotal(0);
          setSearchHasMore(false);
          setHasSearched(false);
          setSearchError(null);
        }
      }, DEBOUNCE_MS);

      return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchArchiveResults = useCallback(
      async (query: string, nextPage: number) => {
        if (query.length < 2) return;

        try {
          if (nextPage === 1) {
            setSearchLoading(true);
          } else {
            setSearchLoadingMore(true);
          }
          setSearchError(null);

          const url = new URL("/api/archive/search", getApiUrl());
          url.searchParams.set("q", query);
          url.searchParams.set("page", nextPage.toString());
          url.searchParams.set("per_page", PER_PAGE.toString());

          const response = await fetch(url.toString(), { cache: "no-store" });
          if (!response.ok) {
            throw new Error("Failed to search archive");
          }

          const data: ArchiveSearchResponse = await response.json();
          setSearchTotal(data.total);
          setSearchHasMore(data.hasMore);
          setHasSearched(true);
          setSearchPage(nextPage);
          setSearchResults((previous) =>
            nextPage === 1 ? data.results : [...previous, ...data.results],
          );
        } catch (err) {
          console.error("Failed to search archive:", err);
          setSearchError("Unable to search the archive. Please try again.");
          if (nextPage === 1) {
            setSearchResults([]);
            setSearchTotal(0);
          }
        } finally {
          setSearchLoading(false);
          setSearchLoadingMore(false);
        }
      },
      [],
    );

    useEffect(() => {
      if (debouncedQuery.length >= 2) {
        fetchArchiveResults(debouncedQuery, 1);
      }
    }, [debouncedQuery, fetchArchiveResults]);

    const fetchArchiveBrowseResults = useCallback(
      async (publicationCode: string | null, nextPage: number) => {
        try {
          if (nextPage === 1) {
            setBrowseLoading(true);
          } else {
            setBrowseLoadingMore(true);
          }
          setBrowseError(null);

          const url = new URL("/api/archive/browse", getApiUrl());
          if (publicationCode) {
            url.searchParams.set("publication", publicationCode);
          }
          url.searchParams.set("page", nextPage.toString());
          url.searchParams.set("per_page", PER_PAGE.toString());

          const response = await fetch(url.toString(), { cache: "no-store" });
          if (!response.ok) {
            throw new Error("Failed to browse archive");
          }

          const data: ArchiveSearchResponse = await response.json();
          setBrowseTotal(data.total);
          setBrowseHasMore(data.hasMore);
          setBrowsePage(nextPage);
          setBrowseResults((previous) =>
            nextPage === 1 ? data.results : [...previous, ...data.results],
          );
        } catch (err) {
          console.error("Failed to browse archive:", err);
          setBrowseError("Unable to load the archive. Please try again.");
          if (nextPage === 1) {
            setBrowseResults([]);
            setBrowseTotal(0);
          }
        } finally {
          setBrowseLoading(false);
          setBrowseLoadingMore(false);
        }
      },
      [],
    );

    useEffect(() => {
      fetchArchiveBrowseResults(selectedArchivePublication.publicationCode, 1);
    }, [fetchArchiveBrowseResults, selectedArchivePublication.publicationCode]);

    const isSearchMode = debouncedQuery.length >= 2;
    const displayResults = isSearchMode ? searchResults : browseResults;
    const displayTotal = isSearchMode ? searchTotal : browseTotal;
    const displayLoading = isSearchMode ? searchLoading : browseLoading;
    const displayLoadingMore = isSearchMode
      ? searchLoadingMore
      : browseLoadingMore;
    const displayError = isSearchMode ? searchError : browseError;

    const handleLoadMore = useCallback(() => {
      if (isSearchMode) {
        if (
          !searchLoading &&
          !searchLoadingMore &&
          searchHasMore &&
          debouncedQuery.length >= 2
        ) {
          fetchArchiveResults(debouncedQuery, searchPage + 1);
        }
        return;
      }

      if (!browseLoading && !browseLoadingMore && browseHasMore) {
        fetchArchiveBrowseResults(
          selectedArchivePublication.publicationCode,
          browsePage + 1,
        );
      }
    }, [
      browseHasMore,
      browseLoading,
      browseLoadingMore,
      browsePage,
      debouncedQuery,
      fetchArchiveBrowseResults,
      fetchArchiveResults,
      isSearchMode,
      searchHasMore,
      searchLoading,
      searchLoadingMore,
      searchPage,
      selectedArchivePublication.publicationCode,
    ]);

    const handleArchivePublicationChange = useCallback((category: Category) => {
      const nextPublication = ARCHIVE_PUBLICATION_TABS.find(
        (publication) => publication.slug === category.slug,
      );
      if (!nextPublication) return;

      setSelectedArchivePublication(nextPublication);
      setBrowseResults([]);
      setBrowsePage(1);
      setBrowseHasMore(false);
    }, []);

    const handleResultPress = useCallback(
      (result: ArchiveSearchResult) => {
        navigation.navigate("ArchiveArticleDetail", {
          archiveId: result.id,
          sourceDetail: isSearchMode
            ? debouncedQuery
            : `archive:${selectedArchivePublication.slug}`,
        });
      },
      [
        debouncedQuery,
        isSearchMode,
        navigation,
        selectedArchivePublication.slug,
      ],
    );

    const renderResult = useCallback(
      ({ item }: { item: ArchiveSearchResult }) => (
        <ArchiveResultCard
          result={item}
          onPress={() => handleResultPress(item)}
        />
      ),
      [handleResultPress],
    );

    const renderEmpty = () => {
      if (displayLoading) return null;
      if (displayError) {
        return (
          <EmptyState
            icon="alert-circle"
            title={isSearchMode ? "Archive search failed" : "Archive failed"}
            description={displayError}
          />
        );
      }
      if (isSearchMode && !hasSearched) {
        return (
          <EmptyState
            icon="archive"
            title="Search the archive"
            description="Search over 120 years of Paly journalism."
          />
        );
      }
      if (!isSearchMode) {
        return (
          <EmptyState
            icon="archive"
            title="No archive entries"
            description="Try another archive publication."
          />
        );
      }
      return (
        <EmptyState
          icon="search"
          title="No archive results"
          description="Try different keywords."
        />
      );
    };

    const renderArchiveTabs = () => {
      if (isSearchMode) return null;

      return (
        <View style={styles.tabsContainer}>
          <CategoryTabs
            categories={ARCHIVE_PUBLICATION_TABS}
            selectedCategory={selectedArchivePublication}
            onSelectCategory={handleArchivePublicationChange}
          />
        </View>
      );
    };

    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <DesktopShell maxWidth={null}>
          <View
            style={[
              styles.searchBarContainer,
              !isSearchMode ? styles.browseSearchBarContainer : null,
              { paddingTop: 49 + insets.top + Spacing.lg },
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
                placeholder="Search the archive..."
                placeholderTextColor={placeholderColor}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Feather name="x-circle" size={18} color={placeholderColor} />
                </Pressable>
              ) : null}
            </View>
            {isSearchMode && hasSearched && !searchLoading ? (
              <ThemedText
                style={[styles.resultCount, { color: secondaryTextColor }]}
              >
                {displayTotal.toLocaleString()} archive results
              </ThemedText>
            ) : null}
            {!isSearchMode && !browseLoading && !browseError ? (
              <ThemedText
                style={[styles.resultCount, { color: secondaryTextColor }]}
              >
                {displayTotal.toLocaleString()} archive entries - newest first
              </ThemedText>
            ) : null}
          </View>

          {displayLoading && displayResults.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={spinnerColor} />
            </View>
          ) : (
            <Animated.FlatList
              data={displayResults}
              renderItem={renderResult}
              keyExtractor={(item) => item.id}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              contentContainerStyle={[
                isSearchMode
                  ? styles.searchListContent
                  : styles.browseListContent,
                { paddingBottom: tabBarHeight + Spacing.xl },
              ]}
              ListHeaderComponent={renderArchiveTabs}
              ListEmptyComponent={renderEmpty}
              ListFooterComponent={
                displayLoadingMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={spinnerColor} />
                  </View>
                ) : null
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}
        </DesktopShell>
      </View>
    );
  },
);

export default ArchiveSearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  browseSearchBarContainer: {
    paddingBottom: 0,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 42,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    letterSpacing: 0,
  },
  resultCount: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.sm,
    letterSpacing: 0,
  },
  searchListContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  browseListContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 0,
  },
  tabsContainer: {
    marginHorizontal: -Spacing.lg,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
});
