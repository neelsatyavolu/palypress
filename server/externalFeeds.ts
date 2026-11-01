export type ExternalProvider = "soundcloud" | "issuu";
export type ExternalSourceType = "podcast" | "issue" | "article";

export interface ExternalArticle {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  link: string;
  publicationId: string;
  publicationName: string;
  publicationColor: string;
  externalProvider: ExternalProvider;
  sourceType: ExternalSourceType;
  _embedded?: {
    "wp:featuredmedia"?: { source_url: string }[];
    "wp:term"?: {
      id: number;
      name: string;
      slug: string;
      taxonomy: string;
    }[][];
  };
}

interface LinkPreview {
  title: string;
  url: string;
}

interface ExternalFeedConfig {
  id: string;
  name: string;
  color: string;
  provider: ExternalProvider;
  sourceType: ExternalSourceType;
  sourceUrl: string;
}

export interface ExternalFeedPublicationConfig {
  id: string;
  name: string;
  domain: string;
  primaryColor: string;
}

const EXTERNAL_FEEDS: Record<string, ExternalFeedConfig> = {
  kply: {
    id: "kply",
    name: "KPLY",
    color: "#FF5500",
    provider: "soundcloud",
    sourceType: "podcast",
    sourceUrl: "https://soundcloud.com/palyradio",
  },
  proof: {
    id: "proof",
    name: "[proof]",
    color: "#111827",
    provider: "issuu",
    sourceType: "issue",
    sourceUrl: "https://issuu.com/proofpaly",
  },
  viaverde: {
    id: "viaverde",
    name: "Via Verde",
    color: "#3A7D44",
    provider: "issuu",
    sourceType: "issue",
    sourceUrl: "https://issuu.com/viaverdemag",
  },
};

export function getExternalFeedPublicationConfigs(): ExternalFeedPublicationConfig[] {
  return Object.values(EXTERNAL_FEEDS).map((config) => ({
    id: config.id,
    name: config.name,
    domain: new URL(config.sourceUrl).host,
    primaryColor: config.color,
  }));
}

const EXCLUDED_SOUNDCLOUD_PATHS = new Set([
  "likes",
  "sets",
  "tracks",
  "comments",
  "popular-tracks",
  "albums",
]);

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "));
}

