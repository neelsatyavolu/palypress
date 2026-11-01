import React, { useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { CAMPUS_FEATURES } from "@/assets/campus-buildings";
import CampusMap, { CampusMapHandle } from "@/components/CampusMap";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useCampusLocation } from "@/hooks/useCampusLocation";
import { useTheme } from "@/hooks/useTheme";
import { CAMPUS_AREAS, CampusArea } from "@/lib/campusAreas";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const mapRef = useRef<CampusMapHandle>(null);
  const location = useCampusLocation();

  const overlayBackground = isDark
    ? "rgba(30,30,30,0.92)"
    : "rgba(255,255,255,0.92)";

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length === 0) return [];
    return CAMPUS_AREAS.filter(
      (area) =>
        area.name.toLowerCase().includes(q) ||
        area.rooms.some((room) => room.toLowerCase().includes(q)) ||
        area.description.toLowerCase().includes(q),
    ).slice(0, 4);
  }, [searchQuery]);

  const selectedArea: CampusArea | null =
    CAMPUS_AREAS.find((a) => a.id === selectedAreaId) ?? null;

  const selectArea = (id: string | null) => {
    setSelectedAreaId(id);
    if (id === null) return;
    const feature = CAMPUS_FEATURES.find((f) => f.id === id);
    if (feature) {
      mapRef.current?.centerOn(feature.centroid[0], feature.centroid[1]);
    }
  };

  const onPickSearchResult = (area: CampusArea) => {
    setSearchQuery("");
    selectArea(area.id);
  };

  const onLocatePress = () => {
    if (location.status === "on-campus" && location.point) {
      mapRef.current?.centerOn(location.point.x, location.point.y);
    }
  };

  const statusPill = (() => {
    switch (location.status) {
      case "denied":
        return { text: "Location off — tap to enable", openSettings: true };
      case "off-campus":
        return { text: "You're not on campus", openSettings: false };
      case "unavailable":
        return { text: "Location unavailable", openSettings: false };
      default:
        return null;
    }
  })();

  return (
    <ThemedView style={styles.container}>
      <CampusMap
        ref={mapRef}
        selectedAreaId={selectedAreaId}
        onSelectArea={selectArea}
        location={location}
      />

      {/* Search overlay */}
      <View
        style={[
          styles.searchContainer,
          { paddingTop: headerHeight + Spacing.md },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[styles.searchBar, { backgroundColor: overlayBackground }]}
        >
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Find a building or room…"
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        {matches.map((area) => (
          <Pressable
            key={area.id}
            onPress={() => onPickSearchResult(area)}
            style={[
              styles.searchResult,
              { backgroundColor: overlayBackground },
            ]}
          >
            <ThemedText style={styles.resultTitle}>{area.name}</ThemedText>
            <ThemedText
              style={{ color: theme.textSecondary }}
              numberOfLines={1}
            >
              {area.description}
            </ThemedText>
          </Pressable>
        ))}
        {statusPill ? (
          <Pressable
            onPress={statusPill.openSettings ? Linking.openSettings : undefined}
            style={[styles.statusPill, { backgroundColor: overlayBackground }]}
          >
            <Feather name="navigation" size={14} color={theme.textSecondary} />
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
              {statusPill.text}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {/* Locate-me button */}
      <Pressable
        onPress={onLocatePress}
        disabled={location.status !== "on-campus"}
        style={[
          styles.locateButton,
          {
            bottom: insets.bottom + (selectedArea ? 190 : Spacing.xl),
            backgroundColor: isDark
              ? "rgba(30,30,30,0.95)"
              : "rgba(255,255,255,0.95)",
            opacity: location.status === "on-campus" ? 1 : 0.4,
          },
        ]}
      >
        <Feather
          name="crosshair"
          size={22}
          color={
            location.status === "on-campus" ? theme.link : theme.textSecondary
          }
        />
      </Pressable>

      {/* Building detail card */}
      {selectedArea ? (
        <View
          style={[
            styles.detailCard,
            {
              paddingBottom: insets.bottom + Spacing.lg,
              backgroundColor: isDark
                ? "rgba(30,30,30,0.97)"
                : "rgba(255,255,255,0.97)",
            },
          ]}
        >
          <View style={styles.detailHeader}>
            <ThemedText type="h4">{selectedArea.name}</ThemedText>
            <Pressable onPress={() => setSelectedAreaId(null)} hitSlop={8}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <ThemedText style={{ color: theme.textSecondary }}>
            {selectedArea.description}
          </ThemedText>
          {selectedArea.rooms.length > 0 ? (
            <View style={styles.roomsRow}>
              {selectedArea.rooms.map((room) => (
                <View
                  key={room}
                  style={[
                    styles.roomChip,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <ThemedText style={{ fontSize: 13 }}>{room}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  searchResult: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  resultTitle: {
    fontWeight: "600",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
  },
  locateButton: {
    position: "absolute",
    right: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  roomChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
});
