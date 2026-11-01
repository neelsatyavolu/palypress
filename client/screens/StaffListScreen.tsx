import React, { useEffect, useState } from "react";
import {
  FlatList,
  View,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { stripHtmlTags } from "@/lib/htmlUtils";
import { StaffProfile, StaffYear, HomeStackParamList } from "@/types/article";

type StaffListNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "Staff"
>;

const getRoleRank = (role: string, publicationId: string): number => {
  const lowerRole = role.toLowerCase();

  // InFocus hierarchy
  if (publicationId === "infocus") {
    if (lowerRole.includes("executive producer")) return 0;
    if (lowerRole.includes("associate producer")) return 1;
    if (lowerRole.includes("manager")) return 2;
    if (lowerRole.includes("reporter")) return 3;
    if (lowerRole.includes("adviser") || lowerRole.includes("advisor"))
      return 4;
    return 5;
  }

  // Default hierarchy (Paly Voice and others)
  if (
    lowerRole.includes("editor-in-chief") ||
    lowerRole.includes("editor in chief") ||
    lowerRole === "eic"
  ) {
    return 0;
  }
  if (lowerRole.includes("managing editor")) {
    return 1;
  }
  if (
    lowerRole.includes("news editor") ||
    lowerRole.includes("features editor") ||
    lowerRole.includes("sports editor") ||
    lowerRole.includes("opinion editor") ||
    lowerRole.includes("arts editor") ||
    lowerRole.includes("multimedia editor") ||
    lowerRole.includes("photo editor") ||
    lowerRole.includes("social media")
  ) {
    return 2;
  }
  if (lowerRole.includes("editor")) {
    return 3;
  }
  return 4;
};

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StaffCardProps {
  staff: StaffProfile;
  onPress: () => void;
  theme: any;
  isDark: boolean;
}

function StaffCard({ staff, onPress, theme, isDark }: StaffCardProps) {
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

  const name = stripHtmlTags(staff.title.rendered);
  const role = stripHtmlTags(staff.excerpt.rendered);
  const imageUrl =
    staff.featured_image_src ||
    staff._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  const bylineColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666666";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.staffCard,
        { backgroundColor: isDark ? theme.backgroundDefault : "#F8F8F8" },
        animatedStyle,
      ]}
    >
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
            { backgroundColor: isDark ? theme.backgroundSecondary : "#E0E0E0" },
          ]}
        >
          <ThemedText style={styles.avatarInitial}>{name.charAt(0)}</ThemedText>
        </View>
      )}
      <View style={styles.staffInfo}>
        <ThemedText style={styles.staffName}>{name}</ThemedText>
        <ThemedText style={[styles.staffRole, { color: bylineColor }]}>
          {role}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

