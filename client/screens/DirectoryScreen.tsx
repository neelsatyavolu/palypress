import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";

// Sample staff data (will be replaced with Google Directory API)
const SAMPLE_STAFF = [
  {
    id: "1",
    name: "Principal Office",
    title: "Administration",
    department: "Administration",
    email: "principal@pausd.org",
  },
  {
    id: "2",
    name: "Counseling Office",
    title: "Student Services",
    department: "Counseling",
    email: "counseling@pausd.org",
  },
  {
    id: "3",
    name: "Library",
    title: "Library Services",
    department: "Library",
    email: "library@pausd.org",
  },
];

const DEPARTMENTS = [
  "All",
  "Administration",
  "English",
  "Math",
  "Science",
  "Social Studies",
  "World Languages",
  "PE",
  "Arts",
  "Counseling",
];

export default function DirectoryScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [isLoading, setIsLoading] = useState(false);

  // Filter staff based on search and department
  const filteredStaff = SAMPLE_STAFF.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      selectedDepartment === "All" || staff.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <ThemedView style={styles.container}>
      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { paddingTop: headerHeight + Spacing.md },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          <Feather
            name="search"
            size={18}
            color={isDark ? "#888" : "#666"}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search staff by name or email..."
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color={isDark ? "#888" : "#666"} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Department Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.departmentFilter}
        contentContainerStyle={styles.departmentFilterContent}
      >
        {DEPARTMENTS.map((dept) => (
          <Pressable
            key={dept}
            onPress={() => setSelectedDepartment(dept)}
            style={[
              styles.departmentChip,
              {
                backgroundColor:
                  selectedDepartment === dept
                    ? theme.link
                    : isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)",
              },
            ]}
          >
            <ThemedText
              style={[
                styles.departmentChipText,
                {
                  color:
                    selectedDepartment === dept
                      ? "#fff"
                      : isDark
                        ? "#999"
                        : "#666",
                },
              ]}
            >
              {dept}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Staff List */}
      <ScrollView
        style={styles.staffList}
        contentContainerStyle={[
          styles.staffListContent,
          { paddingBottom: tabBarHeight + Spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: isDark
                ? "rgba(66, 133, 244, 0.1)"
                : "rgba(66, 133, 244, 0.05)",
              borderColor: isDark
                ? "rgba(66, 133, 244, 0.3)"
                : "rgba(66, 133, 244, 0.2)",
            },
          ]}
        >
          <Feather name="info" size={16} color="#4285F4" />
          <ThemedText style={[styles.infoBannerText, { color: "#4285F4" }]}>
            Staff directory powered by Google Workspace. Sign in with your PAUSD
            account to view all staff.
          </ThemedText>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.link} />
            <ThemedText
              style={[styles.loadingText, { color: isDark ? "#888" : "#666" }]}
            >
              Loading staff directory...
            </ThemedText>
          </View>
        ) : (
          <>
            <ThemedText style={styles.resultCount}>
              {filteredStaff.length} staff members
            </ThemedText>

            {filteredStaff.map((staff) => (
              <Pressable
                key={staff.id}
                style={[
                  styles.staffCard,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                  },
                ]}
              >
                <View style={styles.staffAvatar}>
                  <Feather
                    name="user"
                    size={24}
                    color={isDark ? "#666" : "#999"}
                  />
                </View>
                <View style={styles.staffInfo}>
                  <ThemedText style={styles.staffName}>{staff.name}</ThemedText>
                  <ThemedText
                    style={[
                      styles.staffTitle,
                      { color: isDark ? "#888" : "#666" },
                    ]}
                  >
                    {staff.title}
                  </ThemedText>
                  <View style={styles.staffEmailRow}>
                    <Feather
                      name="mail"
                      size={12}
                      color={theme.link}
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText
                      style={[styles.staffEmail, { color: theme.link }]}
                    >
                      {staff.email}
                    </ThemedText>
                  </View>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={isDark ? "#555" : "#999"}
                />
              </Pressable>
            ))}

            {filteredStaff.length === 0 && (
              <View style={styles.noResults}>
                <Feather
                  name="users"
                  size={32}
                  color={isDark ? "#555" : "#ccc"}
                />
                <ThemedText
                  style={[
                    styles.noResultsText,
                    { color: isDark ? "#666" : "#999" },
                  ]}
                >
                  No staff members found
                </ThemedText>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  departmentFilter: {
    maxHeight: 44,
    marginBottom: Spacing.md,
  },
  departmentFilterContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  departmentChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  departmentChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  staffList: {
    flex: 1,
  },
  staffListContent: {
    paddingHorizontal: Spacing.lg,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  loadingText: {
    fontSize: 14,
    marginTop: Spacing.md,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.md,
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(128,128,128,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
  },
  staffTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  staffEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  staffEmail: {
    fontSize: 12,
  },
  noResults: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  noResultsText: {
    fontSize: 14,
    marginTop: Spacing.md,
  },
});
