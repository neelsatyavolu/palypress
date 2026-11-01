import type { ParsedElement } from "./htmlParser";

export const PALY_MAC_BOOSTERS_URL = "https://palymac.org/home/mac-boosters/";

export const SPONSORED_AD = {
  id: "paly-mac-boosters",
  label: "Sponsored",
  title: "Support Paly student media",
  body: "Paly MAC Boosters helps fund journalism, broadcast, and media arts programs.",
  cta: "Visit Paly MAC Boosters",
  url: PALY_MAC_BOOSTERS_URL,
};

export const SPONSORED_FEED_PLACEMENTS = {
  homeFeed: {
    enabled: true,
    interval: 5,
  },
  searchResults: {
    enabled: true,
    interval: 5,
  },
  authorStories: {
    enabled: true,
    interval: 5,
  },
} as const;

export type SponsoredFeedPlacement = keyof typeof SPONSORED_FEED_PLACEMENTS;

export const ARTICLE_AD_PLACEMENT = {
  enabled: true,
  paragraphOffset: 2,
};

// Identifies a publication's SNO Distribution Network in-content ad spot.
// These IDs are stable per-publication and live only in the site's rendered
// HTML (not the WordPress REST API), so they are configured per publication.
export interface SnoAdConfig {
  clientId: string;
  inContentSpotId: string;
  // Paragraphs to place the ad after. When auto-detected from the article page
  // this matches the website; otherwise the shared default is used.
  paragraphOffset?: number;
}

// The real publication ad is inserted deeper into the article than the house
// sponsored card, approximating where SNO places its own in-content ad.
export const PUBLICATION_AD_PLACEMENT = {
  enabled: true,
  paragraphOffset: 4,
};

export interface SponsoredFeedAd {
  type: "sponsored-ad";
  id: string;
  ad: typeof SPONSORED_AD;
}

export type FeedItem<T> = T | SponsoredFeedAd;

export function isSponsoredFeedAd<T>(
  item: FeedItem<T>,
): item is SponsoredFeedAd {
  return Boolean(
    item &&
      typeof item === "object" &&
      "type" in item &&
      item.type === "sponsored-ad",
  );
}

export function getFeedItemsWithSponsoredSlots<T>(
  items: T[],
  placement: SponsoredFeedPlacement = "homeFeed",
): FeedItem<T>[] {
  const placementConfig = SPONSORED_FEED_PLACEMENTS[placement];
  if (!placementConfig.enabled) return items;

  const result: FeedItem<T>[] = [];

  items.forEach((item, index) => {
    result.push(item);

    const storyCount = index + 1;
    const hasMoreStories = storyCount < items.length;
    if (hasMoreStories && storyCount % placementConfig.interval === 0) {
      result.push({
        type: "sponsored-ad",
        id: `${SPONSORED_AD.id}-${placement}-${storyCount}`,
        ad: SPONSORED_AD,
      });
    }
  });

  return result;
}

export function getArticleContentWithAdSlots(
  elements: ParsedElement[],
  snoAds?: SnoAdConfig,
): ParsedElement[] {
  const wantHouseAd = ARTICLE_AD_PLACEMENT.enabled;
  const wantPublicationAd = PUBLICATION_AD_PLACEMENT.enabled && Boolean(snoAds);
  if (!wantHouseAd && !wantPublicationAd) return elements;

  const publicationAdOffset =
    snoAds?.paragraphOffset ?? PUBLICATION_AD_PLACEMENT.paragraphOffset;

  let paragraphCount = 0;
  let insertedHouseAd = false;
  let insertedPublicationAd = false;
  const result: ParsedElement[] = [];

  for (const element of elements) {
    result.push(element);

    if (element.type !== "paragraph") continue;
    paragraphCount += 1;

    if (
      wantHouseAd &&
      !insertedHouseAd &&
      paragraphCount === ARTICLE_AD_PLACEMENT.paragraphOffset
    ) {
      result.push({ type: "advertisement" });
      insertedHouseAd = true;
    }

    if (
      wantPublicationAd &&
      !insertedPublicationAd &&
      paragraphCount === publicationAdOffset
    ) {
      result.push({
        type: "publicationAd",
        spotId: snoAds!.inContentSpotId,
        clientId: snoAds!.clientId,
      });
      insertedPublicationAd = true;
    }
  }

  return insertedHouseAd || insertedPublicationAd ? result : elements;
}
