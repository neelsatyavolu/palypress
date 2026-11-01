import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

// SNO Distribution Network ad-serving endpoint. Calling it counts as the
// impression, exactly as the publication's own website does client-side.
const serveUrl = (spotId: string) =>
  `https://snoads.com/api/v1/adspot/${spotId}/serve`;

// SNO's house-fill creatives, shown when a spot has no paid ad (the same
// images the website falls back to). 300x250 medium rectangle.
const HOUSE_FILL_IMAGES = [
  "https://snoadfills.s3.us-west-2.amazonaws.com/fill-300x250-v1.png",
  "https://snoadfills.s3.us-west-2.amazonaws.com/fill-300x250-v2.png",
];

const AD_WIDTH = 300;
const AD_ASPECT_RATIO = AD_WIDTH / 250;

interface ServedAd {
  id?: number;
  image: string;
  link?: string;
}

// Records a click for the served ad, exactly as the publication's own site
// does (a fire-and-forget beacon), so advertiser click attribution is kept.
const trackClickUrl = (adId: number) =>
  `https://snoads.com/api/v1/ad/${adId}/click`;

interface PublicationAdSlotProps {
  spotId: string;
}

export function PublicationAdSlot({ spotId }: PublicationAdSlotProps) {
  const { theme, isDark } = useTheme();
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;

    const houseFill = (): ServedAd => ({
      image:
        HOUSE_FILL_IMAGES[Math.floor(Math.random() * HOUSE_FILL_IMAGES.length)],
    });

    (async () => {
      try {
        const response = await fetch(serveUrl(spotId), {
          headers: { Accept: "application/json" },
        });
        const data = response.ok ? await response.json() : null;
        if (!active) return;
        if (data && data.image && data.link) {
          setAd({ id: data.id, image: data.image, link: data.link });
        } else {
          setAd(houseFill());
        }
      } catch {
        if (active) setAd(houseFill());
      }
    })();

    return () => {
      active = false;
    };
  }, [spotId]);

  const handlePress = () => {
    if (!ad?.link) return;
    // Track the click before navigating, mirroring the publication's site.
    if (ad.id != null) {
      fetch(trackClickUrl(ad.id), { method: "POST" }).catch(() => {});
    }
    Linking.openURL(ad.link);
  };

  // A broken creative should leave no empty box behind.
  if (hidden) return null;

  const labelColor = isDark ? "rgba(255, 255, 255, 0.5)" : "#9E9E9E";
  const backgroundColor = isDark ? "#242424" : "#F6F9FC";

  const creative = ad ? (
    <Image
      source={{ uri: ad.image }}
      style={styles.creative}
      contentFit="contain"
      transition={200}
      onError={() => setHidden(true)}
      accessibilityLabel="Advertisement"
    />
  ) : (
    <ActivityIndicator color={theme.text} />
  );

  return (
    <View style={[styles.slot, { backgroundColor }]}>
      <ThemedText style={[styles.label, { color: labelColor }]}>
        ADVERTISEMENT
      </ThemedText>
      {ad?.link ? (
        <Pressable
          accessibilityRole="link"
          onPress={handlePress}
          style={styles.creativeWrap}
        >
          {creative}
        </Pressable>
      ) : (
        <View style={styles.creativeWrap}>{creative}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: "center",
    borderRadius: BorderRadius.xs,
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  creativeWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    width: "100%",
  },
  creative: {
    aspectRatio: AD_ASPECT_RATIO,
    maxWidth: AD_WIDTH,
    width: "100%",
  },
});