export default function StaffListScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { publication: activePublication, getCurrentYearIdForPublication } =
    usePublication();
  const route = useRoute<RouteProp<HomeStackParamList, "Staff">>();
  // When opened from the Publications tab a specific masthead is passed in; fall
  // back to the app-wide active publication for all other entry points. This
  // keeps "View staff" from changing the global selection.
  const publication = route.params?.publication ?? activePublication;
  const navigation = useNavigation<StaffListNavigationProp>();

  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [years, setYears] = useState<StaffYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<StaffYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const spinnerColor = isDark ? "#999999" : "#666666";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#4A4A4A";

  const fetchYears = async () => {
    if (!publication.apiBaseUrl) {
      setYears([]);
      setSelectedYear(null);
      return null;
    }

    try {
      const response = await fetch(
        `${publication.apiBaseUrl}/staff_year?per_page=100`,
      );
      if (!response.ok) throw new Error("Failed to fetch years");
      const data: StaffYear[] = await response.json();
      const sortedYears = data
        .filter((y) => y.count > 0)
        .sort((a, b) => b.name.localeCompare(a.name));
      setYears(sortedYears);
      const dynamicYearId = getCurrentYearIdForPublication(publication.id);
      const currentYear =
        sortedYears.find((y) => y.id === dynamicYearId) || sortedYears[0];
      setSelectedYear(currentYear);
      return currentYear;
    } catch (err) {
      console.error("Error fetching years:", err);
      return null;
    }
  };

  const fetchStaff = async (yearId: number, isRefresh = false) => {
    if (!publication.apiBaseUrl) {
      setStaff([]);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(
        `${publication.apiBaseUrl}/staff_profile?_embed&per_page=100&staff_year=${yearId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch staff");
      }
      const data: StaffProfile[] = await response.json();
      // Sort by role hierarchy (publication-specific), then alphabetically by name
      const sortedStaff = data.sort((a, b) => {
        const roleA = stripHtmlTags(a.excerpt.rendered);
        const roleB = stripHtmlTags(b.excerpt.rendered);
        const rankA = getRoleRank(roleA, publication.id);
        const rankB = getRoleRank(roleB, publication.id);
        if (rankA !== rankB) return rankA - rankB;
        const nameA = stripHtmlTags(a.title.rendered);
        const nameB = stripHtmlTags(b.title.rendered);
        return nameA.localeCompare(nameB);
      });
      setStaff(sortedStaff);
    } catch (err) {
      setError("Unable to load staff. Pull to refresh.");
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const year = await fetchYears();
      if (year) {
        await fetchStaff(year.id);
      } else {
        await fetchStaff(getCurrentYearIdForPublication(publication.id));
      }
    };
    init();
  }, [publication.id]);

  const handleYearSelect = (year: StaffYear) => {
    setSelectedYear(year);
    setShowYearPicker(false);
    fetchStaff(year.id);
  };

  const handleRefresh = () => {
    if (selectedYear) {
      fetchStaff(selectedYear.id, true);
    }
  };

  const handleStaffPress = (staffMember: StaffProfile) => {
    navigation.navigate("StaffDetail", {
      staff: staffMember,
      publicationId: publication.id,
    });
  };

  const renderStaff = ({ item }: { item: StaffProfile }) => (
    <StaffCard
      staff={item}
      onPress={() => handleStaffPress(item)}
      theme={theme}
      isDark={isDark}
    />
  );

  const renderHeader = () => (
    <Pressable
      style={[
        styles.yearSelector,
        { backgroundColor: isDark ? theme.backgroundDefault : "#F0F0F0" },
      ]}
      onPress={() => setShowYearPicker(true)}
    >
      <ThemedText style={styles.yearSelectorLabel}>Year</ThemedText>
      <View style={styles.yearSelectorValue}>
        <ThemedText style={styles.yearSelectorText}>
          {selectedYear?.name || "Select Year"}
        </ThemedText>
        <Feather name="chevron-down" size={18} color={theme.text} />
      </View>
    </Pressable>
  );

  if (loading && years.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={spinnerColor} />
      </View>
    );
  }

  if (error && staff.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ThemedText style={[styles.errorText, { color: secondaryTextColor }]}>
          {error}
        </ThemedText>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={staff}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStaff}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={spinnerColor}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={spinnerColor} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ThemedText
                style={[styles.emptyText, { color: secondaryTextColor }]}
              >
                No staff profiles for this year.
              </ThemedText>
            </View>
          )
        }
      />

      <Modal
        visible={showYearPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowYearPicker(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Year</ThemedText>
              <Pressable onPress={() => setShowYearPicker(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.yearList}
              showsVerticalScrollIndicator={false}
            >
              {years.map((year) => (
                <Pressable
                  key={year.id}
                  style={[
                    styles.yearOption,
                    selectedYear?.id === year.id && {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => handleYearSelect(year)}
                >
                  <ThemedText
                    style={[
                      styles.yearOptionText,
                      selectedYear?.id === year.id && {
                        fontWeight: "600",
                        color: theme.link,
                      },
                    ]}
                  >
                    {year.name}
                  </ThemedText>
                  <ThemedText
                    style={[styles.yearCount, { color: secondaryTextColor }]}
                  >
                    {year.count} {year.count === 1 ? "member" : "members"}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  loadingContainer: {
    paddingVertical: Spacing["3xl"],
    alignItems: "center",
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
  yearSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  yearSelectorLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  yearSelectorValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  yearSelectorText: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: "600",
  },
  staffInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
  },
  staffRole: {
    fontSize: 14,
    marginTop: 2,
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
    maxWidth: 340,
    maxHeight: "70%",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  yearList: {
    maxHeight: 400,
  },
  yearOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  yearOptionText: {
    fontSize: 16,
  },
  yearCount: {
    fontSize: 13,
  },
});
