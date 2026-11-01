/**
 * Extracts the first image from HTML content
 * Used as a fallback when no featured image is available
 */
export function extractFirstImageFromContent(
  htmlContent: string,
): string | null {
  if (!htmlContent) return null;

  // Try to find the first <img> tag
  const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }

  // Try to find images in WordPress galleries (data-src or similar attributes)
  const dataSrcMatch = htmlContent.match(
    /<img[^>]+data-src=["']([^"']+)["'][^>]*>/i,
  );
  if (dataSrcMatch && dataSrcMatch[1]) {
    return dataSrcMatch[1];
  }

  return null;
}

type FeaturedMediaEmbedded = {
  source_url?: string;
  media_details?: {
    sizes?: Record<
      string,
      {
        source_url?: string;
      }
    >;
  };
};

type ImageCapableArticle = {
  featured_image_src?: string;
  jetpack_featured_media_url?: string;
  link?: string;
  guid?: {
    rendered?: string;
  };
  better_featured_image?: {
    source_url?: string;
  };
  yoast_head?: string;
  yoast_head_json?: {
    og_image?: {
      url?: string;
    }[];
  };
  _embedded?: {
    "wp:featuredmedia"?: FeaturedMediaEmbedded[];
  };
};

function normalizeImageUrl(
  url: string | undefined | null,
  baseUrl?: string,
): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    if (!baseUrl) return undefined;
    try {
      return new URL(trimmed, baseUrl).toString();
    } catch {
      return undefined;
    }
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }

  return trimmed;
}

function extractYoastImageFromHtml(
  yoastHead: string | undefined,
): string | undefined {
  if (!yoastHead) return undefined;

  const match =
    yoastHead.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ) ||
    yoastHead.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    );

  return match?.[1];
}

export function getFeaturedImageUrl(
  article: ImageCapableArticle,
): string | undefined {
  const embeddedMedia = article._embedded?.["wp:featuredmedia"]?.[0];
  const embeddedSizes = embeddedMedia?.media_details?.sizes;
  const baseUrl = article.link || article.guid?.rendered;

  const embeddedSizeUrls = embeddedSizes
    ? [
        embeddedSizes.full?.source_url,
        embeddedSizes.large?.source_url,
        embeddedSizes.medium_large?.source_url,
        embeddedSizes.medium?.source_url,
      ]
    : [];

  const candidates = [
    embeddedMedia?.source_url,
    ...embeddedSizeUrls,
    article.featured_image_src,
    article.jetpack_featured_media_url,
    article.better_featured_image?.source_url,
    article.yoast_head_json?.og_image?.[0]?.url,
    extractYoastImageFromHtml(article.yoast_head),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, baseUrl);
    if (normalized) return normalized;
  }

  return undefined;
}

/**
 * Gets the best available image URL for an article
 * Priority: featured image -> first embedded image -> null
 */
export function getArticleImageUrl(
  featuredImageUrl: string | undefined,
  contentHtml: string | undefined,
  baseUrl?: string,
): string | undefined {
  // First priority: featured image
  const normalizedFeatured = normalizeImageUrl(featuredImageUrl, baseUrl);
  if (normalizedFeatured) {
    return normalizedFeatured;
  }

  // Second priority: first image from content
  if (contentHtml) {
    const embeddedImage = extractFirstImageFromContent(contentHtml);
    if (embeddedImage) {
      return normalizeImageUrl(embeddedImage, baseUrl);
    }
  }

  return undefined;
}
