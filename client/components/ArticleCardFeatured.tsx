import React, { useState, useEffect, useRef } from "react";
import {
  Platform,
  StyleSheet,
  Pressable,
  Share,
  Modal,
  View,
} from "react-native";
import { Button as TamaguiButton, View as TamaguiView } from "tamagui";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { CategoryPill } from "@/components/CategoryPill";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedArticles } from "@/contexts/SavedArticlesContext";
import { useUpvotes } from "@/contexts/UpvoteContext";
import { usePublication } from "@/contexts/PublicationContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { stripHtmlTags, formatDate } from "@/lib/htmlUtils";
import {
  ARTICLE_CARD_EXCERPT_FONT_SIZE,
  ARTICLE_CARD_EXCERPT_LINE_HEIGHT,
  FEATURED_ARTICLE_CARD_HEADLINE_FONT_SIZE,
  FEATURED_ARTICLE_CARD_HEADLINE_LINE_HEIGHT,
  hasArticleCardExcerpt,
} from "@/lib/articleCardLayout";
import { getReadingTimeText } from "@/lib/readingTime";
import { haptics } from "@/lib/haptics";
import { getArticleSharePayload } from "@/lib/articleSharing";

interface ArticleCardFeaturedProps {
  articleId: number;
  headline: string;
  excerpt: string;
  date: string;
  author: string;
  imageUrl?: string;
  onPress: () => void;
  onLongPress?: () => void;
  content?: string;
  category?: {
    name: string;
    color?: string;
  };
  articleUrl?: string;
  authorAvatar?: string;
  publicationBadge?: {
    name: string;
    color: string;
  };
  publicationId?: string;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type UIBoxProps = {
  style?: any;
  children?: React.ReactNode;
  [key: string]: any;
};
function UIBox({ style, ...props }: UIBoxProps) {
  const flattened = StyleSheet.flatten(style);
  if (Platform.OS !== "web") {
    return <View style={flattened} {...props} />;
  }
  return <TamaguiView style={flattened} {...props} />;
}

type UIPressProps = {
  style?: any;
  children?: React.ReactNode;
  [key: string]: any;
};
function UIPress({ style, ...props }: UIPressProps) {
  const flattened = StyleSheet.flatten(style);
  if (Platform.OS !== "web") {
    return <Pressable style={flattened} {...props} />;
  }
  return <TamaguiButton unstyled style={flattened} {...props} />;
}

export function ArticleCardFeatured({
  articleId,
  headline,
  excerpt,
  date,
  author,
  imageUrl,
  onPress,
  onLongPress,
  content,
  category,
  articleUrl,
  authorAvatar,
  publicationBadge,
  publicationId,
}: ArticleCardFeaturedProps) {
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { isArticleSaved, saveArticle, unsaveArticle } = useSavedArticles();
  const { isArticleUpvoted, getUpvoteCount, upvoteArticle, removeUpvote } =
    useUpvotes();
  const { publication } = usePublication();
  const navigation = useNavigation();

  const isSaved = isArticleSaved(articleId);

  const scale = useSharedValue(1);
  const fillScale = useSharedValue(isSaved ? 1 : 0);
  const shadowOpacity = useSharedValue(0);
  const shadowRadius = useSharedValue(8);
  const elevation = useSharedValue(0);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInModalType, setSignInModalType] = useState<"save" | "upvote">(
    "save",
  );
  const [showToast, setShowToast] = useState(false);
  const didLongPress = useRef(false);

  // Use provided publicationId or fall back to current publication
  const effectivePublicationId = publicationId || publication.id;

  const isUpvoted = isArticleUpvoted(articleId, effectivePublicationId);
  const upvoteCount = getUpvoteCount(articleId, effectivePublicationId);

  const cleanHeadline = stripHtmlTags(headline);
  const cleanExcerpt = stripHtmlTags(excerpt);
  const hasExcerpt = hasArticleCardExcerpt(excerpt);
  const formattedDate = formatDate(date);
  const readingTime = content ? getReadingTimeText(content) : null;

  const excerptColor = isDark ? "rgba(255, 255, 255, 0.7)" : "#4A4A4A";
  const bylineColor = isDark ? "rgba(255, 255, 255, 0.5)" : "#9E9E9E";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
    shadowRadius: shadowRadius.value,
    elevation: elevation.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
    shadowOpacity.value = withTiming(0.08, { duration: 150 });
    shadowRadius.value = withTiming(12, { duration: 150 });
    elevation.value = withTiming(4, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
    shadowOpacity.value = withTiming(0, { duration: 150 });
    shadowRadius.value = withTiming(8, { duration: 150 });
    elevation.value = withTiming(0, { duration: 150 });

    if (didLongPress.current) {
      setTimeout(() => {
        didLongPress.current = false;
      }, 0);
    }
  };

