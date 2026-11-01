import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { getPublicationById } from "@/constants/publications";
import { Spacing, BorderRadius } from "@/constants/theme";
import { SponsoredFeedCard } from "@/components/SponsoredFeedCard";
import { ThemedText } from "@/components/ThemedText";
import {
  stripHtmlTags,
  formatArticleContent,
  formatDate,
} from "@/lib/htmlUtils";
import {
  Article,
  getArticleAuthors,
  HomeStackParamList,
} from "@/types/article";
import {
  getFeedItemsWithSponsoredSlots,
  isSponsoredFeedAd,
} from "@/lib/articleAds";

type StaffDetailRouteProp = RouteProp<HomeStackParamList, "StaffDetail">;
type StaffDetailNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "StaffDetail"
>;

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StoryCardProps {
  article: Article;
  onPress: () => void;
  isDark: boolean;
  theme: any;
}

function StoryCard({ article, onPress, isDark, theme }: StoryCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const headline = stripHtmlTags(article.title.rendered);
  const date = formatDate(article.date);
  const author = getArticleAuthors(article);
  const bylineColor = isDark ? "rgba(255, 255, 255, 0.5)" : "#9E9E9E";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.storyCard,
        { backgroundColor: isDark ? theme.backgroundDefault : "#F8F8F8" },
        animatedStyle,
      ]}
    >
      <ThemedText style={styles.storyHeadline} numberOfLines={2}>
        {headline}
      </ThemedText>
      <ThemedText style={[styles.storyByline, { color: bylineColor }]}>
        By {author} · {date}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function StaffDetailScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { publication: contextPublication } = usePublication();
  const route = useRoute<StaffDetailRouteProp>();
  const navigation = useNavigation<StaffDetailNavigationProp>();

  const { staff, publicationId } = route.params;

  // Use the staff's publication if provided (from unified feed article), otherwise use context publication
  const publication = publicationId
    ? getPublicationById(publicationId) || contextPublication
    : contextPublication;
  const [stories, setStories] = useState<Article[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);

  const name = stripHtmlTags(staff.title.rendered);
  const role = stripHtmlTags(staff.excerpt.rendered);
  const bio = formatArticleContent(staff.content.rendered);
  const imageUrl =
    staff.featured_image_src ||
    staff._embedded?.["wp:featuredmedia"]?.[0]?.source_url;

  const bylineColor = isDark ? "rgba(255, 255, 255, 0.5)" : "#9E9E9E";
  const bodyColor = isDark ? "rgba(255, 255, 255, 0.85)" : "#333333";
  const spinnerColor = isDark ? "#999999" : "#666666";

  useEffect(() => {
    const fetchStories = async () => {
      try {
        setLoadingStories(true);
        const staffNameId = staff.staff_name?.[0];
        if (!staffNameId) {
          setStories([]);
          setLoadingStories(false);
          return;
        }
        const response = await fetch(
          `${publication.apiBaseUrl}/posts?_embed&per_page=20&staff_name=${staffNameId}`,
        );
        if (response.ok) {
          const data: Article[] = await response.json();
          setStories(data);
        }
      } catch (err) {
        console.error("Error fetching stories:", err);
      } finally {
        setLoadingStories(false);
      }
    };
    fetchStories();
  }, [staff.staff_name, publication.apiBaseUrl]);

  const handleStoryPress = (article: Article) => {
    navigation.navigate("StaffArticleDetail", {
      article,
      publicationId: publication.id,
    });
  };
  const storyItems = getFeedItemsWithSponsoredSlots(stories, "authorStories");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.header}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#E0E0E0",
              },
            ]}
          >
            <ThemedText style={styles.avatarInitial}>
              {name.charAt(0)}
            </ThemedText>
          </View>
        )}
        <ThemedText style={styles.name}>{name}</ThemedText>
        <ThemedText style={[styles.role, { color: bylineColor }]}>
          {role}
        </ThemedText>
        <View
          style={[
            styles.publicationBadge,
            {
              backgroundColor: isDark
                ? `${publication.primaryColor}25`
                : `${publication.primaryColor}12`,
              borderColor: publication.primaryColor,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.publicationBadgeText,
              { color: publication.primaryColor },
            ]}
          >
            {publication.shortName || publication.name}
          </ThemedText>
        </View>
      </View>

      {bio ? (
        <View style={styles.bioSection}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          <ThemedText style={[styles.bio, { color: bodyColor }]}>
            {bio}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.storiesSection}>
        <ThemedText style={styles.sectionTitle}>Stories</ThemedText>
        {loadingStories ? (
          <ActivityIndicator
            size="small"
            color={spinnerColor}
            style={styles.storiesLoader}
          />
        ) : storyItems.length > 0 ? (
          storyItems.map((item) =>
            isSponsoredFeedAd(item) ? (
              <SponsoredFeedCard key={`sponsored-${item.id}`} item={item} />
            ) : (
              <StoryCard
                key={item.id}
                article={item}
                onPress={() => handleStoryPress(item)}
                isDark={isDark}
                theme={theme}
              />
            ),
          )
        ) : (
          <ThemedText style={[styles.noStories, { color: bylineColor }]}>
            No stories found for this staff member.
          </ThemedText>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: Spacing.md,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: "600",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  role: {
    fontSize: 16,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  publicationBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  publicationBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  bioSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
  },
  storiesSection: {
    marginBottom: Spacing.xl,
  },
  storiesLoader: {
    marginTop: Spacing.lg,
  },
  storyCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  storyHeadline: {
    fontSize: 15,
    fontWeight: "500",
  },
  storyByline: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  noStories: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.lg,
  },
});
