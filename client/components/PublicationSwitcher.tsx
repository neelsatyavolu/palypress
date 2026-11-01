import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { useFollows } from "@/contexts/FollowsContext";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Publication, HOME_PUBLICATION } from "@/constants/publications";
import { trackPublicationSelected } from "@/lib/analytics";

const appIconSource = require("../../assets/images/icon.png");

interface PublicationSwitcherProps {
  showLabel?: boolean;
}

export function PublicationSwitcher({
  showLabel = true,
}: PublicationSwitcherProps) {
  const { theme, isDark } = useTheme();
  const { publication, setPublication, publications } = usePublication();
  const { isFollowing, followPublication, unfollowPublication } = useFollows();
  const [showPicker, setShowPicker] = useState(false);

  const isHome = publication.id === "home";

  // Grouped like the design: WordPress publications vs. other sources.
  const feedPublications = publications.filter((pub) => pub.apiBaseUrl);
  const moreSources = publications.filter((pub) => !pub.apiBaseUrl);

  const handleSelect = (selected: Publication) => {
    if (selected.id !== publication.id) {
      trackPublicationSelected({
        fromPublicationId: publication.id,
        fromPublicationName: publication.name,
        toPublicationId: selected.id,
        toPublicationName: selected.name,
      });
    }
    setPublication(selected);
    setShowPicker(false);
  };

  const renderTile = (pub: Publication) => {
    const selected = publication.id === pub.id;
    const isHomeTile = pub.id === HOME_PUBLICATION.id;
    const following = !isHomeTile && isFollowing(pub.id);
    return (
      <Pressable
        key={pub.id}
        style={[styles.gridTile, { backgroundColor: pub.primaryColor }]}
        onPress={() => handleSelect(pub)}
      >
        {selected && (
          <View
            pointerEvents="none"
            style={[styles.selectionRing, { borderColor: theme.text }]}
          />
        )}
        {!isHomeTile && (
          <Pressable
            style={styles.followButton}
            onPress={(e) => {
              e.stopPropagation();
              if (following) {
                unfollowPublication(pub.id);
              } else {
                followPublication(pub.id);
              }
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={
              following ? `Unfollow ${pub.name}` : `Follow ${pub.name}`
            }
            accessibilityState={{ selected: following }}
          >
            <Feather
              name={following ? "check" : "plus"}
              size={12}
              color="#FFFFFF"
            />
          </Pressable>
        )}
        {pub.domain ? (
          <Pressable
            style={styles.popoutButton}
            onPress={(e) => {
              e.stopPropagation();
              Linking.openURL(`https://${pub.domain}`);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Open ${pub.name} website`}
          >
            <Feather name="external-link" size={11} color="#FFFFFF" />
          </Pressable>
        ) : null}
        <View style={styles.tileLogoChip}>
          <Image
            source={{ uri: pub.logoUrl }}
            style={styles.tileLogo}
            contentFit="contain"
            transition={200}
          />
        </View>
        <ThemedText style={styles.tileName} numberOfLines={1}>
          {pub.shortName}
        </ThemedText>
        {selected && (
          <View style={styles.tileCheck}>
            <Feather name="check" size={11} color={pub.primaryColor} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setShowPicker(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View
          style={[
            styles.logoContainer,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          {isHome ? (
            <Image
              source={appIconSource}
              style={styles.triggerAppIcon}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Image
              source={{ uri: publication.logoUrl }}
              style={styles.triggerLogo}
              contentFit="contain"
              transition={200}
            />
          )}
        </View>
        {showLabel && (
          <ThemedText style={styles.label} numberOfLines={1}>
            {isHome ? "All PALY Publications" : publication.shortName}
          </ThemedText>
        )}
        <Feather name="chevron-down" size={16} color={theme.text} />
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPicker(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundRoot },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Switch publication
              </ThemedText>
              <Pressable
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() => setShowPicker(false)}
                hitSlop={8}
              >
                <Feather name="x" size={17} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.listContent}
              automaticallyAdjustContentInsets={false}
              automaticallyAdjustsScrollIndicatorInsets={false}
              contentInsetAdjustmentBehavior="never"
              contentInset={{ top: 0, right: 0, bottom: 0, left: 0 }}
              scrollIndicatorInsets={{ top: 0, right: 0, bottom: 0, left: 0 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Home — featured neutral tile */}
              <Pressable
                style={[
                  styles.homeTile,
                  { backgroundColor: theme.backgroundDefault },
                ]}
                onPress={() => handleSelect(HOME_PUBLICATION)}
              >
                <View style={styles.homeIconChip}>
                  <Image
                    source={appIconSource}
                    style={styles.homeIconImage}
                    contentFit="contain"
                  />
                </View>
                <ThemedText style={styles.homeName}>
                  All PALY Publications
                </ThemedText>
                <ThemedText
                  style={[styles.homeSub, { color: theme.textSecondary }]}
                >
                  Every publication, one feed
                </ThemedText>
                {isHome && (
                  <View
                    style={[styles.homeCheck, { backgroundColor: theme.link }]}
                  >
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>

              <ThemedText
                style={[styles.sectionLabel, { color: theme.textTertiary }]}
              >
                Publications
              </ThemedText>
              <View style={styles.grid}>
                {feedPublications.map(renderTile)}
              </View>

              {moreSources.length > 0 && (
                <>
                  <ThemedText
                    style={[styles.sectionLabel, { color: theme.textTertiary }]}
                  >
                    More sources
                  </ThemedText>
                  <View style={styles.grid}>{moreSources.map(renderTile)}</View>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  logoContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: Spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  triggerLogo: {
    width: 24,
    height: 24,
  },
  triggerAppIcon: {
    width: 28,
    height: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginRight: Spacing.xs,
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
    maxHeight: "82%",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 16,
  },
  modalHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  closeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  homeTile: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 14,
    marginBottom: 6,
    gap: 3,
  },
  homeIconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
    overflow: "hidden",
  },
  homeIconImage: {
    width: 34,
    height: 34,
  },
  homeName: {
    fontSize: 15,
    fontWeight: "600",
  },
  homeSub: {
    fontSize: 12,
  },
  homeCheck: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    textAlign: "center",
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  gridTile: {
    width: 96,
    height: 68,
    borderRadius: 14,
    padding: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  selectionRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 18,
    borderWidth: 2,
  },
  tileLogoChip: {
    width: 26,
    height: 26,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  tileLogo: {
    width: 18,
    height: 18,
  },
  tileName: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  tileCheck: {
    position: "absolute",
    bottom: 7,
    right: 7,
    width: 17,
    height: 17,
    borderRadius: BorderRadius.full,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  followButton: {
    position: "absolute",
    top: 7,
    left: 7,
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.28)",
    justifyContent: "center",
    alignItems: "center",
  },
  popoutButton: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.28)",
    justifyContent: "center",
    alignItems: "center",
  },
});