  const handleCardPress = () => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }

    onPress();
  };

  const handleCardLongPress = () => {
    if (!onLongPress) return;

    didLongPress.current = true;
    onLongPress();
  };

  const handleSignIn = () => {
    setShowSignInModal(false);
    navigation.dispatch(
      CommonActions.navigate({
        name: "ProfileTab",
      }),
    );
  };

  const handleSavePress = async () => {
    haptics.light();

    if (!isAuthenticated) {
      setSignInModalType("save");
      setShowSignInModal(true);
      return;
    }

    if (isSaved) {
      haptics.medium();
      await unsaveArticle(articleId);
      fillScale.value = withTiming(0, { duration: 200 });
    } else {
      haptics.success();
      await saveArticle({
        articleId,
        articleTitle: cleanHeadline,
        articleExcerpt: cleanExcerpt,
        articleAuthor: author,
        articleDate: date,
        articleImageUrl: imageUrl,
      });
      fillScale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withTiming(1.0, { duration: 100 }),
      );
      setShowToast(true);
    }
  };

  const handleUpvotePress = async () => {
    haptics.light();

    if (!isAuthenticated) {
      setSignInModalType("upvote");
      setShowSignInModal(true);
      return;
    }

    if (isUpvoted) {
      haptics.medium();
      await removeUpvote(articleId, effectivePublicationId);
    } else {
      haptics.success();
      await upvoteArticle(articleId, effectivePublicationId);
    }
  };

  const handleSharePress = async () => {
    haptics.light();
    try {
      await Share.share(
        getArticleSharePayload({
          articleId,
          headline: cleanHeadline,
          publicationId: effectivePublicationId,
          articleUrl,
        }),
      );
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const fillScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fillScale.value }],
  }));

  const getGradientColors = (): readonly [string, string, string] => {
    const pubColor =
      category?.color || publicationBadge?.color || publication.primaryColor;

    if (pubColor && pubColor !== "#000000") {
      return isDark
        ? ([`${pubColor}30`, `${pubColor}15`, `${pubColor}08`] as const)
        : ([`${pubColor}20`, `${pubColor}10`, `${pubColor}05`] as const);
    }

    return isDark
      ? ([theme.backgroundSecondary, "#1a1a1a", "#0d0d0d"] as const)
      : ([
          theme.backgroundSecondary,
          theme.backgroundTertiary,
          "#f5f5f5",
        ] as const);
  };

  return (
    <AnimatedPressable
      onPress={handleCardPress}
      onLongPress={handleCardLongPress}
      delayLongPress={550}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundRoot },
        animatedStyle,
        Platform.OS === "web"
          ? ({
              // @ts-ignore web-only
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              cursor: "pointer",
              borderRadius: 14,
            } as any)
          : null,
      ]}
    >
      <UIBox style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <UIBox style={styles.imagePlaceholder}>
            <LinearGradient
              colors={getGradientColors()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientContainer}
            >
              <ThemedText
                style={[
                  styles.placeholderText,
                  {
                    color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)",
                  },
                ]}
              >
                {publicationBadge?.name || publication.name}
              </ThemedText>
            </LinearGradient>
          </UIBox>
        )}

        {/* Top-left: Publication badge */}
        {publicationBadge && (
          <UIBox
            style={[
              styles.publicationBadgeTopLeft,
              { backgroundColor: publicationBadge.color },
            ]}
          >
            <ThemedText style={styles.publicationBadgeText}>
              {publicationBadge.name}
            </ThemedText>
          </UIBox>
        )}

        {/* Bottom-left: Category pill */}
        {category && (
          <UIBox style={styles.categoryOverlay}>
            <CategoryPill
              category={category.name}
              color={category.color || publication.primaryColor}
              small
            />
          </UIBox>
        )}

        {/* Top-right: Action buttons */}
        <UIBox style={styles.topButtons}>
          {articleUrl && (
            <UIPress
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark
                    ? "rgba(0,0,0,0.6)"
                    : "rgba(255,255,255,0.9)",
                },
              ]}
              onPress={handleSharePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather
                name="share"
                size={20}
                color={isDark ? "#fff" : "#333"}
                style={{ opacity: 0.7 }}
              />
            </UIPress>
          )}
          <UIPress
            style={[
              styles.actionButton,
              {
                backgroundColor: isDark
                  ? "rgba(0,0,0,0.6)"
                  : "rgba(255,255,255,0.9)",
              },
            ]}
            onPress={handleSavePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <UIBox style={styles.bookmarkContainer}>
              {isSaved ? (
                <>
                  <Animated.View
                    style={[
                      styles.bookmarkFill,
                      { backgroundColor: "#EF4444" },
                      fillScaleStyle,
                    ]}
                  />
                  <Feather name="bookmark" size={22} color="#EF4444" />
                </>
              ) : (
                <Feather
                  name="bookmark"
                  size={22}
                  color={isDark ? "#fff" : "#333"}
                  style={{ opacity: 0.7 }}
                />
              )}
            </UIBox>
          </UIPress>
        </UIBox>

        {/* Bottom-right: Upvote button */}
        <UIPress
          style={[
            styles.upvoteButton,
            {
              backgroundColor: isDark
                ? "rgba(0,0,0,0.6)"
                : "rgba(255,255,255,0.9)",
            },
          ]}
          onPress={handleUpvotePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <UIBox style={styles.upvoteContainer}>
            <Feather
              name="arrow-up"
              size={20}
              color={isUpvoted ? "#10B981" : isDark ? "#fff" : "#333"}
              style={isUpvoted ? undefined : { opacity: 0.7 }}
            />
            {upvoteCount > 0 && (
              <ThemedText
                style={[
                  styles.upvoteCount,
                  { color: isUpvoted ? "#10B981" : isDark ? "#fff" : "#333" },
                ]}
              >
                {upvoteCount}
              </ThemedText>
            )}
          </UIBox>
        </UIPress>
      </UIBox>

      {/* Content: Title, Description, Metadata */}
      <UIBox style={styles.content}>
        <ThemedText style={styles.headline} numberOfLines={2}>
          {cleanHeadline}
        </ThemedText>

        {hasExcerpt ? (
          <ThemedText
            style={[styles.excerpt, { color: excerptColor }]}
            numberOfLines={2}
          >
            {cleanExcerpt}
          </ThemedText>
        ) : null}

        {/* Metadata: Author, Date, Reading Time */}
        <UIBox style={styles.metaRow}>
          <ThemedText style={[styles.meta, { color: bylineColor }]}>
            By {author} · {formattedDate}
          </ThemedText>
          {readingTime && (
            <>
              <ThemedText style={[styles.meta, { color: bylineColor }]}>
                {" · "}
              </ThemedText>
              <ThemedText style={[styles.meta, { color: bylineColor }]}>
                {readingTime}
              </ThemedText>
            </>
          )}
        </UIBox>
      </UIBox>

      <Modal
        visible={showSignInModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignInModal(false)}
      >
        <UIBox style={styles.modalOverlay}>
          <UIBox
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
            ]}
          >
            <UIBox style={styles.modalHeader}>
              <Feather
                name={signInModalType === "save" ? "bookmark" : "arrow-up"}
                size={32}
                color={theme.link}
              />
              <ThemedText style={styles.modalTitle}>
                Sign In Required
              </ThemedText>
            </UIBox>
            <ThemedText
              style={[
                styles.modalText,
                { color: isDark ? "rgba(255,255,255,0.7)" : "#666" },
              ]}
            >
              {signInModalType === "save"
                ? "You need to sign in to save articles for later."
                : "You need to sign in to upvote articles."}
            </ThemedText>
            <UIBox style={styles.modalButtons}>
              <UIPress
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  { borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd" },
                ]}
                onPress={() => setShowSignInModal(false)}
              >
                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
              </UIPress>
              <UIPress
                style={[
                  styles.modalButton,
                  styles.modalSignInButton,
                  { backgroundColor: theme.link },
                ]}
                onPress={handleSignIn}
              >
                <ThemedText style={[styles.modalButtonText, { color: "#fff" }]}>
                  Sign In
                </ThemedText>
              </UIPress>
            </UIBox>
          </UIBox>
        </UIBox>
      </Modal>

      <Toast
        message="Article saved"
        icon="bookmark"
        visible={showToast}
        onDismiss={() => setShowToast(false)}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
  },
  gradientContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  publicationBadgeTopLeft: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  publicationBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  topButtons: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  bookmarkContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkFill: {
    position: "absolute",
    width: 11,
    height: 13,
    top: 4,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  upvoteButton: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  upvoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  upvoteCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
  categoryOverlay: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
  },
  headline: {
    fontSize: FEATURED_ARTICLE_CARD_HEADLINE_FONT_SIZE,
    fontWeight: "bold",
    letterSpacing: 0,
    lineHeight: FEATURED_ARTICLE_CARD_HEADLINE_LINE_HEIGHT,
    marginBottom: 6,
  },
  excerpt: {
    fontSize: ARTICLE_CARD_EXCERPT_FONT_SIZE,
    lineHeight: ARTICLE_CARD_EXCERPT_LINE_HEIGHT,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 12,
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
});