function getAttribute(tag: string, name: string): string | undefined {
  const pattern = new RegExp(`${name}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1];
}

function getMetaContent(html: string, keys: string[]): string | undefined {
  const normalizedKeys = keys.map((key) => key.toLowerCase());
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = (
      getAttribute(tag, "property") ||
      getAttribute(tag, "name") ||
      ""
    ).toLowerCase();
    if (normalizedKeys.includes(key)) {
      const content = getAttribute(tag, "content");
      if (content) return decodeHtmlEntities(content);
    }
  }
  return undefined;
}

function stableNumericId(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function inferDateFromText(value: string): string {
  const match = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/);
  if (!match) return new Date(0).toISOString();

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const rawYear = parseInt(match[3], 10);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;

  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function makeExternalArticle({
  publicationId,
  publicationName,
  publicationColor,
  provider,
  sourceType,
  title,
  excerpt,
  date,
  link,
  imageUrl,
}: {
  publicationId: string;
  publicationName: string;
  publicationColor: string;
  provider: ExternalProvider;
  sourceType: ExternalSourceType;
  title: string;
  excerpt: string;
  date: string;
  link: string;
  imageUrl?: string;
}): ExternalArticle {
  return {
    id: stableNumericId(`${publicationId}:${link}`),
    title: { rendered: title },
    excerpt: { rendered: excerpt },
    content: { rendered: `<p>${excerpt}</p>` },
    date,
    link,
    publicationId,
    publicationName,
    publicationColor,
    externalProvider: provider,
    sourceType,
    _embedded: {
      ...(imageUrl
        ? { "wp:featuredmedia": [{ source_url: imageUrl }] }
        : undefined),
      "wp:term": [
        [
          {
            id: stableNumericId(`${publicationId}:${sourceType}`),
            name: sourceType === "podcast" ? "Podcast" : "Issue",
            slug: sourceType,
            taxonomy: "category",
          },
        ],
      ],
    },
  };
}

export function parseSoundCloudProfileHtml(
  html: string,
  profileUrl: string,
): LinkPreview[] {
  const profile = new URL(profileUrl);
  const username = profile.pathname.split("/").filter(Boolean)[0];
  const links: LinkPreview[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const href = decodeHtmlEntities(match[1]);
    const title = stripHtml(match[2]);
    if (!href.startsWith(`/${username}/`) || !title) continue;

    const slug = href.split("/").filter(Boolean)[1];
    if (!slug || EXCLUDED_SOUNDCLOUD_PATHS.has(slug)) continue;

    const url = new URL(href, profile.origin).toString();
    if (seen.has(url)) continue;

    seen.add(url);
    links.push({ title, url });
  }

  return links;
}

export function parseSoundCloudTrackHtml(
  html: string,
  publicationId: string,
  publicationName: string,
  publicationColor: string,
): ExternalArticle {
  const title = getMetaContent(html, ["title", "og:title"]) || "KPLY episode";
  const excerpt =
    getMetaContent(html, ["description", "og:description"]) ||
    "Listen to this KPLY Paly Radio episode on SoundCloud.";
  const link =
    getMetaContent(html, ["url", "og:url"]) ||
    "https://soundcloud.com/palyradio";
  const imageUrl = getMetaContent(html, ["image", "og:image"]);

  return makeExternalArticle({
    publicationId,
    publicationName,
    publicationColor,
    provider: "soundcloud",
    sourceType: "podcast",
    title,
    excerpt,
    date: inferDateFromText(title),
    link,
    imageUrl,
  });
}

export function parseIssuuProfileHtml(
  html: string,
  profileUrl: string,
): LinkPreview[] {
  const profile = new URL(profileUrl);
  const username = profile.pathname.split("/").filter(Boolean)[0];
  const links: LinkPreview[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const href = decodeHtmlEntities(match[1]);
    if (!href.includes(`/${username}/docs/`)) continue;

    const url = new URL(href, profile.origin).toString();
    if (seen.has(url)) continue;

    seen.add(url);
    links.push({ title: stripHtml(match[2]), url });
  }

  return links;
}

export function parseIssuuIssueHtml(
  html: string,
  publicationId: string,
  publicationName: string,
  publicationColor: string,
): ExternalArticle {
  const title =
    getMetaContent(html, ["og:title", "twitter:title", "title"]) ||
    `${publicationName} issue`;
  const link =
    getMetaContent(html, ["og:url", "twitter:url", "url"]) ||
    "https://issuu.com";
  const imageUrl = getMetaContent(html, ["og:image", "twitter:image", "image"]);
  const date =
    html.match(/datePublished["']?\s*[:=]\s*["']([^"']+)/i)?.[1] ||
    new Date(0).toISOString();

  return makeExternalArticle({
    publicationId,
    publicationName,
    publicationColor,
    provider: "issuu",
    sourceType: "issue",
    title,
    excerpt: `Read ${title} on Issuu.`,
    date: new Date(date).toISOString(),
    link,
    imageUrl,
  });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "PalyJournalismApp/1.0 (+https://palymac.org/incubator/)",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function fetchSoundCloudArticles(
  config: ExternalFeedConfig,
): Promise<ExternalArticle[]> {
  const profileHtml = await fetchText(config.sourceUrl);
  const links = parseSoundCloudProfileHtml(profileHtml, config.sourceUrl).slice(
    0,
    12,
  );
  const results = await Promise.allSettled(
    links.map(async (link) =>
      parseSoundCloudTrackHtml(
        await fetchText(link.url),
        config.id,
        config.name,
        config.color,
      ),
    ),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<ExternalArticle> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);
}

async function fetchIssuuArticles(
  config: ExternalFeedConfig,
): Promise<ExternalArticle[]> {
  const profileHtml = await fetchText(config.sourceUrl);
  const links = parseIssuuProfileHtml(profileHtml, config.sourceUrl).slice(
    0,
    12,
  );
  const results = await Promise.allSettled(
    links.map(async (link) =>
      parseIssuuIssueHtml(
        await fetchText(link.url),
        config.id,
        config.name,
        config.color,
      ),
    ),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<ExternalArticle> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);
}

export function isExternalPublicationId(publicationId: string): boolean {
  return publicationId in EXTERNAL_FEEDS;
}

export async function getExternalFeedArticles(
  publicationId: string,
): Promise<ExternalArticle[]> {
  const config = EXTERNAL_FEEDS[publicationId];
  if (!config) return [];

  if (config.provider === "soundcloud") {
    return fetchSoundCloudArticles(config);
  }
  if (config.provider === "issuu") {
    return fetchIssuuArticles(config);
  }
  return [];
}
