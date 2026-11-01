import React, { useEffect, useState } from "react";
import {
  SectionList,
  View,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { stripHtmlTags } from "@/lib/htmlUtils";
import {
  StaffWithPublication,
  StaffCardWithBadge,
} from "@/components/StaffCardWithBadge";
import { StaffTier, getUnifiedRoleRank } from "@/lib/staffRoleHierarchy";
import { StaffYearTerm, selectStaffYearTerm } from "@/lib/staffYearSelection";
import { StaffProfile, HomeStackParamList } from "@/types/article";
import {
  Publication,
  PUBLICATIONS,
  WORDPRESS_PUBLICATIONS,
} from "@/constants/publications";
import { APP_TEAM, APP_TEAM_SECTION_TITLE } from "@/constants/appTeam";

type AllStaffNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  "AllStaff"
>;

// A staff row carries a section-scoped key so the same person can appear in
// both the pinned developers section and their position group without React
// key collisions.
interface StaffListItem extends StaffWithPublication {
  rowKey: string;
}

interface SectionData {
  title: string;
  key: string;
  data: StaffListItem[];
}

// Position groups, top to bottom. Titles chosen for the Paly Press directory.
const TIER_SECTIONS: { tier: StaffTier; title: string; key: string }[] = [
  { tier: StaffTier.TIER_1_LEADERSHIP, title: "Leadership", key: "tier-1" },
  { tier: StaffTier.TIER_2_SENIOR, title: "Senior Staff", key: "tier-2" },
  {
    tier: StaffTier.TIER_3_EDITORS,
    title: "Editors & Managers",
    key: "tier-3",
  },
  { tier: StaffTier.TIER_4_CONTRIBUTORS, title: "Staff", key: "tier-4" },
  {
    tier: StaffTier.TIER_5_ADVISERS,
    title: "Journalism Advisors",
    key: "tier-5",
  },
];

// Configured publication order, used to keep each publication's members
// adjacent within a position group.
const PUBLICATION_ORDER = new Map(
  WORDPRESS_PUBLICATIONS.map((pub, index) => [pub.id, index] as const),
);

function toStaffWithPublication(
  staff: StaffProfile,
  pub: Publication,
  roleOverride?: string,
): StaffWithPublication {
  return {
    ...staff,
    excerpt: roleOverride ? { rendered: roleOverride } : staff.excerpt,
    publicationId: pub.id,
    publicationName: pub.shortName,
    publicationColor: pub.primaryColor,
  };
}

// Within a position group, keep each publication's members together (in
// configured order), alphabetical by name inside a publication.
function sortByPublicationThenName(
  members: StaffWithPublication[],
): StaffWithPublication[] {
  return [...members].sort((a, b) => {
    const orderA =
      PUBLICATION_ORDER.get(a.publicationId) ?? Number.MAX_SAFE_INTEGER;
    const orderB =
      PUBLICATION_ORDER.get(b.publicationId) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return stripHtmlTags(a.title.rendered).localeCompare(
      stripHtmlTags(b.title.rendered),
    );
  });
}

// Attach a section-scoped row key to each member.
function toSection(
  title: string,
  key: string,
  members: StaffWithPublication[],
): SectionData {
  return {
    title,
    key,
    data: members.map((member) => ({
      ...member,
      rowKey: `${key}-${member.publicationId}-${member.id}`,
    })),
  };
}

async function fetchAppTeam(): Promise<StaffWithPublication[]> {
  const results = await Promise.all(
    APP_TEAM.map(async (ref) => {
      const pub = PUBLICATIONS.find((p) => p.id === ref.publicationId);
      if (!pub || !pub.apiBaseUrl) return null;
      try {
        const res = await fetch(
          `${pub.apiBaseUrl}/staff_profile/${ref.profileId}?_embed`,
        );
        if (!res.ok) return null;
        const staff: StaffProfile = await res.json();
        return toStaffWithPublication(staff, pub, ref.role);
      } catch {
        return null;
      }
    }),
  );

  return results.filter((m): m is StaffWithPublication => m !== null);
}

async function fetchPublicationMembers(
  pub: Publication,
): Promise<StaffWithPublication[]> {
  try {
    const yearsRes = await fetch(
      `${pub.apiBaseUrl}/staff_year?per_page=100&orderby=id&order=desc`,
    );
    if (!yearsRes.ok) return [];

    const terms: StaffYearTerm[] = await yearsRes.json();
    const yearId = selectStaffYearTerm(terms, new Date());
    if (yearId === null) return [];

    const res = await fetch(
      `${pub.apiBaseUrl}/staff_profile?_embed&per_page=100&staff_year=${yearId}`,
    );
    if (!res.ok) return [];

    const data: StaffProfile[] = await res.json();
    const seen = new Set<number>();
    const members: StaffWithPublication[] = [];

    for (const staff of data) {
      if (seen.has(staff.id)) continue;
      seen.add(staff.id);
      members.push(toStaffWithPublication(staff, pub));
    }

    return members;
  } catch {
    return [];
  }
}

export default function AllStaffScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<AllStaffNavigationProp>();

  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spinnerColor = isDark ? "#999999" : "#666666";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#4A4A4A";

  const fetchAllStaff = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Pinned developers section — the app team also appears in their
      // position groups below, so they are not removed from their publications.
      const appTeam = await fetchAppTeam();

      // Current roster of every publication, then regrouped by position.
      const pubResults = await Promise.all(
        WORDPRESS_PUBLICATIONS.map((pub) => fetchPublicationMembers(pub)),
      );

      // Advisers (and anyone else) carry a separate profile per publication.
      // Collapse to one card per person, keeping the first publication seen.
      const allMembers: StaffWithPublication[] = [];
      const seenNames = new Set<string>();
      for (const member of pubResults.flat()) {
        const nameKey = stripHtmlTags(member.title.rendered)
          .trim()
          .toLowerCase();
        if (seenNames.has(nameKey)) continue;
        seenNames.add(nameKey);
        allMembers.push(member);
      }

      const byTier = new Map<StaffTier, StaffWithPublication[]>();
      for (const member of allMembers) {
        const tier = getUnifiedRoleRank(stripHtmlTags(member.excerpt.rendered));
        const bucket = byTier.get(tier) ?? [];
        bucket.push(member);
        byTier.set(tier, bucket);
      }

      const nextSections: SectionData[] = [];
      if (appTeam.length > 0) {
        nextSections.push(
          toSection(APP_TEAM_SECTION_TITLE, "app-team", appTeam),
        );
      }
      for (const { tier, title, key } of TIER_SECTIONS) {
        const members = byTier.get(tier);
        if (!members || members.length === 0) continue;
        nextSections.push(
          toSection(title, key, sortByPublicationThenName(members)),
        );
      }

      setSections(nextSections);
    } catch (err) {
      setError("Unable to load staff. Pull to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllStaff();
  }, []);

  const handleRefresh = () => {
    fetchAllStaff(true);
  };

  const handleStaffPress = (staff: StaffWithPublication) => {
    navigation.navigate("StaffDetail", {
      staff: staff,
      publicationId: staff.publicationId,
    });
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View
      style={[styles.sectionHeader, { backgroundColor: theme.backgroundRoot }]}
    >
      <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
    </View>
  );

  const renderItem = ({ item }: { item: StaffListItem }) => (
    <StaffCardWithBadge staff={item} onPress={() => handleStaffPress(item)} />
  );

  const renderEmptyComponent = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
          {error || "No staff found."}
        </ThemedText>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={spinnerColor} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SectionList
        sections={sections}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        keyExtractor={(item) => item.rowKey}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={spinnerColor}
            colors={[spinnerColor]}
          />
        }
        stickySectionHeadersEnabled={true}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});
