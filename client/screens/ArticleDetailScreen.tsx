import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Dimensions,
  Linking,
  Share,
  Text,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import {
  useRoute,
  useNavigation,
  CommonActions,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { useTabBarScrollContext } from "@/contexts/TabBarScrollContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedArticles } from "@/contexts/SavedArticlesContext";
import { usePublication } from "@/contexts/PublicationContext";
import { useReaderPreferences } from "@/contexts/ReaderPreferencesContext";
import { getPublicationById } from "@/constants/publications";
import { Spacing, BorderRadius, Fonts } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { DesktopShell } from "@/components/DesktopShell";
import { ContributorCard } from "@/components/ContributorCard";
import { CommentsSection } from "@/components/CommentsSection";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { ArticleProgressBar } from "@/components/ArticleProgressBar";
import { ReaderSettingsPanel } from "@/components/ReaderSettingsPanel";
import { ImageLightbox } from "@/components/ImageLightbox";
import { PullQuote } from "@/components/PullQuote";
import { PublicationAdSlot } from "@/components/PublicationAdSlot";
import { RelatedArticles } from "@/components/RelatedArticles";
import { stripHtmlTags, formatDate } from "@/lib/htmlUtils";
import { parseWordPressHtml, type ParsedElement } from "@/lib/htmlParser";
import {
  getArticleContentWithAdSlots,
  SPONSORED_AD,
  type SnoAdConfig,
} from "@/lib/articleAds";
import { getApiUrl } from "@/lib/config";
import { fetchInFocusVideoUrl } from "@/lib/videoUtils";
import { getArticleImageUrl } from "@/lib/imageUtils";
import {
  getArticlePublicationId,
  getRelatedArticlesUrl,
} from "@/lib/relatedArticles";
import {
  trackArticleViewed,
  trackArticleSaved,
  trackArticleUnsaved,
  trackArticleEngagement,
  trackArticleOpened,
  trackArticleReadCompleted,
} from "@/lib/analytics";
import {
  hasCompletedArticle,
  type ArticleTrafficSource,
} from "@/lib/analyticsEvents";
import {
  getHomeStoryVisibilityKey,
  HOME_STORY_READ_PROGRESS_PRIORITY_THRESHOLD,
  HOME_STORY_READ_PROGRESS_STORAGE_KEY,
  parseHomeStoryReadProgress,
} from "@/lib/homeStoryVisibility";
import {
  Article,
  StaffProfile,
  HomeStackParamList,
  getArticleAuthorTerms,
  AuthorTerm,
} from "@/types/article";

type ArticleDetailNavigationProp =
  NativeStackNavigationProp<HomeStackParamList>;

/**
 * Deduplicate staff profiles when the same person has profiles for multiple years.
 * For each author ID, keep only the staff profile with the most recent year.
 */
function deduplicateStaffProfiles(
  staffProfiles: StaffProfile[],
  authorIds: number[],
): StaffProfile[] {
  // Map: authorId -> best staff profile for that author
  const bestProfileByAuthor = new Map<number, StaffProfile>();

  for (const staff of staffProfiles) {
    // Find which author IDs this staff profile matches
    const matchingAuthorIds = staff.staff_name.filter((id) =>
      authorIds.includes(id),
    );

    // Get the max year ID for this profile (higher ID = more recent)
    const maxYearId = Math.max(...staff.staff_year, 0);

    for (const authorId of matchingAuthorIds) {
      const existing = bestProfileByAuthor.get(authorId);
      if (!existing) {
        bestProfileByAuthor.set(authorId, staff);
      } else {
        // Compare years - keep the one with higher year ID (more recent)
        const existingMaxYear = Math.max(...existing.staff_year, 0);
        if (maxYearId > existingMaxYear) {
          bestProfileByAuthor.set(authorId, staff);
        }
      }
    }
  }

  // Return unique profiles (a single profile might be best for multiple authors)
  const uniqueProfiles = new Map<number, StaffProfile>();
  for (const profile of bestProfileByAuthor.values()) {
    uniqueProfiles.set(profile.id, profile);
  }

  return Array.from(uniqueProfiles.values());
}

interface RouteParams {
  article?: Article;
  articleId?: number | string;
  publicationId?: string;
  source?: ArticleTrafficSource;
  sourceDetail?: string;
}

/** Time an article must stay on screen before it counts as a view. */
const ARTICLE_VIEW_DWELL_MS = 2000;

export default function ArticleDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { isArticleSaved, saveArticle, unsaveArticle } = useSavedArticles();
  const { publication: contextPublication } = usePublication();
  const route = useRoute();
  const navigation = useNavigation<ArticleDetailNavigationProp>();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [contributors, setContributors] = useState<StaffProfile[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // Reader settings and progress bar
  const [showReaderSettings, setShowReaderSettings] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const scrollY = useSharedValue(0);
  const tabBar = useTabBarScrollContext();
  const { preferences } = useReaderPreferences();
  const articleStartedAtRef = useRef(Date.now());
  const maxScrollDepthRef = useRef(0);
  const completionTrackedRef = useRef(false);
  const screenOpenTrackedRef = useRef<string | null>(null);
  const articleAnalyticsMetadataRef = useRef<{
    title?: string;
    publication?: string;
    source: ArticleTrafficSource;
    sourceDetail?: string;
  }>({ source: "unknown" });

  // Image lightbox
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<
    { uri: string; caption?: string }[]
  >([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Related articles
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const params = (route.params ?? {}) as RouteParams;
  const [hydratedArticle, setHydratedArticle] = useState<Article | null>(
    params.article ?? null,
  );
  const [loadingArticle, setLoadingArticle] = useState(false);
  // undefined = not yet detected (fall back to static config);
  // null = detected that this article has no ad; object = detected ad.
  const [detectedSnoAd, setDetectedSnoAd] = useState<
    SnoAdConfig | null | undefined
  >(undefined);

  const routeArticleId =
    typeof params.articleId === "string"
      ? parseInt(params.articleId, 10)
      : params.articleId;
  const article = params.article ?? hydratedArticle ?? undefined;
  const publicationId = getArticlePublicationId(article, params.publicationId);

  // Use the article's publication if provided (from unified feed), otherwise use context publication
  const publication = publicationId
    ? getPublicationById(publicationId) || contextPublication
    : contextPublication;
  const articleId = article?.id ?? routeArticleId;
  const isSaved = articleId ? isArticleSaved(articleId) : false;
  const persistHomeStoryReadProgress = useCallback(
    (maxScrollDepth: number) => {
      if (
        !articleId ||
        maxScrollDepth <= HOME_STORY_READ_PROGRESS_PRIORITY_THRESHOLD
      ) {
        return;
      }

      const storyKey = getHomeStoryVisibilityKey(
        { id: articleId, publicationId: publication.id },
        publication.id,
      );

      AsyncStorage.getItem(HOME_STORY_READ_PROGRESS_STORAGE_KEY)
        .then((stored) => {
          const nextProgress = parseHomeStoryReadProgress(stored);
          if ((nextProgress[storyKey] ?? 0) >= maxScrollDepth) {
            return;
          }

          nextProgress[storyKey] = maxScrollDepth;
          return AsyncStorage.setItem(
            HOME_STORY_READ_PROGRESS_STORAGE_KEY,
            JSON.stringify(nextProgress),
          );
        })
        .catch((error) => {
          console.error("Failed to save homepage story progress:", error);
        });
    },
    [articleId, publication.id],
  );
  const routeName = String((route as { name?: string }).name ?? "");
  const trafficSource: ArticleTrafficSource =
    params.source ??
    (routeName === "StaffArticleDetail"
      ? "staff_article"
      : routeName === "SavedArticleDetail"
        ? "saved_article"
        : !params.article && routeArticleId
          ? "deep_link"
          : "unknown");
  const trafficSourceDetail = params.sourceDetail;

  const headline = stripHtmlTags(article?.title?.rendered || "");
  const parsedArticleContent = article?.content?.rendered
    ? parseWordPressHtml(article.content.rendered)
    : [];
  // Prefer the ad spot auto-detected from the article page; if detection
  // hasn't resolved (or failed), fall back to the publication's static config.
  const activeSnoAd =
    detectedSnoAd === undefined ? publication.snoAds : (detectedSnoAd ?? undefined);
  const parsedContent = getArticleContentWithAdSlots(
    parsedArticleContent,
    activeSnoAd,
  );
  const formattedDate = formatDate(article?.date || "");
  const authorTerms = article ? getArticleAuthorTerms(article) : [];
  const featuredImageUrl =
    article?._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  const imageUrl = getArticleImageUrl(
    featuredImageUrl,
    article?.content?.rendered,
  );
  const isInFocus = publication.id === "infocus";

  const bodyColor = isDark ? "rgba(255, 255, 255, 0.85)" : "#333333";
  const bylineColor = isDark ? "rgba(255, 255, 255, 0.5)" : "#9E9E9E";
  const publicationPillBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : `${publication.primaryColor}12`;
  const publicationPillBorderColor = isDark
    ? "rgba(255, 255, 255, 0.28)"
    : publication.primaryColor;
  const publicationPillTextColor = isDark
    ? theme.text
    : publication.primaryColor;

  useEffect(() => {
    articleAnalyticsMetadataRef.current = {
      title: headline || undefined,
      publication: publication?.name,
      source: trafficSource,
      sourceDetail: trafficSourceDetail,
    };
  }, [headline, publication?.name, trafficSource, trafficSourceDetail]);

  useEffect(() => {
    if (!articleId) return;
    if (
      trafficSource === "home_feed" ||
      trafficSource === "search" ||
      trafficSource === "related_article"
    ) {
      return;
    }

    const key = `${articleId}:${trafficSource}:${trafficSourceDetail ?? ""}`;
    if (screenOpenTrackedRef.current === key) return;

    screenOpenTrackedRef.current = key;
    trackArticleOpened({
      articleId,
      title: headline || undefined,
      publication: publication?.name,
      source: trafficSource,
      sourceDetail: trafficSourceDetail,
    });
  }, [
    articleId,
    headline,
    publication?.name,
    trafficSource,
    trafficSourceDetail,
  ]);

  // Count an article as "viewed" only after it has been on screen for 2s,
  // filtering out accidental taps. Fires once per article.
  useEffect(() => {
    if (!articleId) return;
    const timer = setTimeout(() => {
      trackArticleViewed({
        articleId,
        title: headline || undefined,
        publication: publication?.name,
        source: trafficSource,
        sourceDetail: trafficSourceDetail,
      });
    }, ARTICLE_VIEW_DWELL_MS);
    return () => clearTimeout(timer);
  }, [
    articleId,
    headline,
    publication?.name,
    trafficSource,
    trafficSourceDetail,
  ]);

  useEffect(() => {
    if (!articleId) return;

    articleStartedAtRef.current = Date.now();
    maxScrollDepthRef.current = 0;
    completionTrackedRef.current = false;

    return () => {
      const durationSeconds = (Date.now() - articleStartedAtRef.current) / 1000;
      const maxScrollDepth = maxScrollDepthRef.current;
      const completed = hasCompletedArticle({
        maxScrollDepth,
        durationSeconds,
      });

      persistHomeStoryReadProgress(maxScrollDepth);
      trackArticleEngagement({
        articleId,
        title: articleAnalyticsMetadataRef.current.title,
        publication: articleAnalyticsMetadataRef.current.publication,
        source: articleAnalyticsMetadataRef.current.source,
        sourceDetail: articleAnalyticsMetadataRef.current.sourceDetail,
        durationSeconds,
        maxScrollDepth,
        completed,
      });
    };
  }, [articleId, persistHomeStoryReadProgress]);

  useEffect(() => {
    if (params.article) {
      setHydratedArticle(params.article);
      return;
    }

    if (
      !routeArticleId ||
      Number.isNaN(routeArticleId) ||
      !publication?.apiBaseUrl
    ) {
      setHydratedArticle(null);
      return;
    }

    let cancelled = false;
    setLoadingArticle(true);

    fetch(`${publication.apiBaseUrl}/posts/${routeArticleId}?_embed`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch article");
        }
        return response.json() as Promise<Article>;
      })
      .then((data) => {
        if (!cancelled) {
          setHydratedArticle(data);
        }
      })
      .catch((error) => {
        console.error("Failed to load article from URL params:", error);
        if (!cancelled) {
          setHydratedArticle(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingArticle(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params.article, routeArticleId, publication?.apiBaseUrl]);

  // Auto-detect the publication's in-content ad spot from the article page.
  useEffect(() => {
    const link = article?.link;
    if (!link) {
      setDetectedSnoAd(undefined);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const requestUrl = new URL(
          `/api/sno-ad-slot?url=${encodeURIComponent(link)}`,
          getApiUrl(),
        ).toString();
        const response = await fetch(requestUrl);
        if (!response.ok) {
          throw new Error(`Ad slot request failed: ${response.status}`);
        }
        const data = (await response.json()) as {
          adSlot: {
            spotId: string;
            clientId: string;
            paragraphOffset: number;
          } | null;
        };
        if (cancelled) return;
        setDetectedSnoAd(
          data.adSlot
            ? {
                clientId: data.adSlot.clientId,
                inContentSpotId: data.adSlot.spotId,
                paragraphOffset: data.adSlot.paragraphOffset,
              }
            : null,
        );
      } catch (error) {
        console.error("Failed to detect publication ad slot:", error);
        if (!cancelled) setDetectedSnoAd(undefined);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [article?.link]);

  useEffect(() => {
    if (isInFocus && article?.link) {
      setLoadingVideo(true);
      fetchInFocusVideoUrl(article.link)
        .then(setVideoId)
        .finally(() => setLoadingVideo(false));
    }
  }, [article?.id, article?.link, isInFocus]);

  useEffect(() => {
    if (authorTerms.length === 0) return;

    const fetchContributors = async () => {
      setLoadingContributors(true);
      setContributors([]);
      try {
        const authorIds = authorTerms.map((a) => a.id);
        let allMatchedStaff: StaffProfile[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const staffUrl = `${publication.apiBaseUrl}/staff_profile?_embed&per_page=100&page=${page}`;
          const response = await fetch(staffUrl);
          if (!response.ok) {
            if (response.status === 400) {
              hasMore = false;
              break;
            }
            throw new Error("Failed to fetch staff");
          }
          const staffPage: StaffProfile[] = await response.json();

          if (staffPage.length === 0) {
            hasMore = false;
          } else {
            const matchedStaff = staffPage.filter((staff) =>
              staff.staff_name.some((nameId) => authorIds.includes(nameId)),
            );
            allMatchedStaff = [...allMatchedStaff, ...matchedStaff];

            const allAuthorsFound = authorIds.every((authorId) =>
              allMatchedStaff.some((staff) =>
                staff.staff_name.includes(authorId),
              ),
            );
            if (allAuthorsFound) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }

        // Deduplicate staff profiles: if the same person has profiles for multiple years,
        // keep only the most recent one (highest year ID)
        const deduplicatedStaff = deduplicateStaffProfiles(
          allMatchedStaff,
          authorIds,
        );
        setContributors(deduplicatedStaff);
      } catch (err) {
        console.error("Error fetching contributors:", err);
      } finally {
        setLoadingContributors(false);
      }
    };

    fetchContributors();
  }, [article?.id]);

  const handleAuthorPress = (author: AuthorTerm) => {
    const staff = contributors.find((s) => s.staff_name.includes(author.id));
    if (staff) {
      navigation.push("StaffDetail", { staff, publicationId });
    }
  };

  const handleContributorPress = (staff: StaffProfile) => {
    navigation.push("StaffDetail", { staff, publicationId });
  };

  const handleSignIn = () => {
    setShowSignInModal(false);
    navigation.dispatch(
      CommonActions.navigate({
        name: "ProfileTab",
      }),
    );
  };

  const handleOpenInBrowser = () => {
    if (article?.link) {
      Linking.openURL(article.link);
    }
  };

  const handleSharePress = async () => {
    if (!article?.link) return;
    try {
      await Share.share({
        message: `${headline} — ${article.link}`,
        url: article.link,
        title: headline,
      });
    } catch {
      // Share sheet dismissed or unavailable — nothing to do.
    }
  };

  const handleSavePress = async () => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    if (!articleId) return;

    if (isSaved) {
      await unsaveArticle(articleId);
      trackArticleUnsaved({
        articleId,
        title: headline,
        publication: publication.name,
      });
    } else {
      await saveArticle({
        articleId,
        articleTitle: headline,
        articleExcerpt: stripHtmlTags(article?.excerpt?.rendered || ""),
        articleAuthor:
          authorTerms.map((a) => a.name).join(", ") || publication.name,
        articleDate: article?.date,
        articleImageUrl: imageUrl,
        fullArticle: article
          ? {
              ...article,
              publicationId: publication.id,
              publicationName: publication.name,
              publicationColor: publication.primaryColor,
            }
          : undefined,
      });
      trackArticleSaved({
        articleId,
        title: headline,
        publication: publication.name,
      });
    }
  };

  const updateArticleScrollDepth = useCallback(
    (depth: number) => {
      if (!articleId || depth <= maxScrollDepthRef.current) return;

      maxScrollDepthRef.current = depth;

      const durationSeconds = (Date.now() - articleStartedAtRef.current) / 1000;
      const completed = hasCompletedArticle({
        maxScrollDepth: depth,
        durationSeconds,
      });

      if (!completed || completionTrackedRef.current) return;

      completionTrackedRef.current = true;
      trackArticleReadCompleted({
        articleId,
        title: headline || undefined,
        publication: publication?.name,
        source: trafficSource,
        sourceDetail: trafficSourceDetail,
        durationSeconds,
        maxScrollDepth: depth,
        completed: true,
      });
    },
    [
      articleId,
      headline,
      publication?.name,
      trafficSource,
      trafficSourceDetail,
    ],
  );

  // Scroll handler for progress bar + bottom tab bar minimization
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      tabBar.scrollY.value = event.contentOffset.y;
      tabBar.isScrolling.value = true;
      const rawDepth =
        event.contentSize.height <= 0
          ? 0
          : ((event.contentOffset.y + event.layoutMeasurement.height) /
              event.contentSize.height) *
            100;
      const depth = Math.max(0, Math.min(100, Math.round(rawDepth)));
      runOnJS(updateArticleScrollDepth)(depth);
    },
    onEndDrag: () => {
      tabBar.isScrolling.value = false;
    },
    onMomentumEnd: () => {
      tabBar.isScrolling.value = false;
    },
  });

  // Add Share, Save, and "Aa" reader-settings buttons to the header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: ({ tintColor }) => (
        <View style={styles.headerActions}>
          {article?.link ? (
            <Pressable
              accessibilityLabel="Share article"
              accessibilityRole="button"
              onPress={handleSharePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.readerSettingsButtonPressed,
              ]}
            >
              <Feather name="share" size={20} color={tintColor ?? theme.text} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={isSaved ? "Unsave article" : "Save article"}
            accessibilityRole="button"
            onPress={handleSavePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.readerSettingsButtonPressed,
            ]}
          >
            <Feather
              name="bookmark"
              size={20}
              color={isSaved ? "#EF4444" : (tintColor ?? theme.text)}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Reader settings"
            accessibilityRole="button"
            onPress={() => setShowReaderSettings(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [
              styles.readerSettingsButton,
              pressed && styles.readerSettingsButtonPressed,
            ]}
          >
            <ThemedText
              style={[
                styles.readerSettingsButtonText,
                { color: tintColor ?? theme.text },
              ]}
            >
              Aa
            </ThemedText>
          </Pressable>
        </View>
      ),
    });
  }, [
    navigation,
    theme.text,
    isSaved,
    isAuthenticated,
    articleId,
    article?.link,
    headline,
  ]);

  // Fetch related articles
  useEffect(() => {
    const fetchRelatedArticles = async () => {
      if (!article) {
        setRelatedArticles([]);
        return;
      }

      try {
        setLoadingRelated(true);
        const relatedUrl = getRelatedArticlesUrl(article, publication);
        if (!relatedUrl) {
          setRelatedArticles([]);
          return;
        }

        const response = await fetch(relatedUrl);
        if (response.ok) {
          const data = await response.json();
          setRelatedArticles(data);
        }
      } catch (error) {
        console.error("Failed to fetch related articles:", error);
      } finally {
        setLoadingRelated(false);
      }
    };

    fetchRelatedArticles();
  }, [article?.id, publication.apiBaseUrl]);

  // Image press handler for lightbox
  const handleImagePress = useCallback(
    (imageUri: string, caption?: string) => {
      const images = parsedContent
        .filter((el) => el.type === "image" && el.src)
        .map((el) => ({ uri: el.src!, caption: el.alt }));

      const index = images.findIndex((img) => img.uri === imageUri);
      setLightboxImages(images);
      setLightboxIndex(index >= 0 ? index : 0);
      setLightboxVisible(true);
    },
    [parsedContent],
  );

  // Get screen width for image sizing
  const screenWidth = Dimensions.get("window").width;
  const imageWidth = screenWidth - Spacing.lg * 2;

  // Render inline elements (bold, italic, links, etc.)
  const renderInlineElement = (element: ParsedElement, index: number) => {
    switch (element.type) {
      case "text":
        return <Text key={index}>{element.content}</Text>;

      case "bold":
        return (
          <Text key={index} style={{ fontWeight: "600" }}>
            {element.content}
          </Text>
        );

      case "italic":
        return (
          <Text key={index} style={{ fontStyle: "italic" }}>
            {element.content}
          </Text>
        );

      case "link":
        return (
          <Text
            key={index}
            style={[styles.link, { color: publication?.primaryColor }]}
            onPress={() => element.href && Linking.openURL(element.href)}
          >
            {element.content}
          </Text>
        );

      case "break":
        return <Text key={index}>{"\n"}</Text>;

      default:
        return null;
    }
  };

  // Render block-level elements (paragraphs, images, galleries, etc.)
  const renderElement = (
    element: ParsedElement,
    index: number,
  ): React.ReactNode => {
    switch (element.type) {
      case "paragraph":
        return (
          <ThemedText
            key={index}
            style={[
              styles.body,
              {
                color: bodyColor,
                marginBottom:
                  preferences.lineSpacing === "compact"
                    ? Spacing.sm
                    : preferences.lineSpacing === "spacious"
                      ? Spacing.lg
                      : Spacing.md,
                fontSize: preferences.fontSize,
                lineHeight:
                  preferences.fontSize *
                  (preferences.lineSpacing === "compact"
                    ? 1.5
                    : preferences.lineSpacing === "spacious"
                      ? 1.8
                      : 1.67),
                fontFamily:
                  preferences.fontFamily === "serif" ? Fonts.serif : Fonts.sans,
              },
            ]}
          >
            {element.children?.map((child, i) => renderInlineElement(child, i))}
          </ThemedText>
        );

      case "heading":
        const headingStyle = element.level === 2 ? styles.h2 : styles.h3;
        return (
          <ThemedText
            key={index}
            style={[
              headingStyle,
              {
                color: bodyColor,
                marginTop: Spacing.lg,
                marginBottom: Spacing.md,
              },
            ]}
          >
            {element.content}
          </ThemedText>
        );

      case "image":
        if (!element.src) return null;
        return (
          <View key={index} style={{ marginVertical: Spacing.md }}>
            <Pressable
              onPress={() => handleImagePress(element.src!, element.alt)}
            >
              <Image
                source={{ uri: element.src }}
                style={[
                  styles.contentImage,
                  { width: imageWidth, height: imageWidth * 0.6 },
                ]}
                contentFit="cover"
                transition={200}
              />
            </Pressable>
            {element.alt ? (
              <ThemedText
                style={[styles.contentImageCaption, { color: bylineColor }]}
              >
                {element.alt}
              </ThemedText>
            ) : null}
          </View>
        );

      case "gallery":
        return renderGallery(element, index);

      case "advertisement": {
        return (
          <View
            key={index}
            style={[
              styles.adSlot,
              { backgroundColor: isDark ? "#242424" : "#F6F9FC" },
            ]}
          >
            <ThemedText style={[styles.adLabel, { color: bylineColor }]}>
              {SPONSORED_AD.label}
            </ThemedText>
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(SPONSORED_AD.url)}
              style={[
                styles.adCreative,
                {
                  backgroundColor: isDark ? theme.backgroundDefault : "#FFFFFF",
                  borderColor: publication.primaryColor,
                },
              ]}
            >
              <ThemedText
                style={[styles.adSponsor, { color: publication.primaryColor }]}
              >
                Paly MAC Boosters
              </ThemedText>
              <ThemedText style={[styles.adHeadline, { color: theme.text }]}>
                {SPONSORED_AD.title}
              </ThemedText>
              <ThemedText style={[styles.adBody, { color: bodyColor }]}>
                {SPONSORED_AD.body}
              </ThemedText>
              <View
                style={[
                  styles.adButton,
                  { backgroundColor: publication.primaryColor },
                ]}
              >
                <ThemedText style={styles.adButtonText}>
                  {SPONSORED_AD.cta}
                </ThemedText>
              </View>
            </Pressable>
          </View>
        );
      }

      case "publicationAd":
        if (!element.spotId) return null;
        return <PublicationAdSlot key={index} spotId={element.spotId} />;

      case "list":
        return (
          <View key={index} style={styles.listContainer}>
            {element.children?.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <ThemedText style={[styles.bullet, { color: bodyColor }]}>
                  •
                </ThemedText>
                <ThemedText
                  style={[styles.body, { color: bodyColor, flex: 1 }]}
                >
                  {item.children?.map((child, j) =>
                    renderInlineElement(child, j),
                  )}
                </ThemedText>
              </View>
            ))}
          </View>
        );

      case "blockquote":
        return (
          <PullQuote
            key={index}
            quote={
              element.content ||
              element.children?.map((c) => c.content).join(" ") ||
              ""
            }
            color={publication?.primaryColor || "#007AFF"}
          />
        );

      case "blockquote_old" as any:
        return (
          <View
            key={index}
            style={[
              styles.blockquote,
              { borderLeftColor: publication?.primaryColor || "#ccc" },
            ]}
          >
            {element.children?.map((child, i) => (
              <ThemedText
                key={i}
                style={[styles.blockquoteText, { color: bylineColor }]}
              >
                {child.children?.map((inline, j) =>
                  renderInlineElement(inline, j),
                )}
              </ThemedText>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  // Gallery component with proper state management
  const GalleryComponent: React.FC<{
    images: { src: string; alt: string; credit?: string; caption?: string }[];
    isDark: boolean;
    bodyColor: string;
    bylineColor: string;
  }> = ({ images, isDark, bodyColor, bylineColor }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const currentImage = images[currentImageIndex];

    // Check if the alt text indicates this is a multi-image gallery
    const isMultiImageGallery =
      currentImage.alt?.includes("Gallery (") &&
      currentImage.alt?.includes(" photos)");
    const galleryPhotoCount = isMultiImageGallery
      ? parseInt(
          currentImage.alt?.match(/Gallery \((\d+) photos\)/)?.[1] || "1",
        )
      : images.length;

    return (
      <View style={styles.galleryContainer}>
        {/* Main image */}
        <View style={styles.galleryImageWrapper}>
          <Image
            source={{ uri: currentImage.src }}
            style={[
              styles.contentImage,
              { width: imageWidth, height: imageWidth * 0.75 },
            ]}
            contentFit="cover"
            transition={200}
          />

          {/* Image counter for multi-image galleries */}
          {isMultiImageGallery && (
            <View
              style={[
                styles.imageCounter,
                { backgroundColor: "rgba(0,0,0,0.6)" },
              ]}
            >
              <ThemedText style={styles.imageCounterText}>
                1 / {galleryPhotoCount}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Info for multi-image galleries - show "View Gallery on Web" button */}
        {isMultiImageGallery && (
          <View
            style={[
              styles.galleryInfoBox,
              { backgroundColor: isDark ? "#333" : "#f5f5f5" },
            ]}
          >
            <ThemedText style={[styles.galleryInfoText, { color: bodyColor }]}>
              This article contains a photo gallery with {galleryPhotoCount}{" "}
              images.
            </ThemedText>
            <Pressable
              style={[
                styles.viewWebButton,
                { backgroundColor: publication?.primaryColor || "#007AFF" },
              ]}
              onPress={() => {
                const articleUrl = `${publication.apiBaseUrl.replace("/wp-json/wp/v2", "")}/${article?.link?.split("/").filter(Boolean).pop() || ""}`;
                Linking.openURL(articleUrl);
              }}
            >
              <ThemedText style={styles.viewWebButtonText}>
                View Gallery on Web
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Photo credit */}
        {currentImage.credit && (
          <ThemedText style={[styles.photoCredit, { color: bylineColor }]}>
            Photo: {currentImage.credit}
          </ThemedText>
        )}

        {/* Caption */}
        {currentImage.caption && (
          <ThemedText
            style={[styles.contentImageCaption, { color: bodyColor }]}
          >
            {currentImage.caption}
          </ThemedText>
        )}
      </View>
    );
  };

  // Render image gallery with slideshow
  const renderGallery = (element: ParsedElement, index: number) => {
    if (!element.images || element.images.length === 0) return null;

    return (
      <GalleryComponent
        key={index}
        images={element.images}
        isDark={isDark}
        bodyColor={bodyColor}
        bylineColor={bylineColor}
      />
    );
  };

  if (!article) {
    return (
      <DesktopShell>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: Spacing.xl,
            gap: Spacing.md,
          }}
        >
          {loadingArticle ? (
            <ActivityIndicator size="large" color={publication.primaryColor} />
          ) : null}
          <ThemedText style={{ textAlign: "center", opacity: 0.7 }}>
            {loadingArticle
              ? "Loading article..."
              : "This article could not be loaded. Please open it again from the feed."}
          </ThemedText>
        </View>
      </DesktopShell>
    );
  }

  return (
    <>
      <ArticleProgressBar
        scrollY={scrollY}
        contentHeight={contentHeight}
        color={publication.primaryColor}
      />

      <DesktopShell>
        <Animated.ScrollView
          style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
          contentContainerStyle={{
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
            paddingHorizontal: Spacing.lg,
          }}
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onContentSizeChange={(w, h) => setContentHeight(h)}
        >
          {imageUrl ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            </View>
          ) : null}

          <View style={styles.content}>
            <Pressable
              onPress={handleOpenInBrowser}
              disabled={!article?.link}
              accessibilityRole={article?.link ? "link" : "text"}
              accessibilityLabel={
                article?.link
                  ? `View this article at ${publication.name}`
                  : publication.name
              }
              style={[
                styles.publicationPill,
                {
                  backgroundColor: publicationPillBackgroundColor,
                  borderColor: publicationPillBorderColor,
                },
              ]}
            >
              <View
                style={[
                  styles.publicationDot,
                  { backgroundColor: publicationPillTextColor },
                ]}
              />
              <ThemedText
                style={[
                  styles.publicationPillText,
                  { color: publicationPillTextColor },
                ]}
              >
                {article?.link
                  ? `View at ${publication.shortName || publication.name}`
                  : publication.shortName || publication.name}
              </ThemedText>
              {article?.link ? (
                <Feather
                  name="external-link"
                  size={12}
                  color={publicationPillTextColor}
                  style={styles.publicationPillIcon}
                />
              ) : null}
            </Pressable>

            <ThemedText style={styles.headline}>{headline}</ThemedText>

            <View style={styles.bylineContainer}>
              <ThemedText style={[styles.byline, { color: bylineColor }]}>
                By{" "}
              </ThemedText>
              {authorTerms.length > 0 ? (
                authorTerms.map((authorTerm, index) => {
                  const staffMatch = contributors.find((s) =>
                    s.staff_name.includes(authorTerm.id),
                  );
                  return (
                    <React.Fragment key={authorTerm.id}>
                      {staffMatch ? (
                        <Pressable
                          onPress={() => handleAuthorPress(authorTerm)}
                        >
                          <ThemedText
                            style={[styles.bylineLink, { color: theme.link }]}
                          >
                            {authorTerm.name}
                          </ThemedText>
                        </Pressable>
                      ) : (
                        <ThemedText
                          style={[styles.byline, { color: bylineColor }]}
                        >
                          {authorTerm.name}
                        </ThemedText>
                      )}
                      {index < authorTerms.length - 2 ? (
                        <ThemedText
                          style={[styles.byline, { color: bylineColor }]}
                        >
                          ,{" "}
                        </ThemedText>
                      ) : index === authorTerms.length - 2 ? (
                        <ThemedText
                          style={[styles.byline, { color: bylineColor }]}
                        >
                          {" "}
                          and{" "}
                        </ThemedText>
                      ) : null}
                    </React.Fragment>
                  );
                })
              ) : (
                <ThemedText style={[styles.byline, { color: bylineColor }]}>
                  {publication.name}
                </ThemedText>
              )}
              <ThemedText style={[styles.byline, { color: bylineColor }]}>
                {" "}
                · {formattedDate}
              </ThemedText>
            </View>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#E0E0E0",
                },
              ]}
            />

            <View style={styles.contentContainer}>
              {parsedContent.map((element, index) =>
                renderElement(element, index),
              )}
            </View>
          </View>

          {isInFocus && videoId && (
            <View style={styles.videoContainer}>
              <YouTubePlayer videoId={videoId} />
            </View>
          )}

          {contributors.length > 0 ? (
            <View style={styles.contributorsSection}>
              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "#E0E0E0",
                  },
                ]}
              />
              <ThemedText style={styles.contributorsTitle}>
                {contributors.length === 1
                  ? "About the Contributor"
                  : "About the Contributors"}
              </ThemedText>
              {contributors.map((staff) => (
                <ContributorCard
                  key={staff.id}
                  staff={staff}
                  onPress={() => handleContributorPress(staff)}
                />
              ))}
            </View>
          ) : loadingContributors && authorTerms.length > 0 ? (
            <View style={styles.contributorsLoading}>
              <ActivityIndicator
                size="small"
                color={isDark ? "#999" : "#666"}
              />
            </View>
          ) : null}

          <CommentsSection
            articleId={article.id}
            articleTitle={headline}
            publication={publication}
          />

          {relatedArticles.length > 0 && (
            <RelatedArticles
              articles={relatedArticles}
              onArticlePress={(article) => {
                trackArticleOpened({
                  articleId: article.id,
                  title: stripHtmlTags(article.title?.rendered || ""),
                  publication: publication.name,
                  source: "related_article",
                  sourceDetail: articleId ? String(articleId) : undefined,
                });
                navigation.push("ArticleDetail", {
                  article,
                  publicationId,
                  source: "related_article",
                  sourceDetail: articleId ? String(articleId) : undefined,
                });
              }}
            />
          )}

          <Modal
            visible={showSignInModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSignInModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Feather name="bookmark" size={32} color={theme.link} />
                  <ThemedText style={styles.modalTitle}>
                    Sign In Required
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    styles.modalText,
                    { color: isDark ? "rgba(255,255,255,0.7)" : "#666" },
                  ]}
                >
                  You need to sign in to save articles for later.
                </ThemedText>
                <View style={styles.modalButtons}>
                  <Pressable
                    style={[
                      styles.modalButton,
                      styles.modalCancelButton,
                      {
                        borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd",
                      },
                    ]}
                    onPress={() => setShowSignInModal(false)}
                  >
                    <ThemedText style={styles.modalButtonText}>
                      Cancel
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modalButton,
                      styles.modalSignInButton,
                      { backgroundColor: theme.link },
                    ]}
                    onPress={handleSignIn}
                  >
                    <ThemedText
                      style={[styles.modalButtonText, { color: "#fff" }]}
                    >
                      Sign In
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </Animated.ScrollView>
      </DesktopShell>

      <ReaderSettingsPanel
        visible={showReaderSettings}
        onClose={() => setShowReaderSettings(false)}
      />

      <ImageLightbox
        visible={lightboxVisible}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.sm,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  readerSettingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  readerSettingsButtonPressed: {
    opacity: 0.55,
  },
  readerSettingsButtonText: {
    fontSize: 19,
    fontWeight: "600",
    lineHeight: 24,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  publicationPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    marginBottom: Spacing.md,
  },
  publicationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  publicationPillText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  publicationPillIcon: {
    marginLeft: 6,
  },
  headline: {
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 32,
  },
  bylineContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  byline: {
    fontSize: 14,
  },
  bylineLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  body: {
    fontSize: 17,
    lineHeight: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  modalText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalSignInButton: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  contributorsSection: {
    marginTop: Spacing.lg,
  },
  contributorsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  contributorsLoading: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  videoContainer: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  contentContainer: {
    marginBottom: Spacing.lg,
  },
  contentImage: {
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  contentImageCaption: {
    fontSize: 14,
    fontStyle: "italic",
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  adSlot: {
    alignItems: "center",
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderRadius: BorderRadius.xs,
  },
  adLabel: {
    fontSize: 11,
    marginBottom: Spacing.sm,
  },
  adCreative: {
    alignItems: "center",
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    justifyContent: "center",
    padding: Spacing.lg,
    width: "100%",
  },
  adSponsor: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  adHeadline: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
    textAlign: "center",
  },
  adBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  adButton: {
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  adButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  link: {
    textDecorationLine: "underline",
  },
  listContainer: {
    marginVertical: Spacing.md,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  bullet: {
    marginRight: Spacing.sm,
    fontSize: 16,
  },
  blockquote: {
    borderLeftWidth: 4,
    paddingLeft: Spacing.md,
    marginVertical: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  blockquoteText: {
    fontStyle: "italic",
    fontSize: 16,
    lineHeight: 24,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  galleryContainer: {
    marginVertical: Spacing.lg,
  },
  galleryImageWrapper: {
    position: "relative",
  },
  imageCounter: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  galleryNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  galleryNavButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  galleryNavText: {
    fontSize: 14,
    fontWeight: "600",
  },
  photoCredit: {
    fontSize: 12,
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
  galleryInfoBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 8,
  },
  galleryInfoText: {
    fontSize: 14,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  viewWebButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  viewWebButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
