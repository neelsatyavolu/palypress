import React, { useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/contexts/NotificationContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { NOTIFICATION_PUBLICATIONS } from "@/constants/publications";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type NotificationSettingsScreenNavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  "NotificationSettings"
>;

export default function NotificationSettingsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { isDark } = useTheme();
  const navigation = useNavigation<NotificationSettingsScreenNavigationProp>();
  const {
    preferences,
    isLoading,
    updatePreference,
    refreshPreferences,
    weeklyDigestEnabled,
    updateWeeklyDigestPreference,
  } = useNotifications();

  const cardBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666";

  const loadPreferences = useCallback(() => {
    refreshPreferences();
  }, [refreshPreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = async (publicationId: string, enabled: boolean) => {
    try {
      await updatePreference(publicationId, enabled);
    } catch (error) {
      console.warn("Failed to update notification preference:", error);
      Alert.alert(
        "Notifications unavailable",
        "We could not update notifications right now. Please try again later.",
      );
    }
  };

  const handleWeeklyDigestToggle = async (enabled: boolean) => {
    try {
      await updateWeeklyDigestPreference(enabled);
    } catch (error) {
      console.warn("Failed to update weekly digest preference:", error);
      Alert.alert(
        "Weekly digest unavailable",
        "We could not update the weekly digest email right now. Please try again later.",
      );
    }
  };

  const handlePublicationPress = (
    publicationId: string,
    hasCategories: boolean,
  ) => {
    const pref = preferences[publicationId];
    if (pref?.enabled && hasCategories) {
      navigation.navigate("NotificationCategories", { publicationId });
    }
  };

  const getCategoryCount = (
    publicationId: string,
    hasCategories: boolean,
  ): string => {
    const pref = preferences[publicationId];
    if (!pref || !pref.enabled) return "";
    if (!hasCategories) return "All stories";
    if (!pref.categoryIds || pref.categoryIds.length === 0)
      return "All categories";
    const count = pref.categoryIds.length;
    return `${count} ${count === 1 ? "category" : "categories"}`;
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={isDark ? "#999" : "#666"} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <View
          style={[
            styles.publicationRow,
            { backgroundColor: cardBackgroundColor, borderColor },
          ]}
        >
          <View style={styles.leftSection}>
            <View style={styles.publicationInfo}>
              <ThemedText style={styles.publicationName}>
                Weekly digest email
              </ThemedText>
              <ThemedText
                style={[styles.categoryText, { color: secondaryTextColor }]}
              >
                Top stories of the week, every Monday
              </ThemedText>
            </View>
          </View>
          <Switch
            value={weeklyDigestEnabled}
            onValueChange={handleWeeklyDigestToggle}
            trackColor={{ false: isDark ? "#444" : "#ccc", true: "#007aff" }}
            thumbColor="#fff"
            style={{ marginLeft: Spacing.sm }}
          />
        </View>

        <ThemedText
          style={[styles.sectionHeader, { color: secondaryTextColor }]}
        >
          Choose which publications you want to receive notifications from.
        </ThemedText>

        {NOTIFICATION_PUBLICATIONS.map((publication) => {
          const pref = preferences[publication.id];
          const isEnabled = pref?.enabled ?? false;
          const hasCategories = Boolean(publication.apiBaseUrl);
          const categoryCount = getCategoryCount(publication.id, hasCategories);

          return (
            <Pressable
              key={publication.id}
              style={[
                styles.publicationRow,
                { backgroundColor: cardBackgroundColor, borderColor },
              ]}
              onPress={() =>
                handlePublicationPress(publication.id, hasCategories)
              }
              disabled={!isEnabled || !hasCategories}
            >
              <View style={styles.leftSection}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: publication.primaryColor },
                  ]}
                />
                <View style={styles.publicationInfo}>
                  <ThemedText style={styles.publicationName}>
                    {publication.shortName}
                  </ThemedText>
                  {categoryCount && (
                    <ThemedText
                      style={[
                        styles.categoryText,
                        { color: secondaryTextColor },
                      ]}
                    >
                      {categoryCount}
                    </ThemedText>
                  )}
                </View>
              </View>

              <View style={styles.rightSection}>
                {isEnabled && hasCategories && categoryCount && (
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={secondaryTextColor}
                  />
                )}
                <Switch
                  value={isEnabled}
                  onValueChange={(value) => handleToggle(publication.id, value)}
                  trackColor={{
                    false: isDark ? "#444" : "#ccc",
                    true: publication.primaryColor,
                  }}
                  thumbColor="#fff"
                  style={{ marginLeft: Spacing.sm }}
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeader: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  publicationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  publicationInfo: {
    flex: 1,
  },
  publicationName: {
    fontSize: 16,
    fontWeight: "500",
  },
  categoryText: {
    fontSize: 13,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
});
