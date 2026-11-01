import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  SectionList,
  Linking,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/config";

interface StaffMember {
  name: string;
  email: string;
  title: string;
}

interface StaffDepartment {
  id: string;
  name: string;
  staff: StaffMember[];
}

export default function StaffDirectoryScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [departments, setDepartments] = useState<StaffDepartment[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<StaffDepartment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffDirectory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${getApiUrl()}api/staff-directory`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch staff directory");
      }

      const data = await res.json();
      setDepartments(data);
      setFilteredDepartments(data);
    } catch (err) {
      console.error("Error fetching staff directory:", err);
      setError("Unable to load staff directory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffDirectory();
  }, [fetchStaffDirectory]);

  // Filter departments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDepartments(departments);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase().trim();
    const filtered = departments
      .map((dept) => {
        const filteredStaff = dept.staff.filter(
          (staff) =>
            staff.name.toLowerCase().includes(lowerQuery) ||
            staff.email.toLowerCase().includes(lowerQuery) ||
            staff.title.toLowerCase().includes(lowerQuery)
        );
        return { ...dept, staff: filteredStaff };
      })
      .filter((dept) => dept.staff.length > 0);

    setFilteredDepartments(filtered);
  }, [searchQuery, departments]);

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const inputBg = isDark ? "#2A2C2E" : "#fff";
  const inputBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const inputColor = isDark ? "#ECEDEE" : "#11181C";
  const placeholderColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  const renderStaffMember = ({ item }: { item: StaffMember }) => (
    <Pressable
      onPress={() => handleEmailPress(item.email)}
      style={[
        styles.staffCard,
        {
          backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
        },
      ]}
    >
      <View style={styles.staffInfo}>
        <ThemedText style={styles.staffName}>{item.name}</ThemedText>
        <ThemedText
          style={[styles.staffTitle, { color: isDark ? "#888" : "#666" }]}
        >
          {item.title}
        </ThemedText>
        <View style={styles.emailRow}>
          <Feather
            name="mail"
            size={14}
            color={theme.link}
            style={styles.emailIcon}
          />
          <ThemedText style={[styles.staffEmail, { color: theme.link }]}>
            {item.email}
          </ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={isDark ? "#666" : "#999"} />
    </Pressable>
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string; data: StaffMember[] };
  }) => (
    <View
      style={[
        styles.sectionHeader,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.03)",
        },
      ]}
    >
      <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
      <ThemedText
        style={[
          styles.sectionCount,
          { color: isDark ? "#888" : "#666" },
        ]}
      >
        {section.data.length} {section.data.length === 1 ? "member" : "members"}
      </ThemedText>
    </View>
  );

  const sectionData = filteredDepartments.map((dept) => ({
    title: dept.name,
    data: dept.staff,
  }));

  return (
    <ThemedView style={styles.container}>
      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          {
            paddingTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundRoot,
            borderBottomColor: inputBorder,
          },
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Feather
            name="search"
            size={20}
            color={placeholderColor}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: inputColor,
              },
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search staff by name, email, or title..."
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
              hitSlop={8}
            >
              <Feather name="x-circle" size={20} color={placeholderColor} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.link} />
          <ThemedText
            style={[styles.loadingText, { color: isDark ? "#888" : "#666" }]}
          >
            Loading staff directory...
          </ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={48} color={theme.link} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable onPress={fetchStaffDirectory} style={styles.retryButton}>
            <ThemedText style={[styles.retryText, { color: theme.link }]}>
              Retry
            </ThemedText>
          </Pressable>
        </View>
      ) : filteredDepartments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="users" size={48} color={isDark ? "#666" : "#999"} />
          <ThemedText style={styles.emptyText}>
            {searchQuery ? "No staff members found" : "No staff available"}
          </ThemedText>
          {searchQuery && (
            <ThemedText
              style={[
                styles.emptySubtext,
                { color: isDark ? "#888" : "#666" },
              ]}
            >
              Try a different search term
            </ThemedText>
          )}
        </View>
      ) : (
        <SectionList
          sections={sectionData}
          keyExtractor={(item, index) => item.email + index}
          renderItem={renderStaffMember}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + Spacing.xl },
          ]}
          stickySectionHeadersEnabled={true}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: Spacing.md,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingLeft: Spacing.md + 28,
    paddingRight: Spacing.md + 28,
    fontSize: 16,
  },
  clearButton: {
    position: "absolute",
    right: Spacing.md,
    zIndex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  listContent: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  staffInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  staffTitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emailIcon: {
    marginRight: 6,
  },
  staffEmail: {
    fontSize: 14,
    fontWeight: "500",
  },
});
