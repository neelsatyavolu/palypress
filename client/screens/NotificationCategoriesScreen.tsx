import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/contexts/NotificationContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getPublicationById } from "@/constants/publications";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

interface Category {
  id: number;
  name: string;
  slug: string;
}

type NotificationCategoriesScreenRouteProp = RouteProp<
  ProfileStackParamList,
  "NotificationCategories"
>;

export default function NotificationCategoriesScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const route = useRoute<NotificationCategoriesScreenRouteProp>();
  const { publicationId } = route.params;
  const { preferences, updatePreference } = useNotifications();

  const publication = getPublicationById(publicationId);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [allCategoriesSelected, setAllCategoriesSelected] = useState(false);
  const [saving, setSaving] = useState(false);

  const cardBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666";

  // Fetch categories for the publication
  const fetchCategories = useCallback(async () => {
    if (!publication?.apiBaseUrl) {
      setCategoriesLoading(false);
      return;
    }

    try {
      setCategoriesLoading(true);
      const response = await fetch(
        `${publication.apiBaseUrl}/categories?per_page=100`,
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  }, [publication?.apiBaseUrl]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const pref = preferences[publicationId];
    if (pref) {
      if (!pref.categoryIds || pref.categoryIds.length === 0) {
        setAllCategoriesSelected(true);
        setSelectedCategoryIds([]);
      } else {
        setAllCategoriesSelected(false);
        setSelectedCategoryIds(pref.categoryIds);
      }
    }
  }, [preferences, publicationId]);

  const handleToggleAllCategories = async () => {
    const newValue = !allCategoriesSelected;
    setAllCategoriesSelected(newValue);

    if (newValue) {
      setSelectedCategoryIds([]);
      await savePreference(null);
    }
  };

  const handleToggleCategory = async (categoryId: number) => {
    let newSelectedIds: number[];

    if (selectedCategoryIds.includes(categoryId)) {
      newSelectedIds = selectedCategoryIds.filter((id) => id !== categoryId);
    } else {
      newSelectedIds = [...selectedCategoryIds, categoryId];
    }

    setSelectedCategoryIds(newSelectedIds);
    setAllCategoriesSelected(false);

    await savePreference(newSelectedIds.length > 0 ? newSelectedIds : null);
  };

  const savePreference = async (categoryIds: number[] | null) => {
    try {
      setSaving(true);
      await updatePreference(publicationId, true, categoryIds);
    } catch (error) {
      console.error("Failed to save category preferences:", error);
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (categoriesLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={isDark ? "#999" : "#666"} />
        </View>
      </ThemedView>
    );
  }

  // Use all categories (WordPress API doesn't return an "All" category)
  const selectableCategories = categories;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
      >
        <ThemedText
          style={[styles.sectionHeader, { color: secondaryTextColor }]}
        >
          Select which categories from {publication?.shortName} you want to
          receive notifications for.
        </ThemedText>

        {/* All Categories Toggle */}
        <Pressable
          style={[
            styles.categoryRow,
            {
              backgroundColor: cardBackgroundColor,
              borderColor: allCategoriesSelected
                ? publication?.primaryColor
                : borderColor,
              borderWidth: allCategoriesSelected ? 2 : 1,
            },
          ]}
          onPress={handleToggleAllCategories}
        >
          <ThemedText style={styles.categoryName}>All Categories</ThemedText>
          <View style={styles.checkbox}>
            {allCategoriesSelected && (
              <Feather
                name="check"
                size={18}
                color={publication?.primaryColor || theme.link}
              />
            )}
          </View>
        </Pressable>

        {/* Individual Categories */}
        {selectableCategories.map((category) => {
          const isSelected =
            !allCategoriesSelected && selectedCategoryIds.includes(category.id);

          return (
            <Pressable
              key={category.id}
              style={[
                styles.categoryRow,
                {
                  backgroundColor: cardBackgroundColor,
                  borderColor: isSelected
                    ? publication?.primaryColor
                    : borderColor,
                  borderWidth: isSelected ? 2 : 1,
                  opacity: allCategoriesSelected ? 0.5 : 1,
                },
              ]}
              onPress={() => handleToggleCategory(category.id)}
              disabled={allCategoriesSelected}
            >
              <ThemedText style={styles.categoryName}>
                {category.name}
              </ThemedText>
              <View style={styles.checkbox}>
                {isSelected && (
                  <Feather
                    name="check"
                    size={18}
                    color={publication?.primaryColor || theme.link}
                  />
                )}
              </View>
            </Pressable>
          );
        })}

        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={isDark ? "#999" : "#666"} />
            <ThemedText
              style={[styles.savingText, { color: secondaryTextColor }]}
            >
              Saving...
            </ThemedText>
          </View>
        )}
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
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  categoryName: {
    fontSize: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
  savingText: {
    fontSize: 14,
    marginLeft: Spacing.sm,
  },
});
